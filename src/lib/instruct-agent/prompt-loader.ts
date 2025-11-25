const CACHE_TTL_MS = Number(process.env.SYSTEM_PROMPT_CACHE_TTL_MS ?? 300000);

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const promptCache = new Map<string, CacheEntry>();

export async function fetchSystemPrompt(url: string, options?: { skipCache?: boolean }): Promise<string> {
  if (!url) {
    throw new Error('System prompt URL is not defined.');
  }

  const skipCache = options?.skipCache ?? false;
  const now = Date.now();

  if (!skipCache) {
    const cached = promptCache.get(url);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch system prompt from ${url}: ${response.status} ${response.statusText}`);
  }

  const text = (await response.text()).trim();
  const entry: CacheEntry = {
    value: text,
    expiresAt: now + CACHE_TTL_MS,
  };
  promptCache.set(url, entry);
  return text;
}

export function clearPromptCache(url?: string) {
  if (url) {
    promptCache.delete(url);
  } else {
    promptCache.clear();
  }
}
