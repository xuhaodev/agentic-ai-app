const TOOLS_CACHE_TTL_MS = Number(process.env.GITHUB_TOOLS_CACHE_TTL_MS ?? 300000);
const GIST_URL = process.env.GITHUB_TOOLS_GIST_URL ?? 'https://gist.github.com/haxudev/614481beb4d227eeebfd4497fe504c71';
const GITHUB_API_BASE = 'https://api.github.com';

function extractGistId(url: string): string {
  const match = url.match(/gist\.github\.com\/[^\/]+\/([a-f0-9]+)/i);
  return match ? match[1] : url;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description?: string;
  systemPromptUrl?: string;
  fallbackSystemPrompt?: string;
}

interface GistFile {
  filename?: string;
  raw_url?: string;
  type?: string;
  truncated?: boolean;
  content?: string;
  description?: string;
}

interface CacheEntry {
  tools: ToolDefinition[];
  expiresAt: number;
}

let cache: CacheEntry | null = null;

function normalizeId(filename: string): string {
  return filename.trim().toLowerCase().replace(/\s+/g, '-');
}

async function fetchGistFiles(refresh = false): Promise<ToolDefinition[]> {
  if (!refresh && cache && cache.expiresAt > Date.now()) {
    return cache.tools;
  }

  if (!GIST_URL) {
    throw new Error('GITHUB_TOOLS_GIST_URL is not configured.');
  }

  const gistId = extractGistId(GIST_URL);
  const url = `${GITHUB_API_BASE}/gists/${gistId}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'agentic-ai-app',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tools gist: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const files: GistFile[] = data.files ? Object.values(data.files as Record<string, GistFile>) : [];

  const tools: ToolDefinition[] = files
    .filter((file) => file && (!file.type || file.type.startsWith('text')))
    .map((file) => {      const id = normalizeId(file.filename ?? '');
      const name = file.filename ?? id;
      const promptUrl = file.raw_url as string | undefined;
      const fallback = file.truncated ? undefined : (file.content as string | undefined)?.trim();

      return {
        id,
        name,
        systemPromptUrl: promptUrl,
        fallbackSystemPrompt: fallback,
      } satisfies ToolDefinition;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  cache = {
    tools,
    expiresAt: Date.now() + TOOLS_CACHE_TTL_MS,
  };

  return tools;
}

export async function getTools(options?: { refresh?: boolean }): Promise<ToolDefinition[]> {
  return fetchGistFiles(options?.refresh === true);
}

export async function getToolById(
  id: string,
  options?: { refresh?: boolean }
): Promise<ToolDefinition | undefined> {
  if (!id) return undefined;
  const tools = await getTools(options);
  return tools.find(tool => tool.id === id) ?? tools[0];
}

export function clearToolsCache() {
  cache = null;
}
