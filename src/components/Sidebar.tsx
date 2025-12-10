'use client';

import React from 'react';
import { Loader2, AlertCircle, Zap, Power } from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface SidebarProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

// Microsoft 图标 SVG 组件
const MicrosoftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 23 23" fill="none">
    <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
    <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
    <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
    <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
  </svg>
);

// arXiv 图标 SVG 组件
const ArxivIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#B31B1B"/>
    <path d="M2 17l10 5 10-5" stroke="#B31B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12l10 5 10-5" stroke="#B31B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 根据服务器 ID 渲染图标
const renderServerIcon = (serverId: string, icon?: string) => {
  // 为特定服务器使用自定义图标
  if (serverId === 'microsoft-learn') {
    return <MicrosoftIcon className="w-4 h-4" />;
  }
  if (serverId === 'arxiv') {
    return <ArxivIcon className="w-4 h-4" />;
  }
  // 默认使用配置的图标或插头 emoji
  return icon || '🔌';
};

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, toggleSidebar }) => {
  const { 
    mcpServers, 
    enabledServerIds, 
    toggleMCPServer,
    connectMCPServer,
  } = useSidebar();
  
  // 统计已启用和已连接的服务器数量
  const enabledCount = enabledServerIds.size;
  const connectedCount = mcpServers.filter(s => s.isConnected && enabledServerIds.has(s.config.id)).length;
  
  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-indigo-900/20 backdrop-blur-sm z-20 transition-all duration-300 md:hidden ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />
      
      <div 
        className={`fixed top-0 left-0 h-full z-30 transition-all duration-300 ease-in-out glass-effect ${
          isExpanded ? 'w-72' : 'w-16'
        } overflow-hidden shadow-xl shadow-indigo-500/10`}
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(99, 102, 241, 0.15)',
        }}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-indigo-100/60">
          {isExpanded ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
                Tools
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          
          {isExpanded && (
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* MCP Servers */}
        <div className="p-3 flex-1 overflow-y-auto">
          {isExpanded ? (
            <>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MCP Servers</span>
                {enabledCount > 0 && (
                  <span className="text-xs font-medium text-indigo-500">
                    {connectedCount}/{enabledCount} 在线
                  </span>
                )}
              </div>
              
              {/* Server Cards */}
              <div className="space-y-2">
                {mcpServers.map(server => {
                  const isEnabled = enabledServerIds.has(server.config.id);
                  const isConnected = server.isConnected;
                  const isConnecting = server.isConnecting;
                  const hasError = !!server.error;
                  
                  return (
                    <div
                      key={server.config.id}
                      onClick={() => toggleMCPServer(server.config.id)}
                      className={`group relative rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200 ${
                        isEnabled 
                          ? isConnected
                            ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/50 ring-1 ring-emerald-200/80'
                            : hasError
                              ? 'bg-gradient-to-r from-red-50/80 to-rose-50/50 ring-1 ring-red-200/80'
                              : 'bg-gradient-to-r from-indigo-50/80 to-violet-50/50 ring-1 ring-indigo-200/80'
                          : 'bg-white/50 ring-1 ring-slate-200/50 hover:ring-indigo-200 hover:bg-indigo-50/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 transition-all ${
                          isEnabled
                            ? isConnected
                              ? 'bg-emerald-100/80'
                              : hasError
                                ? 'bg-red-100/80'
                                : 'bg-indigo-100/80'
                            : 'bg-slate-100/80'
                        }`}>
                          {renderServerIcon(server.config.id, server.config.icon)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-medium truncate ${
                              isEnabled 
                                ? isConnected 
                                  ? 'text-emerald-700'
                                  : hasError
                                    ? 'text-red-700'
                                    : 'text-indigo-700'
                                : 'text-slate-600'
                            }`}>
                              {server.config.name}
                            </span>
                            
                            {/* Status indicators */}
                            {isConnecting && (
                              <Loader2 className="w-3 h-3 text-indigo-500 animate-spin flex-shrink-0" />
                            )}
                            {hasError && isEnabled && (
                              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          {/* Tools count or error */}
                          <div className="flex items-center gap-1 mt-0.5">
                            {isConnected && server.tools.length > 0 ? (
                              <span className="text-[11px] text-emerald-600/80">
                                {server.tools.length} tools
                              </span>
                            ) : hasError && isEnabled ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  connectMCPServer(server.config.id);
                                }}
                                className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                              >
                                重试
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {isEnabled ? (isConnecting ? '连接中...' : '等待连接') : '未启用'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Toggle Switch */}
                        <div 
                          className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-all duration-200 ${
                            isEnabled 
                              ? isConnected
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-inner'
                                : 'bg-gradient-to-r from-indigo-400 to-violet-400 shadow-inner'
                              : 'bg-slate-200 group-hover:bg-slate-300'
                          }`}
                        >
                          <div 
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                              isEnabled ? 'left-[18px]' : 'left-0.5'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {mcpServers.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                      <Power className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500">暂无可用服务器</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 收起状态 - 显示图标列表 */
            <div className="space-y-2">
              {mcpServers.map(server => {
                const isEnabled = enabledServerIds.has(server.config.id);
                const isConnected = server.isConnected;
                const isConnecting = server.isConnecting;
                const hasError = !!server.error;
                
                return (
                  <button
                    key={server.config.id}
                    onClick={() => toggleMCPServer(server.config.id)}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-lg mx-auto transition-all hover-glow ${
                      isEnabled
                        ? isConnected
                          ? 'bg-gradient-to-br from-emerald-100 to-teal-100 ring-1 ring-emerald-200 shadow-sm'
                          : hasError
                            ? 'bg-gradient-to-br from-red-100 to-rose-100 ring-1 ring-red-200 shadow-sm'
                            : 'bg-gradient-to-br from-indigo-100 to-violet-100 ring-1 ring-indigo-200 shadow-sm'
                        : 'bg-white/80 ring-1 ring-slate-200 hover:ring-indigo-200 hover:bg-indigo-50'
                    }`}
                    title={server.config.name}
                  >
                    {renderServerIcon(server.config.id, server.config.icon)}
                    
                    {/* Status indicator */}
                    {isConnecting ? (
                      <div className="absolute -top-0.5 -right-0.5">
                        <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                      </div>
                    ) : isConnected ? (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
                    ) : hasError ? (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm" />
                    ) : null}
                  </button>
                );
              })}
              
              {/* Expand button */}
              <button
                onClick={toggleSidebar}
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 ring-1 ring-transparent hover:ring-indigo-200 transition-all mt-4"
                title="展开侧边栏"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;