import { NextRequest } from 'next/server';
import { createChatClient } from '@/lib/instruct-agent/azure-client';
import { ChatMessage } from '@/lib/types';
import { getToolById } from '@/lib/instruct-agent/tools-service';

// Using Edge runtime for improved performance with streaming responses
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, prompt, tool, model, imageAttachments = [] } = await req.json();

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
    console.log(`Selected tool: ${selectedTool.name}, System Prompt:`, systemPrompt);
    
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
          
          // Log the total length of the prompt to help diagnose truncation issues
          console.log(`Full prompt length: ${finalUserPrompt.length} characters`);

          // Create streaming chat completion
          const openAIStream = await client.chat.completions.create({
            model: model,
            messages: formattedMessages,
            stream: true,
            stream_options: { include_usage: true }
          });

          // 处理返回的流
          let usage = null;
          for await (const part of openAIStream) {
            const content = part.choices[0]?.delta?.content || '';
            if (content) {
              console.log(`Streaming content chunk: "${content}"`);
              
              // 发送文本内容，确保使用JSON格式化，保持SSE格式规范
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
            }

            if (part.usage) {
              usage = part.usage;
            }
          }

          // 记录使用情况统计
          if (usage) {
            console.log(`Usage Statistics - Prompt tokens: ${usage.prompt_tokens}, Completion tokens: ${usage.completion_tokens}, Total tokens: ${usage.total_tokens}`);
          }

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