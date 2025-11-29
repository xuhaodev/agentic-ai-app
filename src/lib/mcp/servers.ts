/**
 * MCP 服务器配置
 * 
 * 定义可用的 MCP 服务器列表
 */

import { MCPServerConfig } from './types';

/**
 * 预配置的 MCP 服务器列表
 */
export const MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'microsoft-learn',
    name: 'Microsoft Learn',
    description: 'Microsoft 官方文档和代码示例搜索',
    endpoint: 'https://learn.microsoft.com/api/mcp',
    icon: 'M',
    enabled: false,
    auth: {
      type: 'none',
    },
  },
  // 可以在这里添加更多 MCP 服务器
];

/**
 * 获取所有 MCP 服务器配置
 */
export function getMCPServers(): MCPServerConfig[] {
  return MCP_SERVERS;
}

/**
 * 根据 ID 获取 MCP 服务器配置
 */
export function getMCPServerById(id: string): MCPServerConfig | undefined {
  return MCP_SERVERS.find(server => server.id === id);
}

/**
 * 获取默认启用的 MCP 服务器
 */
export function getDefaultEnabledServers(): MCPServerConfig[] {
  return MCP_SERVERS.filter(server => server.enabled);
}
