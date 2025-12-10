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
    id: 'arxiv',
    name: 'arXiv',
    description: 'arXiv 学术论文搜索和获取',
    endpoint: 'local://arxiv',  // 本地处理，无需远程端点
    icon: '📚',
    enabled: false,
    auth: {
      type: 'none',
    },
  },
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
  {
    id: 'web-fetch',
    name: 'Web Fetch',
    description: '从网页获取内容并转换为 Markdown 格式',
    endpoint: 'https://remote.mcpservers.org/fetch/mcp',
    icon: 'W',
    enabled: false,
    auth: {
      type: 'none',
    },
  },
  {
    id: 'deepwiki',
    name: 'DeepWiki',
    description: '深度 Wiki 知识库搜索和问答',
    endpoint: 'https://mcp.deepwiki.com/mcp',
    icon: 'D',
    enabled: false,
    auth: {
      type: 'none',
    },
  },
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
