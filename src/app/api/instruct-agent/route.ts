import { NextRequest } from 'next/server';
import { createSearchClient, createModelClient, isUnexpected } from '@/lib/instruct-agent/azure-client';
import { ChatMessage } from '@/lib/types';
import { getToolById } from '@/lib/instruct-agent/tools-config';
import OpenAI from 'openai';

// Using Edge runtime for improved performance with streaming responses
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, prompt, tool, model, webSearchEnabled } = await req.json();

    if (!messages || !prompt || !tool || !model) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the selected tool and system prompt
    const selectedTool = getToolById(tool);
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
          // 客户端在此不初始化，后面按模型分类调用

          // Prepare messages for the API call
          const formattedMessages: ChatMessage[] = [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...messages,
            { role: 'user', content: prompt }
          ];

          // 根据模型类型调用不同客户端
          let reply: string;
          // 所有含 '/' 的模型（openai/*, deepseek/* 等）都走 GitHub inference
          const isGitHubModel = model.includes('/');
          if (isGitHubModel) {
            // GitHub OpenAI 模型，使用官方 SDK
            const openaiClient = new OpenAI({ baseURL: process.env.GITHUB_INFERENCE_ENDPOINT!, apiKey: process.env.GITHUB_TOKEN! });
            const ghRes = await openaiClient.chat.completions.create({
              model: model,
              messages: formattedMessages,
              temperature: 1.0,
              top_p: 1.0
            });
            reply = ghRes.choices[0].message.content ?? '';
          } else {
            // Azure OpenAI 模型，使用 REST 客户端调用
            const azureClient = createModelClient(
              process.env.AZURE_OPENAI_ENDPOINT!,
              process.env.OPENAI_API_KEY!
            );
            const azRes = await azureClient.path('/chat/completions').post({
              queryParameters: { 'api-version': '2024-12-01-preview' },
              body: {
                model,
                messages: formattedMessages,
                temperature: 1.0,
                top_p: 1.0
              }
            });
            if (isUnexpected(azRes)) {
              const errMsg = (azRes.body as any).error?.message || JSON.stringify(azRes.body);
              throw new Error(errMsg);
            }
            reply = azRes.body.choices[0].message.content ?? '';
          }
           // Send the assistant reply as one SSE event
           controller.enqueue(encoder.encode(`data: ${JSON.stringify(reply)}\n\n`));
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