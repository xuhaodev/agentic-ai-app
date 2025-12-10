/**
 * MCP 工具调用 API
 * 
 * 处理 MCP 工具的执行请求
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPServerById } from '@/lib/mcp/servers';
import { MCPClient, mcpResultToText } from '@/lib/mcp/client';
import { callArxivTool } from '@/lib/mcp/arxiv-client';

// 导入连接路由中的客户端缓存访问函数
// 注意：由于 Next.js 的模块隔离，我们需要维护自己的缓存或重新连接
const clientCache = new Map<string, MCPClient>();

async function getOrCreateClient(serverId: string): Promise<MCPClient> {
  let client = clientCache.get(serverId);
  
  if (client && client.isInitialized()) {
    return client;
  }
  
  const serverConfig = getMCPServerById(serverId);
  if (!serverConfig) {
    throw new Error(`Server not found: ${serverId}`);
  }
  
  client = new MCPClient(serverConfig);
  await client.initialize();
  clientCache.set(serverId, client);
  
  return client;
}

export async function POST(req: NextRequest) {
  try {
    const { serverId, toolName, arguments: args } = await req.json();

    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: 'Missing serverId or toolName parameter' },
        { status: 400 }
      );
    }

    // 处理本地 arXiv 工具调用
    if (serverId === 'arxiv') {
      const result = await callArxivTool(toolName, args || {});
      
      return NextResponse.json({
        serverId,
        toolName,
        result,
        text: result.content?.map(c => c.text).filter(Boolean).join('\n\n') || '',
        isError: result.isError || false,
      });
    }

    // 获取或创建客户端
    const client = await getOrCreateClient(serverId);

    // 调用工具
    const result = await client.callTool({
      name: toolName,
      arguments: args || {},
    });

    // 返回结果
    return NextResponse.json({
      serverId,
      toolName,
      result,
      // 同时返回文本格式的结果，方便直接使用
      text: mcpResultToText(result),
      isError: result.isError || false,
    });

  } catch (error) {
    console.error('MCP tool call error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        isError: true,
      },
      { status: 500 }
    );
  }
}
