/**
 * MCP 服务器连接 API
 * 
 * 处理与 MCP 服务器的连接请求，获取工具列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPServerById } from '@/lib/mcp/servers';
import { MCPClient } from '@/lib/mcp/client';
import { ARXIV_TOOLS } from '@/lib/mcp/arxiv-client';

// 服务器端的 MCP 客户端缓存
const clientCache = new Map<string, MCPClient>();

export async function POST(req: NextRequest) {
  try {
    const { serverId } = await req.json();

    if (!serverId) {
      return NextResponse.json(
        { error: 'Missing serverId parameter' },
        { status: 400 }
      );
    }

    // 获取服务器配置
    const serverConfig = getMCPServerById(serverId);
    if (!serverConfig) {
      return NextResponse.json(
        { error: `Server not found: ${serverId}` },
        { status: 404 }
      );
    }

    // 处理本地 arXiv 服务器
    if (serverId === 'arxiv') {
      return NextResponse.json({
        serverId,
        serverName: serverConfig.name,
        connected: true,
        tools: ARXIV_TOOLS,
      });
    }

    // 检查缓存中是否有已连接的客户端
    let client = clientCache.get(serverId);
    
    if (!client || !client.isInitialized()) {
      // 创建新客户端并初始化
      client = new MCPClient(serverConfig);
      
      try {
        await client.initialize();
        clientCache.set(serverId, client);
      } catch (initError) {
        console.error(`Failed to initialize MCP client for ${serverId}:`, initError);
        
        // 返回友好的错误信息
        const errorMessage = initError instanceof Error 
          ? initError.message 
          : 'Failed to connect to MCP server';
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 502 }
        );
      }
    }

    // 返回工具列表
    const tools = client.getTools();
    
    return NextResponse.json({
      serverId,
      serverName: serverConfig.name,
      connected: true,
      tools,
    });

  } catch (error) {
    console.error('MCP connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
