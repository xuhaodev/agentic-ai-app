/**
 * MCP 服务器列表 API
 * 
 * 获取所有可用的 MCP 服务器配置
 */

import { NextResponse } from 'next/server';
import { getMCPServers } from '@/lib/mcp/servers';

export async function GET() {
  try {
    const servers = getMCPServers();
    
    return NextResponse.json({
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        description: server.description,
        endpoint: server.endpoint,
        icon: server.icon,
        enabled: server.enabled,
      })),
    });

  } catch (error) {
    console.error('MCP servers list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
