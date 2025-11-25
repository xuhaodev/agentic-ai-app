import { NextResponse } from 'next/server';
import { getToolById } from '@/lib/instruct-agent/tools-service';
import { fetchSystemPrompt } from '@/lib/instruct-agent/prompt-loader';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tool: string }> }
) {
  try {
    const resolvedParams = await params;
    const toolId = resolvedParams.tool;
    const tool = await getToolById(toolId);
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const refresh = new URL(request.url).searchParams.get('refresh');
    let prompt: string | undefined;

    if (tool.systemPromptUrl) {
      prompt = await fetchSystemPrompt(tool.systemPromptUrl, {
        skipCache: refresh === '1',
      });
    }

    if (!prompt || prompt.length === 0) {
      prompt = tool.fallbackSystemPrompt ?? '';
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Failed to load system prompt:', error);
    return NextResponse.json(
      { error: 'Failed to load system prompt' },
      { status: 500 }
    );
  }
}
