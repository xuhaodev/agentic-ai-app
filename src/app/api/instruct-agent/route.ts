import { NextRequest } from 'next/server';
import { createChatClient } from '@/lib/instruct-agent/azure-client';
import { ChatMessage } from '@/lib/types';
import { getToolById } from '@/lib/instruct-agent/tools-service';
import { getMCPServerById } from '@/lib/mcp/servers';
import { MCPClient, mcpToolToOpenAIFunction, parseOpenAIFunctionName, mcpResultToText } from '@/lib/mcp/client';
import { MCPTool } from '@/lib/mcp/types';

// Using Edge runtime for improved performance with streaming responses
export const runtime = 'edge';

// MCP 客户端缓存 (Edge runtime 中的内存缓存)
const mcpClientCache = new Map<string, MCPClient>();

async function getOrCreateMCPClient(serverId: string): Promise<MCPClient | null> {
  let client = mcpClientCache.get(serverId);
  
  if (client && client.isInitialized()) {
    return client;
  }
  
  const serverConfig = getMCPServerById(serverId);
  if (!serverConfig) {
    console.error(`MCP Server not found: ${serverId}`);
    return null;
  }
  
  try {
    client = new MCPClient(serverConfig);
    await client.initialize();
    mcpClientCache.set(serverId, client);
    return client;
  } catch (error) {
    console.error(`Failed to initialize MCP client for ${serverId}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, prompt, tool, model, imageAttachments = [], enabledMCPServers = [] } = await req.json();

    const hasPrompt = typeof prompt === 'string' && prompt.trim().length > 0;
    const hasImageAttachments = Array.isArray(imageAttachments) && imageAttachments.length > 0;

    if (!messages || (!hasPrompt && !hasImageAttachments) || !tool || !model) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the selected tool and system prompt
    const selectedTool = await getToolById(tool);
    if (!selectedTool) {
      return new Response(
        JSON.stringify({ error: 'Selected tool not found' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 准备 MCP 工具
    const mcpTools: { type: 'function'; function: { name: string; description?: string; parameters: Record<string, unknown> } }[] = [];
    const mcpServerMap = new Map<string, { client: MCPClient; tools: MCPTool[] }>();
    
    // 连接启用的 MCP 服务器并获取工具
    const enabledServerIds: string[] = Array.isArray(enabledMCPServers) ? enabledMCPServers : [];
    for (const serverId of enabledServerIds) {
      const client = await getOrCreateMCPClient(serverId);
      if (client) {
        const tools = client.getTools();
        mcpServerMap.set(serverId, { client, tools });
        
        // 将 MCP 工具转换为 OpenAI 函数格式
        for (const mcpTool of tools) {
          mcpTools.push(mcpToolToOpenAIFunction(serverId, mcpTool));
        }
        
        console.log(`[MCP] Server ${serverId}: ${tools.length} tools loaded`);
      }
    }

    const systemPromptPreview = systemPrompt.length > 100 
      ? `${systemPrompt.substring(0, 100)}...` 
      : systemPrompt;
    console.log(`[Instruct Agent] Tool: ${selectedTool.name}, System Prompt: ${systemPromptPreview} (${systemPrompt.length} chars)`);
    console.log(`[Instruct Agent] MCP Tools available: ${mcpTools.length}`);
    
    
    // Check if prompt contains document context
    const hasDocumentContext = prompt.includes("==== DOCUMENT CONTEXT ====");
    console.log(`Prompt contains document context: ${hasDocumentContext}`);
    if (hasDocumentContext) {
      // Extract some sample of the document content for logging
      const contextStart = prompt.indexOf("==== DOCUMENT CONTEXT ====");
      const contextEnd = prompt.indexOf("==== END OF DOCUMENT CONTEXT ====");
      if (contextStart > -1 && contextEnd > -1) {
        const docSample = prompt.substring(contextStart, contextStart + 200) + "...";
        console.log("Document context sample:", docSample);
        
        // Count how many documents are included
        const docCount = (prompt.match(/\[Document \d+:/g) || []).length;
        console.log(`Number of documents included: ${docCount}`);
      }
    }

    // Create a ReadableStream for SSE output
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Initialize clients
          const endpoint = process.env.GITHUB_MODEL_ENDPOINT ?? 'https://models.github.ai/inference';
          const token = process.env.GITHUB_TOKEN;

          if (!token) {
            throw new Error('Missing GITHUB_TOKEN environment variable.');
          }

          const client = createChatClient(endpoint, token);

          const normalizedPrompt = typeof prompt === 'string' ? prompt : '';
          const finalUserPrompt = normalizedPrompt;

          type IncomingImageAttachment = {
            base64?: string;
            mimeType?: string;
            dataUrl?: string;
            name?: string;
          };

          const normalizedImageAttachments = Array.isArray(imageAttachments) ? imageAttachments : [];
          const userContentParts: Array<
            { type: 'text'; text: string } |
            { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
          > = [];

          if (finalUserPrompt.trim().length > 0) {
            userContentParts.push({ type: 'text', text: finalUserPrompt });
          }

          const attachmentsForProcessing = normalizedImageAttachments as Array<Partial<IncomingImageAttachment>>;

          const resolvedImageAttachments = attachmentsForProcessing
            .map((attachment, index) => {
              if (!attachment) {
                return null;
              }

              const { base64, mimeType, dataUrl } = attachment;

              if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                console.log(`Using provided data URL for image attachment #${index + 1}`);
                return { url: dataUrl };
              }

              if (typeof base64 === 'string' && base64.trim().length > 0) {
                const resolvedMime = typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg';
                const url = `data:${resolvedMime};base64,${base64}`;
                console.log(`Constructed data URL for image attachment #${index + 1} with mime type ${resolvedMime}`);
                return { url };
              }

              console.warn(`Image attachment #${index + 1} missing base64 data; skipping.`);
              return null;
            })
            .filter((entry): entry is { url: string } => Boolean(entry));

          if (resolvedImageAttachments.length > 0) {
            console.log(`Including ${resolvedImageAttachments.length} image attachment(s) in request.`);
          }

          resolvedImageAttachments.forEach(({ url }) => {
            userContentParts.push({
              type: 'image_url',
              image_url: { url, detail: 'high' }
            });
          });

          if (userContentParts.length === 0) {
            userContentParts.push({ type: 'text', text: ' ' });
          }

          const userMessageContent = userContentParts.length === 1 && userContentParts[0].type === 'text'
            ? userContentParts[0].text
            : userContentParts;

          // Prepare chat messages
          const formattedMessages = [
            // System prompt always comes first
            { role: 'system', content: systemPrompt },
            // Add message history (excluding system messages)
            ...messages.filter((m: ChatMessage) => m.role !== 'system').map((msg: ChatMessage) => ({
              role: msg.role as "system" | "user" | "assistant",
              content: msg.content
            })),
            // Add current user message with context (if any)
            { 
              role: 'user', 
              content: userMessageContent
            }
          ];

          console.log('Final chat messages:');
          formattedMessages.slice(0, Math.min(3, formattedMessages.length)).forEach((msg, i) => {
            let preview = '';
            if (typeof msg.content === 'string') {
              preview = `${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`;
            } else if (Array.isArray(msg.content)) {
              const partsPreview = msg.content.map((part: { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: string } }) => {
                if (part.type === 'text') {
                  const textValue = part.text ?? '';
                  return textValue.substring(0, 30);
                }
                if (part.type === 'image_url') {
                  return '[image]';
                }
                return '[content]';
              }).join(' | ');
              preview = partsPreview.substring(0, 50);
            }
            console.log(`[${i}] ${msg.role}: ${preview}`);
          });
          
          // 初始化统计变量
          let usage = null;
          let totalOutputChars = 0;
          let chunkCount = 0;

          // Log the total length of the prompt to help diagnose truncation issues
          console.log(`Full prompt length: ${finalUserPrompt.length} characters`);

          // 准备请求参数
          const hasMCPTools = mcpTools.length > 0;
          
          // 工具调用循环的消息历史
          const conversationMessages = [...formattedMessages];
          
          // 最大工具调用轮次，防止无限循环
          const MAX_TOOL_ITERATIONS = 10;
          let toolIterations = 0;
          
          // 执行工具调用循环
          while (toolIterations < MAX_TOOL_ITERATIONS) {
            toolIterations++;
            
            // 创建聊天完成请求参数
            const baseOptions = {
              model: model,
              messages: conversationMessages,
              stream: true as const,
              stream_options: { include_usage: true },
            };
            
            // 如果有 MCP 工具，添加到请求中
            const requestOptions = hasMCPTools 
              ? { ...baseOptions, tools: mcpTools, tool_choice: 'auto' as const }
              : baseOptions;
            
            const openAIStream = await client.chat.completions.create(requestOptions as any) as unknown as AsyncIterable<any>;

            // 处理返回的流
            let assistantContent = '';
            const toolCalls: Array<{
              id: string;
              type: 'function';
              function: { name: string; arguments: string };
            }> = [];
            let currentToolCall: { id: string; type: 'function'; function: { name: string; arguments: string } } | null = null;
            
            for await (const part of openAIStream) {
              const choice = part.choices[0];
              
              if (!choice) continue;
              
              // 处理文本内容
              const content = choice.delta?.content || '';
              if (content) {
                assistantContent += content;
                totalOutputChars += content.length;
                chunkCount++;
                
                // 发送文本内容
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
              }
              
              // 处理工具调用
              const deltaToolCalls = choice.delta?.tool_calls;
              if (deltaToolCalls) {
                for (const deltaTC of deltaToolCalls) {
                  if (deltaTC.id) {
                    // 新的工具调用开始
                    if (currentToolCall) {
                      toolCalls.push(currentToolCall);
                    }
                    currentToolCall = {
                      id: deltaTC.id,
                      type: 'function',
                      function: {
                        name: deltaTC.function?.name || '',
                        arguments: deltaTC.function?.arguments || '',
                      },
                    };
                  } else if (currentToolCall) {
                    // 继续当前工具调用
                    if (deltaTC.function?.name) {
                      currentToolCall.function.name += deltaTC.function.name;
                    }
                    if (deltaTC.function?.arguments) {
                      currentToolCall.function.arguments += deltaTC.function.arguments;
                    }
                  }
                }
              }

              if (part.usage) {
                usage = part.usage;
              }
            }
            
            // 保存最后一个工具调用
            if (currentToolCall) {
              toolCalls.push(currentToolCall);
            }
            
            // 如果没有工具调用，退出循环
            if (toolCalls.length === 0) {
              break;
            }
            
            console.log(`[MCP] Tool calls in iteration ${toolIterations}:`, toolCalls.map(tc => tc.function.name));
            
            // 将助手消息（包含工具调用）添加到对话历史
            conversationMessages.push({
              role: 'assistant',
              content: assistantContent || null,
              tool_calls: toolCalls,
            } as any);
            
            // 执行每个工具调用
            for (const toolCall of toolCalls) {
              const functionName = toolCall.function.name;
              const parsed = parseOpenAIFunctionName(functionName);
              
              if (!parsed) {
                console.error(`[MCP] Invalid function name format: ${functionName}`);
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: `Error: Invalid function name format: ${functionName}`,
                } as any);
                continue;
              }
              
              const { serverId, toolName } = parsed;
              const serverInfo = mcpServerMap.get(serverId);
              
              if (!serverInfo) {
                console.error(`[MCP] Server not found: ${serverId}`);
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: `Error: MCP server not found: ${serverId}`,
                } as any);
                continue;
              }
              
              try {
                // 解析工具参数
                let args: Record<string, unknown> = {};
                if (toolCall.function.arguments) {
                  try {
                    args = JSON.parse(toolCall.function.arguments);
                  } catch (parseError) {
                    console.error(`[MCP] Failed to parse tool arguments:`, parseError);
                  }
                }
                
                console.log(`[MCP] Calling tool: ${serverId}/${toolName}`, args);
                
                // 发送工具调用状态到客户端
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  serverId,
                  toolName,
                  status: 'running',
                })}\n\n`));
                
                // 执行工具调用
                const result = await serverInfo.client.callTool({
                  name: toolName,
                  arguments: args,
                });
                
                const resultText = mcpResultToText(result);
                console.log(`[MCP] Tool result (${serverId}/${toolName}):`, resultText.substring(0, 200));
                
                // 发送工具调用完成状态
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  serverId,
                  toolName,
                  status: 'completed',
                  preview: resultText.substring(0, 100),
                })}\n\n`));
                
                // 将工具结果添加到对话历史
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: resultText || 'Tool executed successfully with no output.',
                } as any);
                
              } catch (toolError) {
                console.error(`[MCP] Tool call error (${serverId}/${toolName}):`, toolError);
                
                const errorMsg = toolError instanceof Error ? toolError.message : 'Unknown error';
                
                // 发送工具调用错误状态
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  serverId,
                  toolName,
                  status: 'error',
                  error: errorMsg,
                })}\n\n`));
                
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: `Error calling tool: ${errorMsg}`,
                } as any);
              }
            }
          }
          
          if (toolIterations >= MAX_TOOL_ITERATIONS) {
            console.warn(`[MCP] Max tool iterations (${MAX_TOOL_ITERATIONS}) reached`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'warning',
              message: '已达到最大工具调用次数限制',
            })}\n\n`));
          }

          // 输出诊断摘要
          console.log(`\n[Instruct Agent] === Response Summary ===`);
          console.log(`  Output: ${totalOutputChars} chars in ${chunkCount} chunks`);
          console.log(`  Tool iterations: ${toolIterations}`);
          if (usage) {
            console.log(`  Tokens: input=${usage.prompt_tokens}, output=${usage.completion_tokens}, total=${usage.total_tokens}`);
          }
          console.log(`[Instruct Agent] ========================\n`);

          // 完成后关闭流
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      }
    });

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request handling error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}