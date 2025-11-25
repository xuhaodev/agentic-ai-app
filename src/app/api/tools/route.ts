import { NextResponse } from 'next/server';
import { getTools } from '@/lib/instruct-agent/tools-service';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get('refresh');
    const tools = await getTools({ refresh: refresh === '1' });
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Failed to load tools list:', error);
    return NextResponse.json(
      { error: 'Failed to load tools list' },
      { status: 500 }
    );
  }
}
