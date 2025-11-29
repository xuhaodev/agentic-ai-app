/**
 * MCP (Model Context Protocol) 类型定义
 * 
 * 这些类型定义遵循 MCP 规范，用于与 MCP 服务器通信
 */

// MCP 工具定义
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, MCPToolProperty>;
    required?: string[];
  };
}

export interface MCPToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: MCPToolProperty;
}

// MCP 工具调用请求
export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

// MCP 工具调用结果
export interface MCPToolCallResult {
  content: MCPContent[];
  isError?: boolean;
}

// MCP 内容类型
export interface MCPContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    text?: string;
    blob?: string;
  };
}

// MCP Server 配置
export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  icon?: string;
  enabled?: boolean;
  // 可选的认证配置
  auth?: {
    type: 'none' | 'bearer' | 'api-key';
    token?: string;
    headerName?: string;
  };
}

// MCP Server 状态
export interface MCPServerState {
  config: MCPServerConfig;
  isConnected: boolean;
  isConnecting: boolean;
  tools: MCPTool[];
  error?: string;
  lastConnected?: Date;
}

// MCP 请求类型
export interface MCPRequest<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: T;
}

// MCP 响应类型
export interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: MCPError;
}

// MCP 错误
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP 初始化响应
export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: {
      listChanged?: boolean;
    };
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    prompts?: {
      listChanged?: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

// MCP 工具列表响应
export interface MCPToolsListResult {
  tools: MCPTool[];
}

// MCP 工具调用参数
export interface MCPToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

// 聊天中使用的 MCP 工具调用
export interface ChatMCPToolCall {
  id: string;
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: MCPToolCallResult;
  error?: string;
}

// 扩展的聊天消息类型，支持 MCP 工具调用
export interface MCPEnabledChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ChatMCPToolCall[];
  toolCallId?: string;
}
