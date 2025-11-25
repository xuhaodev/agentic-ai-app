'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [componentHeight, setComponentHeight] = useState('calc(100vh - 220px)');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const richTextInputRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const selectedToolRef = useRef<string | null>(null);

  // Calculate and update component height
  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight;
      const headerHeight = 100; // Header + padding
      const errorHeight = error ? 80 : 0; // Error message height if present
      const paddingBottom = 40;
      
      const availableHeight = vh - headerHeight - errorHeight - paddingBottom;
      setComponentHeight(`${availableHeight}px`);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [error]);

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

  const handleEditorInput = (event: React.FormEvent<HTMLDivElement>) => {
    const textContent = event.currentTarget.innerText.replace(/\u00a0/g, ' ');
    setInput(textContent);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      const textContent = event.currentTarget.innerText.replace(/\u00a0/g, ' ');
      const hasContext = documentContext.some(doc => doc.content && !doc.error) ||
        imageAttachments.some(img => img.base64 && !img.error);

      if (isLoading || (textContent.trim() === '' && !hasContext)) {
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
    if (richTextInputRef.current) {
      richTextInputRef.current.innerHTML = '';
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
      <div className="prose prose-sm max-w-none prose-gray dark:prose-invert font-medium text-gray-900">
        <ReactMarkdown
          components={{
            // Properly handle paragraphs
            p: ({ children }) => (
              <p className="mb-4 last:mb-0">{children}</p>
            ),
            // Handle headings with high contrast
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold text-gray-800 mb-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold text-gray-800 mb-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold text-gray-800 mb-2">{children}</h4>
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
                <div className="relative group">
                  <button
                    onClick={() => copyToClipboard(codeContent)}
                    className="absolute right-2 top-2 p-1 rounded bg-gray-700 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy code"
                  >
                    <span className="material-icons-outlined text-sm">content_copy</span>
                  </button>
                  <SyntaxHighlighter
                    {...props}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md"
                  >
                    {codeContent.replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code {...props} className={`${className} bg-gray-200 text-gray-900 rounded px-1 py-0.5`}>
                  {children}
                </code>
              );
            }
          }}
          remarkPlugins={[remarkGfm, remarkBreaks]}
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
    <main className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 px-4 ${
      isExpanded ? 'ml-64' : 'ml-16'
    } transition-all duration-300`}>
      <div className="w-full mx-auto flex flex-col h-screen">

        <div className="flex justify-between items-center bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 z-0"></div>
          
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent relative z-10">
            Instruct Agent
          </h1>
          <div className="flex gap-4 relative z-10">
            <div className="relative border-2 border-gray-200 hover:border-blue-400 transition-colors rounded-lg shadow-sm">
              <select
                value={selectedTool?.id ?? ''}
                onChange={handleToolChange}
                disabled={isLoadingTools || tools.length === 0}
                className="appearance-none bg-white px-4 py-2 pr-8 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
                aria-label="Select tool"
                title="Select tool"
              >
                {tools.length === 0 ? (
                  <option value="">{isLoadingTools ? '加载工具中...' : '无可用工具'}</option>
                ) : (
                  tools.map(tool => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
            
            <div className="relative border-2 border-gray-200 hover:border-blue-400 transition-colors rounded-lg shadow-sm">
              <select
                value={selectedModel.id}
                onChange={(e) => setSelectedModel(models.find(m => m.id === e.target.value) || models[0])}
                className="appearance-none bg-white px-4 py-2 pr-8 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                aria-label="Select model"
                title="Select model"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-lg shadow-sm mb-4">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 gap-4 mb-4" style={{ height: componentHeight }}>
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-lg flex flex-col w-1/3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 z-0"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="material-icons-outlined text-blue-600">edit_note</span>
                <p className="text-sm font-medium text-gray-700">System Prompt:</p>
                {isPromptLoading && (
                  <span className="text-xs text-blue-600">加载中...</span>
                )}
                {!isPromptLoading && promptError && (
                  <span className="text-xs text-red-500 sm:hidden">{promptError}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {promptError && (
                  <span className="hidden text-xs text-red-500 sm:inline">{promptError}</span>
                )}
                <button
                  onClick={resetPrompt}
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors hover:bg-blue-50 px-2 py-1 rounded"
                >
                  从 GitHub 重新加载
                </button>
              </div>
            </div>
            <div className="flex-1 relative z-10 overflow-auto">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="instruction-template w-full h-full p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-800 font-medium resize-none shadow-inner"
                placeholder="Enter system prompt..."
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden flex-1 flex flex-col relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 z-0"></div>
            <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center relative z-10">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="material-icons-outlined text-blue-600">chat</span>
                <span>Chat History</span>
              </div>
              <button 
                onClick={() => setMessages([])}
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors hover:bg-blue-50 px-2 py-1 rounded"
                title="Clear chat history"
              >
                Clear Chat
              </button>
            </div>
            
            <div 
              ref={chatContainerRef}
              className="p-4 space-y-4 flex-1 overflow-y-auto scroll-smooth relative z-10"
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`group relative p-4 rounded-lg max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none user-message shadow-md' 
                        : msg.role === 'system'
                        ? 'bg-gray-100 text-gray-700 border border-gray-200'
                        : 'bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 border border-blue-300 hover:border-blue-400 shadow-md assistant-message'
                    }`}
                  >
                    {msg.role !== 'system' && (
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        className="absolute right-2 top-2 p-1 rounded-full bg-gray-700/20 text-current opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 mt-auto relative z-10">
              {hasContextItems && (
                <div className="p-3 bg-blue-50 border-b border-blue-200">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium text-blue-700">Context Attachments</h3>
                    <button 
                      onClick={() => {
                        setDocumentContext([]);
                        setImageAttachments([]);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-100 px-2 py-1 rounded"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1">
                    {documentContext.map((doc, idx) => (
                      <div 
                        key={`doc-${idx}`} 
                        className={`flex items-center px-3 py-1 rounded-lg text-sm border ${
                          doc.error 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
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
                        className={`flex items-center px-3 py-1 rounded-lg text-sm border ${
                          img.error 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-purple-50 text-purple-700 border-purple-200'
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

              <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                {isProcessingFile && (
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full mr-2"></div>
                    <span>Processing files...</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100">
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
                    className="p-2 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    title="Upload documents"
                    disabled={isLoading || isProcessingFile}
                  >
                    <span className="material-icons-outlined">attach_file</span>
                  </button>
                  
                  <div className="relative flex-1">
                    <div
                      ref={richTextInputRef}
                      className="rich-text-input flex-1 min-h-[2.75rem] max-h-[4.5rem] w-full overflow-y-auto p-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-inner whitespace-pre-wrap break-words"
                      contentEditable
                      onInput={handleEditorInput}
                      onKeyDown={handleEditorKeyDown}
                      role="textbox"
                      aria-multiline="true"
                      aria-label="Message input"
                      tabIndex={0}
                      data-placeholder={inputPlaceholder}
                      suppressContentEditableWarning
                    />
                    {isInputEmpty && (
                      <div className="pointer-events-none absolute left-3 top-2 text-gray-400 select-none">
                        {inputPlaceholder}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-none"
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