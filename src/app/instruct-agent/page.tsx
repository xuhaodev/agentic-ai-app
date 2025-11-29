'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ChatMessage, ChatRole } from '@/lib/types';
import { models } from '@/lib/instruct-agent/models';
import type { ToolDefinition } from '@/lib/instruct-agent/tools-service';
import { extractTextFromFile } from '@/lib/instruct-agent/file-parser';
import { useSidebar } from '@/components/SidebarContext';
import CustomSelect from '@/components/CustomSelect';

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface UploadedFile {
  file: File;
  content: string | null;
  isProcessing: boolean;
}

interface UploadedDocument {
  file: File;
  content: string;
  isProcessing: boolean;
  error?: string;
}

interface UploadedImage {
  file: File;
  dataUrl: string;
  base64: string;
  mimeType: string;
  isProcessing: boolean;
  error?: string;
}

export default function InstructAgentPage() {
  const { isExpanded } = useSidebar();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isLoadingTools, setIsLoadingTools] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [documentContext, setDocumentContext] = useState<UploadedDocument[]>([]);
  const [imageAttachments, setImageAttachments] = useState<UploadedImage[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const selectedToolRef = useRef<string | null>(null);

  useEffect(() => {
    selectedToolRef.current = selectedTool ? selectedTool.id : null;
  }, [selectedTool]);

  useEffect(() => {
    let cancelled = false;

    const loadTools = async () => {
      setPromptError(null);
      setIsLoadingTools(true);
      try {
        const response = await fetch('/api/tools', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load tools: ${response.status}`);
        }
        const data = await response.json();
        const fetched: ToolDefinition[] = Array.isArray(data?.tools) ? data.tools : [];

        if (!cancelled) {
          setTools(fetched);
          if (fetched.length > 0) {
            setSelectedTool(fetched[0]);
          } else {
            setSelectedTool(null);
            setSystemPrompt('');
            setPromptError('未在 GitHub Gist 中找到任何工具。');
          }
        }
      } catch (err) {
        console.error('Failed to load tools', err);
        if (!cancelled) {
          setTools([]);
          setSelectedTool(null);
          setSystemPrompt('');
          setPromptError('无法从 GitHub Gist 加载工具列表。');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTools(false);
        }
      }
    };

    loadTools();

    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    // Auto-resize textarea
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      const hasContext = documentContext.some(doc => doc.content && !doc.error) ||
        imageAttachments.some(img => img.base64 && !img.error);

      if (isLoading || (input.trim() === '' && !hasContext)) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const loadSystemPromptForTool = useCallback(async (tool: ToolDefinition | null, options?: { refresh?: boolean }) => {
    if (!tool) return;
    const isCurrent = selectedToolRef.current === tool.id;
    if (isCurrent) {
      setIsPromptLoading(true);
      setPromptError(null);
    }

    try {
      let promptText: string;
      if (tool.systemPromptUrl) {
        const query = options?.refresh ? '?refresh=1' : '';
        const response = await fetch(`/api/system-prompts/${tool.id}${query}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to fetch prompt for ${tool.id}`);
        }
        const data = await response.json();
        promptText = (data?.prompt ?? '').trim();
      } else {
        promptText = tool.fallbackSystemPrompt ?? '';
      }

      if (selectedToolRef.current === tool.id) {
        setSystemPrompt(promptText);
      }
    } catch (err) {
      console.error('Unable to load system prompt', err);
      const fallbackPrompt = tool.fallbackSystemPrompt ?? '';
      if (selectedToolRef.current === tool.id) {
        setSystemPrompt(fallbackPrompt);
        setPromptError('未能从 GitHub 加载最新提示，已回退至本地内容。');
      }
    } finally {
      if (selectedToolRef.current === tool.id) {
        setIsPromptLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedTool) {
      setSystemPrompt('');
      return;
    }
    loadSystemPromptForTool(selectedTool);
  }, [selectedTool, loadSystemPromptForTool]);

  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tool = tools.find(t => t.id === e.target.value) ?? null;
    setPromptError(null);
    setSelectedTool(tool);
  };

  const resetPrompt = () => {
    if (selectedTool) {
      loadSystemPromptForTool(selectedTool, { refresh: true });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    setError(null);

    const filesArray = Array.from(files);
    let loadedDocuments = 0;
    let loadedImages = 0;

    for (const file of filesArray) {
      try {
        if (file.type.startsWith('image/')) {
          const tempImage: UploadedImage = {
            file,
            dataUrl: '',
            base64: '',
            mimeType: file.type || 'image/jpeg',
            isProcessing: true
          };

          setImageAttachments(prev => [...prev, tempImage]);

          const dataUrl = await readFileAsDataURL(file);
          const [meta = '', base64Part = ''] = dataUrl.split(',');
          const mimeMatch = meta.match(/data:(.*);base64/);
          const mimeType = mimeMatch?.[1] ?? file.type ?? 'image/jpeg';

          setImageAttachments(prev =>
            prev.map(img =>
              img.file === file
                ? { ...img, isProcessing: false, dataUrl, base64: base64Part, mimeType }
                : img
            )
          );

          loadedImages += 1;
          console.log(`Loaded image attachment: ${file.name} (${mimeType})`);
          continue;
        }

        const tempDoc: UploadedDocument = {
          file,
          content: '',
          isProcessing: true
        };

        setDocumentContext(prev => [...prev, tempDoc]);

        const text = await extractTextFromFile(file);

        const isExtractionError = text.includes('Failed to extract text from PDF') ||
          text.includes('Unable to fully extract content');

        if (isExtractionError) {
          setDocumentContext(prev =>
            prev.map(doc =>
              doc.file === file && doc.isProcessing
                ? { ...doc, isProcessing: false, error: text, content: '' }
                : doc
            )
          );

          const errorMsg: ChatMessage = {
            role: 'assistant',
            content: `It seems I cannot extract text from the file "${file.name}" because it's either scanned or in an unsupported format. Please try a different file or type your question directly.`
          };
          setMessages(prev => [...prev, errorMsg]);
        } else {
          setDocumentContext(prev =>
            prev.map(doc =>
              doc.file === file && doc.isProcessing
                ? { ...doc, isProcessing: false, content: text }
                : doc
            )
          );
          loadedDocuments += 1;
          console.log(`Loaded document context: ${file.name} (${Math.round(text.length / 1024)}KB approx)`);
        }
      } catch (err) {
        console.error('Error processing file:', err);

        if (file.type.startsWith('image/')) {
          setImageAttachments(prev =>
            prev.map(img =>
              img.file === file && img.isProcessing
                ? { ...img, isProcessing: false, error: 'Failed to process image attachment' }
                : img
            )
          );
        } else {
          setDocumentContext(prev =>
            prev.map(doc =>
              doc.file === file && doc.isProcessing
                ? { ...doc, isProcessing: false, error: 'Failed to process file' }
                : doc
            )
          );
        }

        setError(`Failed to process file: ${file.name}`);
      }
    }

    if (loadedDocuments > 0 || loadedImages > 0) {
      const parts = [];
      if (loadedDocuments > 0) {
        parts.push(`${loadedDocuments} document${loadedDocuments > 1 ? 's' : ''}`);
      }
      if (loadedImages > 0) {
        parts.push(`${loadedImages} image${loadedImages > 1 ? 's' : ''}`);
      }

      const contextMsg: ChatMessage = {
        role: 'assistant',
        content: `I've loaded ${parts.join(' and ')} as context. You can now ask questions about the content.`
      };
      setMessages(prev => [...prev, contextMsg]);
    }

    setIsProcessingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (documentToRemove: UploadedDocument) => {
    setDocumentContext(prev => prev.filter(doc => doc !== documentToRemove));
  };

  const removeImage = (imageToRemove: UploadedImage) => {
    setImageAttachments(prev => prev.filter(img => img !== imageToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasValidDocuments = documentContext.some(doc => doc.content && !doc.error);
    const hasValidImages = imageAttachments.some(img => img.base64 && !img.error);

    if ((input.trim() === '' && !hasValidDocuments && !hasValidImages) || isLoading) return;
    if (!selectedTool) {
      setError('请先选择一个工具。');
      return;
    }
    setError(null);

    // Show only the user's input in the UI
    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Construct the full prompt with document context
    let combinedInput = input;
    
    // Add document context if available
    const validDocuments = documentContext.filter(doc => doc.content && !doc.error);
    if (validDocuments.length > 0) {
      combinedInput += "\n\n==== DOCUMENT CONTEXT ====\n\n";
      // Add each document with clear separation and document number
      validDocuments.forEach((doc, index) => {
        // Add a horizontal rule between documents for clarity except for first document
        if (index > 0) {
          combinedInput += "----------\n\n";
        }
        combinedInput += `[Document ${index + 1}: ${doc.file.name}]\n${doc.content}\n\n`;
      });
      combinedInput += "==== END OF DOCUMENT CONTEXT ====\n\nPlease answer based on the document context when relevant.";
      
      // Log info about the document context being included
      console.log(`Including ${validDocuments.length} documents as context`);
      validDocuments.forEach((doc, idx) => {
        console.log(`Document ${idx+1}: ${doc.file.name} (${Math.round(doc.content.length/1024)}KB)`);
      });
    }

    const validImages = imageAttachments.filter(img => img.base64 && !img.error);
    if (validImages.length > 0) {
      console.log(`Including ${validImages.length} image attachment(s) as context`);
      validImages.forEach((img, idx) => {
        console.log(`Image ${idx + 1}: ${img.file.name} (${img.mimeType})`);
      });
    }

    setInput('');
    setShowPreview(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      // Add empty assistant message to show loading state
      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMessageId }]);

      // 只将用户消息发送给API，不包括系统消息
      // 系统消息将由后端根据选定的工具添加
      const messageHistory = messages.filter(m => m.role !== 'system');

      const imagePayload = validImages.map(img => ({
        name: img.file.name,
        mimeType: img.mimeType,
        base64: img.base64
      }));

      const response = await fetch('/api/instruct-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messageHistory,
          systemPrompt: systemPrompt,
          prompt: combinedInput,
          tool: selectedTool.id,
          model: selectedModel.id,
          imageAttachments: imagePayload
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      // 流式处理逻辑
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let accumulatedStream = ''; // 用于积累SSE片段

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // 解码当前块并添加到累积的流数据中
        const chunk = decoder.decode(value, { stream: true });
        accumulatedStream += chunk;
        
        // 处理完整的SSE消息
        const messages = accumulatedStream.split('\n\n');
        // 保留最后一个可能不完整的消息用于下一次迭代
        accumulatedStream = messages.pop() || '';
        
        // 处理所有完整的消息
        for (const message of messages) {
          if (message.trim() && message.startsWith('data: ')) {
            const content = message.replace(/^data: /, '');
            try {
              // 尝试解析JSON内容
              const parsedContent = JSON.parse(content);
              
              // 处理错误消息
              if (parsedContent.error) {
                setError(parsedContent.error);
                setMessages(prev => prev.slice(0, -1)); // 移除助手的消息
                setIsLoading(false);
                return;
              }
              
              // 处理正常的字符串内容
              if (typeof parsedContent === 'string') {
                accumulatedContent += parsedContent;
                updateAssistantMessage(assistantMessageId, accumulatedContent);
              }
            } catch (e) {
              // 非JSON内容，直接使用
              accumulatedContent += content;
              updateAssistantMessage(assistantMessageId, accumulatedContent);
            }
          }
        }
        // After updates, ensure we're scrolled to bottom
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      // Remove the assistant's message if there was an error
      setMessages(prev => prev.slice(0, -1)); 
    } finally {
      setIsLoading(false);
    }
  };

  // 辅助函数：更新助手的消息
  const updateAssistantMessage = (id: string, content: string) => {
    setMessages(prev => {
      return prev.map(msg => {
        // 按ID查找或退化为最后一条助手消息
        if ((msg.id === id) || 
            (!id && msg.role === 'assistant' && prev.indexOf(msg) === prev.length - 1)) {
          return { ...msg, content };
        }
        return msg;
      });
    });
    // Scroll to bottom as content updates
    scrollToBottom();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // 更新 MessageContent 组件，支持更好的 Markdown 渲染
  const MessageContent = ({ content }: { content: string }) => {
    // Ensure content is always a string
    const safeContent = typeof content === 'string' ? content : '';
    
    return (
      <div className="prose prose-sm max-w-none prose-slate font-medium text-slate-800">
        <ReactMarkdown
          components={{
            // Properly handle paragraphs
            p: ({ children }) => (
              <p className="mb-4 last:mb-0 text-slate-700 leading-relaxed">{children}</p>
            ),
            // Handle headings with high contrast
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-slate-900 border-b border-indigo-200/60 pb-2 mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full"></span>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold text-slate-800 mb-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold text-slate-700 mb-2">{children}</h4>
            ),
            // Handle strong/bold with high contrast
            strong: ({ children }) => (
              <strong className="font-bold text-slate-900 bg-gradient-to-r from-indigo-100/60 to-blue-100/40 px-1 py-0.5 rounded border-b-2 border-indigo-400/50">{children}</strong>
            ),
            // Handle emphasis/italic
            em: ({ children }) => (
              <em className="text-indigo-700 italic">{children}</em>
            ),
            // Handle links
            a: ({ href, children }) => (
              <a href={href} className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            // Handle lists - use native markdown list styles
            ul: ({ children }) => (
              <ul className="list-disc pl-6 my-3 space-y-1 marker:text-indigo-500">{children}</ul>
            ),
            ol: ({ children, start, ...props }) => (
              <ol className="list-decimal pl-6 my-3 space-y-1 marker:text-indigo-500 marker:font-semibold" start={start} {...props}>{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-slate-700 leading-relaxed pl-1">{children}</li>
            ),
            // Handle blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-indigo-400 bg-gradient-to-r from-indigo-50/80 to-transparent pl-4 pr-2 py-2 my-3 rounded-r-lg italic text-slate-600">{children}</blockquote>
            ),
            // Handle code blocks with proper formatting
            code: ({ inline, className, children, ...props }: CodeProps) => {
              const match = /language-(\w+)/.exec(className || '');
              // Ensure children is always a string
              const codeContent = Array.isArray(children) 
                ? children.join('') 
                : typeof children === 'string' 
                  ? children 
                  : String(children || '');
              
              return !inline && match ? (
                <div className="relative group my-3">
                  <div className="absolute -top-3 left-3 px-2 py-0.5 bg-slate-700 text-xs text-slate-300 rounded-t-md font-mono">{match[1]}</div>
                  <button
                    onClick={() => copyToClipboard(codeContent)}
                    className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-600/80 hover:bg-slate-500 text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Copy code"
                  >
                    <span className="material-icons-outlined text-sm">content_copy</span>
                  </button>
                  <SyntaxHighlighter
                    {...props}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-xl !mt-0 !bg-gradient-to-br !from-slate-800 !to-slate-900"
                    customStyle={{
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      paddingTop: '1.75rem',
                    }}
                  >
                    {codeContent.replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code {...props} className="bg-gradient-to-r from-indigo-100/70 to-blue-100/50 text-indigo-800 rounded-md px-1.5 py-0.5 text-sm font-medium border border-indigo-200/40">
                  {children}
                </code>
              );
            },
            // Handle tables with proper structure
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse rounded-xl overflow-hidden border border-indigo-200/40 shadow-sm table-auto">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-indigo-100/40">{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-indigo-50/30 transition-colors">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="bg-gradient-to-r from-indigo-100 to-blue-100 text-slate-800 font-semibold text-left px-4 py-2.5 border-b-2 border-indigo-300/50 whitespace-nowrap">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2.5 border-b border-indigo-100/40 text-slate-700 align-top">{children}</td>
            ),
          }}
          remarkPlugins={[remarkGfm]}
        >
          {safeContent || ' '}
        </ReactMarkdown>
      </div>
    );
  };

  const hasValidDocumentsForUi = documentContext.some(doc => doc.content && !doc.error);
  const hasValidImagesForUi = imageAttachments.some(img => img.base64 && !img.error);
  const hasContextItems = documentContext.length > 0 || imageAttachments.length > 0;

  const inputPlaceholder = hasValidDocumentsForUi || hasValidImagesForUi
    ? 'Ask questions about the uploaded context...'
    : 'Type your message here...';

  const isSubmitDisabled = isLoading || (input.trim() === '' && !hasValidDocumentsForUi && !hasValidImagesForUi);

  const isInputEmpty = input.trim() === '';

  return (
    <main className={`h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/40 p-4 ${isExpanded ? 'ml-64' : 'ml-16'
    } transition-all duration-300`}>
      <div className="w-full h-full flex flex-col">

        <div className="flex-shrink-0 flex justify-center items-center bg-white/80 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100/50 shadow-lg shadow-indigo-100/20 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 z-0"></div>
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-purple-400/10 to-transparent rounded-full blur-2xl translate-x-1/2 translate-y-1/2"></div>
          
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent relative z-10 tracking-tight">
            ✨ Instruct Agent
          </h1>
        </div>

        {error && (
          <div className="flex-shrink-0 bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-600 px-4 py-3 rounded-xl shadow-sm mb-4">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 gap-4 min-h-0">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-indigo-100/50 shadow-lg shadow-indigo-100/20 flex flex-col w-1/3 relative min-h-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 z-0"></div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-indigo-400/10 to-transparent rounded-full blur-2xl"></div>
            
            {/* 卡片头部 - 工具选择下拉列表作为标题 */}
            <div className="flex items-center justify-between mb-3 relative z-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-indigo-500 text-lg">build</span>
                <CustomSelect
                  value={selectedTool?.id ?? ''}
                  onChange={(value) => {
                    const tool = tools.find(t => t.id === value) ?? null;
                    setPromptError(null);
                    setSelectedTool(tool);
                  }}
                  options={tools.length === 0 
                    ? [{ value: '', label: isLoadingTools ? '加载工具中...' : '无可用工具' }]
                    : tools.map(tool => ({ value: tool.id, label: tool.name }))
                  }
                  disabled={isLoadingTools || tools.length === 0}
                  placeholder="选择工具..."
                />
                
                {/* 加载状态和错误提示 - 放在下拉列表旁边 */}
                {isPromptLoading && (
                  <span className="text-xs text-indigo-500 animate-pulse flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
                {!isPromptLoading && promptError && (
                  <span className="text-xs text-amber-600 truncate max-w-[100px]" title={promptError}>⚠</span>
                )}
              </div>
              
              <button
                onClick={resetPrompt}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-all hover:bg-indigo-50 p-1.5 rounded-lg"
                title="从 GitHub 重新加载"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 relative z-10 min-h-0">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="instruction-template w-full h-full p-4 rounded-xl border border-indigo-100/60 hover:border-indigo-200 transition-all bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-transparent text-slate-700 font-medium resize-none shadow-inner"
                placeholder="Enter system prompt..."
              />
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg shadow-indigo-100/20 border border-indigo-100/50 overflow-hidden flex-1 flex flex-col relative min-h-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 z-0 pointer-events-none"></div>
            <div className="border-b border-indigo-100/60 px-4 py-3 bg-gradient-to-r from-slate-50/80 to-indigo-50/50 backdrop-blur-sm flex justify-between items-center relative z-10 flex-shrink-0">
              {/* 模型选择下拉列表作为标题 */}
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-indigo-500 text-lg">smart_toy</span>
                <CustomSelect
                  value={selectedModel.id}
                  onChange={(value) => setSelectedModel(models.find(m => m.id === value) || models[0])}
                  options={models.map(model => ({ value: model.id, label: model.name }))}
                  placeholder="选择模型..."
                />
              </div>
              
              {/* 清空按钮 */}
              <button 
                onClick={() => setMessages([])}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-all hover:bg-indigo-50 p-1.5 rounded-lg"
                title="清空聊天记录"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <div 
              ref={chatContainerRef}
              className="p-4 space-y-4 flex-1 overflow-y-auto scroll-smooth relative z-10 min-h-0"
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`group relative p-4 rounded-2xl max-w-[80%] transition-all duration-200 ${msg.role === 'user' 
                        ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 text-white border-none user-message shadow-lg shadow-indigo-200/50' 
                        : msg.role === 'system'
                        ? 'bg-slate-100/80 text-slate-700 border border-slate-200/60'
                        : 'bg-white/90 backdrop-blur-sm text-slate-800 border border-indigo-100/60 shadow-lg shadow-indigo-100/30 hover:shadow-xl hover:shadow-indigo-100/40 assistant-message markdown-content'
                    }`}
                  >
                    {msg.role !== 'system' && (
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-900/10 hover:bg-slate-900/20 text-current opacity-0 group-hover:opacity-100 transition-all duration-200"
                        title="Copy message"
                      >
                        <span className="material-icons-outlined text-sm">content_copy</span>
                      </button>
                    )}
                    {msg.role === 'assistant' ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-indigo-100/50">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-200 border-t-indigo-500"></div>
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-indigo-100/60 mt-auto relative z-10">
              {hasContextItems && (
                <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-b border-indigo-100/40">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
                      <span className="material-icons-outlined text-base">attachment</span>
                      Context Attachments
                    </h3>
                    <button 
                      onClick={() => {
                        setDocumentContext([]);
                        setImageAttachments([]);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 transition-all hover:bg-indigo-100/50 px-2.5 py-1 rounded-lg font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1">
                    {documentContext.map((doc, idx) => (
                      <div 
                        key={`doc-${idx}`} 
                        className={`flex items-center px-3 py-1.5 rounded-lg text-sm border transition-all ${doc.error 
                            ? 'bg-red-50/80 text-red-700 border-red-200/60' 
                            : 'bg-white/80 backdrop-blur-sm text-indigo-700 border-indigo-200/60 shadow-sm'
                        }`}
                      >
                        <span className="material-icons-outlined mr-2 text-sm">
                          {doc.error ? 'error_outline' : 'description'}
                        </span>
                        <span className="truncate max-w-[150px]" title={doc.file.name}>
                          {doc.file.name}
                        </span>
                        {doc.isProcessing ? (
                          <div className="ml-2 h-4 w-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                        ) : (
                          <button 
                            onClick={() => removeDocument(doc)}
                            className="ml-2 text-current hover:text-blue-900"
                            title="Remove document"
                          >
                            <span className="material-icons-outlined text-sm">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {imageAttachments.map((img, idx) => (
                      <div 
                        key={`image-${idx}`} 
                        className={`flex items-center px-3 py-1.5 rounded-lg text-sm border transition-all ${img.error 
                            ? 'bg-red-50/80 text-red-700 border-red-200/60' 
                            : 'bg-white/80 backdrop-blur-sm text-purple-700 border-purple-200/60 shadow-sm'
                        }`}
                      >
                        <span className="material-icons-outlined mr-2 text-sm">
                          {img.error ? 'error_outline' : 'image'}
                        </span>
                        <span className="truncate max-w-[150px]" title={img.file.name}>
                          {img.file.name}
                        </span>
                        {img.isProcessing ? (
                          <div className="ml-2 h-4 w-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                        ) : (
                          <button 
                            onClick={() => removeImage(img)}
                            className="ml-2 text-current hover:text-purple-900"
                            title="Remove image"
                          >
                            <span className="material-icons-outlined text-sm">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-gradient-to-r from-slate-50/80 to-indigo-50/30 border-b border-indigo-100/40">
                {isProcessingFile && (
                  <div className="flex items-center text-sm text-slate-600">
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full mr-2"></div>
                    <span>Processing files...</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-gradient-to-r from-white/80 to-indigo-50/30 backdrop-blur-sm">
                <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.txt,.docx,.md,image/*"
                    className="hidden"
                    disabled={isLoading || isProcessingFile}
                    multiple
                    title="Upload documents"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 border border-indigo-200/60 rounded-xl flex items-center justify-center transition-all duration-200"
                    title="Upload documents"
                    disabled={isLoading || isProcessingFile}
                  >
                    <span className="material-icons-outlined">attach_file</span>
                  </button>
                  
                  <div className="relative flex-1">
                    {/* 预览/编辑切换按钮 */}
                    {input.trim() && (
                      <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="absolute right-2 top-2 z-10 p-1 rounded-md text-xs text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
                        title={showPreview ? '编辑' : '预览 Markdown'}
                      >
                        <span className="material-icons-outlined text-sm">
                          {showPreview ? 'edit' : 'visibility'}
                        </span>
                      </button>
                    )}
                    
                    {showPreview && input.trim() ? (
                      /* Markdown 预览模式 */
                      <div 
                        className="min-h-[2.75rem] max-h-[200px] w-full overflow-y-auto p-3 pr-10 rounded-xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 text-slate-700"
                        onClick={() => setShowPreview(false)}
                      >
                        <div className="prose prose-sm max-w-none prose-slate text-slate-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {input}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      /* 编辑模式 - 使用 textarea */
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleTextareaChange}
                        onKeyDown={handleTextareaKeyDown}
                        className="w-full min-h-[2.75rem] max-h-[200px] p-3 pr-10 rounded-xl border border-indigo-200/60 hover:border-indigo-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-transparent shadow-sm bg-white/80 backdrop-blur-sm text-slate-700 resize-none font-mono text-sm"
                        placeholder={inputPlaceholder}
                        rows={1}
                      />
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:via-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-none shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 font-medium"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}