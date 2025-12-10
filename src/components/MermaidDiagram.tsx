'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// 初始化 mermaid 配置
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    // 主题颜色配置 - 使用 indigo/blue 色系
    primaryColor: '#818cf8',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#6366f1',
    lineColor: '#94a3b8',
    secondaryColor: '#c7d2fe',
    tertiaryColor: '#e0e7ff',
    // 背景
    background: '#ffffff',
    mainBkg: '#f8fafc',
    // 文字
    textColor: '#334155',
    // 节点
    nodeBorder: '#6366f1',
    clusterBkg: '#f1f5f9',
    clusterBorder: '#cbd5e1',
    // 连接线
    edgeLabelBackground: '#ffffff',
    // 序列图
    actorBorder: '#6366f1',
    actorBkg: '#e0e7ff',
    actorTextColor: '#1e293b',
    actorLineColor: '#94a3b8',
    signalColor: '#334155',
    signalTextColor: '#1e293b',
    labelBoxBkgColor: '#f8fafc',
    labelBoxBorderColor: '#cbd5e1',
    labelTextColor: '#334155',
    loopTextColor: '#334155',
    noteBorderColor: '#6366f1',
    noteBkgColor: '#e0e7ff',
    noteTextColor: '#1e293b',
    // 状态图
    labelColor: '#334155',
    altBackground: '#f1f5f9',
    // 饼图
    pie1: '#818cf8',
    pie2: '#60a5fa',
    pie3: '#34d399',
    pie4: '#fbbf24',
    pie5: '#f472b6',
    pie6: '#a78bfa',
    pie7: '#22d3d8',
    pieStrokeColor: '#ffffff',
    pieStrokeWidth: '2px',
    pieOpacity: '0.9',
    pieTitleTextColor: '#1e293b',
    pieSectionTextColor: '#ffffff',
    pieLegendTextColor: '#334155',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
  },
  sequence: {
    diagramMarginX: 15,
    diagramMarginY: 15,
    actorMargin: 60,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  securityLevel: 'loose',
});

// 生成唯一 ID
let mermaidIdCounter = 0;
const generateMermaidId = () => `mermaid-diagram-${++mermaidIdCounter}-${Date.now()}`;

export default function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart) {
        setIsLoading(false);
        setError('No chart content provided');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 清理 chart 内容
        const cleanedChart = chart
          .trim()
          .replace(/\\n/g, '\n')  // 处理转义的换行符
          .replace(/^\s*```mermaid\s*/i, '')  // 移除可能的 markdown 代码块标记
          .replace(/\s*```\s*$/, '');

        if (!cleanedChart) {
          setIsLoading(false);
          setError('Empty chart content');
          return;
        }

        const id = generateMermaidId();
        
        // 直接渲染，mermaid.render 会在语法错误时抛出异常
        const { svg: renderedSvg } = await mermaid.render(id, cleanedChart);
        setSvg(renderedSvg);
        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [chart]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 ${className}`}>
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">渲染图表中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 rounded-xl border border-red-200 ${className}`}>
        <div className="flex items-start gap-2 text-red-600">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium">图表渲染失败</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:text-red-700">查看源码</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">{chart}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-container overflow-x-auto p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-indigo-100 shadow-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
