/**
 * MCP (Model Context Protocol) 客户端服务
 * 
 * 提供与 MCP 服务器通信的功能，包括：
 * - 初始化连接
 * - 获取工具列表
 * - 执行工具调用
 * 
 * 支持 Streamable HTTP 传输方式（SSE）
 */

import {
  MCPServerConfig,
  MCPTool,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPRequest,
  MCPResponse,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPContent,
} from './types';

// 请求ID计数器
let requestIdCounter = 0;

/**
 * 生成唯一的请求ID
 */
function generateRequestId(): number {
  return ++requestIdCounter;
}

/**
 * 解析 SSE 响应
 */
async function parseSSEResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const lines = text.split('\n');
  
  let result: T | null = null;
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data.trim()) {
        try {
          const parsed = JSON.parse(data);
          // MCP SSE 响应包含完整的 JSON-RPC 消息
          if (parsed.result !== undefined) {
            result = parsed.result as T;
          } else if (parsed.error) {
            throw new Error(`MCP error: ${parsed.error.message} (code: ${parsed.error.code})`);
          }
        } catch (e) {
          // 如果不是 JSON，跳过
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  
  if (result === null) {
    throw new Error('No valid response data found in SSE stream');
  }
  
  return result;
}

/**
 * 发送 MCP 请求到服务器
 */
async function sendMCPRequest<TParams, TResult>(
  endpoint: string,
  method: string,
  params?: TParams,
  auth?: MCPServerConfig['auth']
): Promise<TResult> {
  const request: MCPRequest<TParams> = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method,
    params,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  // 添加认证头
  if (auth) {
    if (auth.type === 'bearer' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'api-key' && auth.token) {
      const headerName = auth.headerName || 'X-API-Key';
      headers[headerName] = auth.token;
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  
  // 检查是否是 SSE 响应
  if (contentType.includes('text/event-stream')) {
    return parseSSEResponse<TResult>(response);
  }
  
  // 普通 JSON 响应
  const data: MCPResponse<TResult> = await response.json();

  if (data.error) {
    throw new Error(`MCP error: ${data.error.message} (code: ${data.error.code})`);
  }

  return data.result as TResult;
}

/**
 * MCP 客户端类
 * 
 * 封装与单个 MCP 服务器的所有通信
 */
export class MCPClient {
  private config: MCPServerConfig;
  private tools: MCPTool[] = [];
  private initialized = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * 获取服务器配置
   */
  getConfig(): MCPServerConfig {
    return this.config;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取缓存的工具列表
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * 初始化与 MCP 服务器的连接
   */
  async initialize(): Promise<MCPInitializeResult> {
    const result = await sendMCPRequest<object, MCPInitializeResult>(
      this.config.endpoint,
      'initialize',
      {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'agentic-ai-app',
          version: '0.1.0',
        },
      },
      this.config.auth
    );

    this.initialized = true;
    
    // 初始化成功后自动获取工具列表
    await this.listTools();

    return result;
  }

  /**
   * 获取服务器提供的工具列表
   */
  async listTools(): Promise<MCPTool[]> {
    const result = await sendMCPRequest<object, MCPToolsListResult>(
      this.config.endpoint,
      'tools/list',
      {},
      this.config.auth
    );

    this.tools = result.tools || [];
    return this.tools;
  }

  /**
   * 调用工具
   */
  async callTool(params: MCPToolCallParams): Promise<MCPToolCallResult> {
    const result = await sendMCPRequest<MCPToolCallParams, MCPToolCallResult>(
      this.config.endpoint,
      'tools/call',
      params,
      this.config.auth
    );

    return result;
  }

  /**
   * 关闭连接（重置状态）
   */
  disconnect(): void {
    this.initialized = false;
    this.tools = [];
  }
}

/**
 * MCP 客户端管理器
 * 
 * 管理多个 MCP 服务器连接
 */
export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();

  /**
   * 添加或更新服务器配置
   */
  addServer(config: MCPServerConfig): MCPClient {
    const existingClient = this.clients.get(config.id);
    if (existingClient) {
      existingClient.disconnect();
    }

    const client = new MCPClient(config);
    this.clients.set(config.id, client);
    return client;
  }

  /**
   * 获取客户端
   */
  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
  }

  /**
   * 获取所有客户端
   */
  getAllClients(): MCPClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * 移除服务器
   */
  removeServer(serverId: string): void {
    const client = this.clients.get(serverId);
    if (client) {
      client.disconnect();
      this.clients.delete(serverId);
    }
  }

  /**
   * 连接到指定服务器
   */
  async connectServer(serverId: string): Promise<MCPClient> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server not found: ${serverId}`);
    }

    await client.initialize();
    return client;
  }

  /**
   * 断开指定服务器
   */
  disconnectServer(serverId: string): void {
    const client = this.clients.get(serverId);
    if (client) {
      client.disconnect();
    }
  }

  /**
   * 获取所有已启用服务器的工具
   */
  getAllTools(): { serverId: string; tool: MCPTool }[] {
    const allTools: { serverId: string; tool: MCPTool }[] = [];
    
    for (const [serverId, client] of this.clients) {
      if (client.isInitialized()) {
        for (const tool of client.getTools()) {
          allTools.push({ serverId, tool });
        }
      }
    }
    
    return allTools;
  }

  /**
   * 调用工具
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolCallResult> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (!client.isInitialized()) {
      throw new Error(`Server not initialized: ${serverId}`);
    }

    return client.callTool({
      name: toolName,
      arguments: args,
    });
  }

  /**
   * 清除所有连接
   */
  clear(): void {
    for (const client of this.clients.values()) {
      client.disconnect();
    }
    this.clients.clear();
  }
}

/**
 * 将 MCP 工具结果转换为文本
 */
export function mcpResultToText(result: MCPToolCallResult): string {
  if (!result.content || result.content.length === 0) {
    return '';
  }

  return result.content
    .map((content: MCPContent) => {
      if (content.type === 'text' && content.text) {
        return content.text;
      }
      if (content.type === 'resource' && content.resource?.text) {
        return content.resource.text;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * 将 MCP 工具转换为 OpenAI 函数格式
 */
export function mcpToolToOpenAIFunction(
  serverId: string,
  tool: MCPTool
): {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
} {
  // 使用 serverId 作为前缀，避免工具名冲突
  const functionName = `${serverId}__${tool.name}`;
  
  return {
    type: 'function',
    function: {
      name: functionName,
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  };
}

/**
 * 解析 OpenAI 函数调用名称，提取 serverId 和 toolName
 */
export function parseOpenAIFunctionName(
  functionName: string
): { serverId: string; toolName: string } | null {
  const parts = functionName.split('__');
  if (parts.length < 2) {
    return null;
  }
  
  return {
    serverId: parts[0],
    toolName: parts.slice(1).join('__'),
  };
}
