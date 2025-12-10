'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { MCPServerConfig, MCPServerState, MCPTool } from '@/lib/mcp/types';
import { MCP_SERVERS } from '@/lib/mcp/servers';

interface SidebarContextType {
  // Sidebar 展开/收起状态
  isExpanded: boolean;
  toggleSidebar: () => void;
  
  // MCP 服务器管理
  mcpServers: MCPServerState[];
  enabledServerIds: Set<string>;
  toggleMCPServer: (serverId: string) => void;
  setMCPServerEnabled: (serverId: string, enabled: boolean) => void;
  connectMCPServer: (serverId: string) => Promise<void>;
  disconnectMCPServer: (serverId: string) => void;
  
  // MCP 工具
  getAllMCPTools: () => { serverId: string; serverName: string; tool: MCPTool }[];
  
  // 状态标志
  isConnectingAny: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // MCP 服务器状态
  const [mcpServers, setMCPServers] = useState<MCPServerState[]>(() => 
    MCP_SERVERS.map(config => ({
      config,
      isConnected: false,
      isConnecting: false,
      tools: [],
    }))
  );
  
  // 启用的服务器 ID 集合
  const [enabledServerIds, setEnabledServerIds] = useState<Set<string>>(() => {
    // 默认启用配置中标记为 enabled 的服务器
    const defaultEnabled = new Set<string>();
    MCP_SERVERS.forEach(server => {
      if (server.enabled) {
        defaultEnabled.add(server.id);
      }
    });
    return defaultEnabled;
  });

  // Auto-collapse sidebar on mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // 切换 MCP 服务器启用状态
  const toggleMCPServer = useCallback((serverId: string) => {
    setEnabledServerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serverId)) {
        newSet.delete(serverId);
      } else {
        newSet.add(serverId);
      }
      return newSet;
    });
  }, []);

  // 设置 MCP 服务器启用状态
  const setMCPServerEnabled = useCallback((serverId: string, enabled: boolean) => {
    setEnabledServerIds(prev => {
      const newSet = new Set(prev);
      if (enabled) {
        newSet.add(serverId);
      } else {
        newSet.delete(serverId);
      }
      return newSet;
    });
  }, []);

  // 更新服务器状态的辅助函数
  const updateServerState = useCallback((serverId: string, updates: Partial<MCPServerState>) => {
    setMCPServers(prev => 
      prev.map(server => 
        server.config.id === serverId 
          ? { ...server, ...updates }
          : server
      )
    );
  }, []);

  // 连接到 MCP 服务器
  const connectMCPServer = useCallback(async (serverId: string) => {
    const server = mcpServers.find(s => s.config.id === serverId);
    if (!server || server.isConnected || server.isConnecting) {
      return;
    }

    console.log(`[MCP] Connecting to server: ${serverId}`);
    updateServerState(serverId, { isConnecting: true, error: undefined });

    try {
      // 通过 API 路由连接到 MCP 服务器
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Connection failed: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`[MCP] Server ${serverId} connected successfully:`, {
        toolCount: data.tools?.length || 0,
        tools: data.tools?.map((t: MCPTool) => t.name) || [],
      });
      
      updateServerState(serverId, {
        isConnected: true,
        isConnecting: false,
        tools: data.tools || [],
        lastConnected: new Date(),
      });
    } catch (error) {
      console.error(`[MCP] Failed to connect to server ${serverId}:`, error);
      updateServerState(serverId, {
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, [mcpServers, updateServerState]);

  // 断开 MCP 服务器连接
  const disconnectMCPServer = useCallback((serverId: string) => {
    updateServerState(serverId, {
      isConnected: false,
      isConnecting: false,
      tools: [],
      error: undefined,
    });
  }, [updateServerState]);

  // 当服务器启用状态改变时，自动连接/断开
  // 使用 ref 来跟踪已经尝试连接的服务器，避免无限循环
  const connectionAttemptsRef = React.useRef<Set<string>>(new Set());
  
  useEffect(() => {
    mcpServers.forEach(server => {
      const isEnabled = enabledServerIds.has(server.config.id);
      const hasAttemptedConnection = connectionAttemptsRef.current.has(server.config.id);
      
      if (isEnabled && !server.isConnected && !server.isConnecting && !hasAttemptedConnection) {
        // 服务器被启用但未连接，尝试连接（只尝试一次）
        connectionAttemptsRef.current.add(server.config.id);
        connectMCPServer(server.config.id);
      } else if (!isEnabled && server.isConnected) {
        // 服务器被禁用但已连接，断开连接
        connectionAttemptsRef.current.delete(server.config.id);
        disconnectMCPServer(server.config.id);
      } else if (!isEnabled) {
        // 服务器被禁用，清除连接尝试记录
        connectionAttemptsRef.current.delete(server.config.id);
      }
    });
  }, [enabledServerIds, mcpServers, connectMCPServer, disconnectMCPServer]);

  // 获取所有已连接服务器的工具
  const getAllMCPTools = useCallback(() => {
    const allTools: { serverId: string; serverName: string; tool: MCPTool }[] = [];
    
    mcpServers.forEach(server => {
      if (server.isConnected && enabledServerIds.has(server.config.id)) {
        server.tools.forEach(tool => {
          allTools.push({
            serverId: server.config.id,
            serverName: server.config.name,
            tool,
          });
        });
      }
    });
    
    return allTools;
  }, [mcpServers, enabledServerIds]);

  // 检查是否有任何服务器正在连接
  const isConnectingAny = mcpServers.some(s => s.isConnecting);

  return (
    <SidebarContext.Provider value={{ 
      isExpanded, 
      toggleSidebar,
      mcpServers,
      enabledServerIds,
      toggleMCPServer,
      setMCPServerEnabled,
      connectMCPServer,
      disconnectMCPServer,
      getAllMCPTools,
      isConnectingAny,
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
