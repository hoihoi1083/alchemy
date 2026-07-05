export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

const SEARCH_TIMEOUT_MS = 14_000;

export function webSearchApiKey(): { provider: "tavily" | "serper"; key: string } | null {
  const tavily = process.env.TAVILY_API_KEY?.trim();
  if (tavily && tavily !== "your_tavily_key_here") {
    return { provider: "tavily", key: tavily };
  }
  const serper = process.env.SERPER_API_KEY?.trim();
  if (serper && serper !== "your_serper_key_here") {
    return { provider: "serper", key: serper };
  }
  return null;
}

export function hasWebSearchConfigured(): boolean {
  return webSearchApiKey() !== null;
}

async function searchTavily(query: string, apiKey: string, maxResults: number): Promise<WebSearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: Math.min(maxResults, 10),
        include_answer: false,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`Tavily search failed (${res.status}): ${raw.slice(0, 200)}`);
    }
    const data = JSON.parse(raw) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    return (data.results ?? [])
      .map((r) => ({
        title: String(r.title ?? "").trim(),
        url: String(r.url ?? "").trim(),
        snippet: String(r.content ?? "").trim().slice(0, 600),
      }))
      .filter((r) => r.url && (r.title || r.snippet));
  } finally {
    clearTimeout(timer);
  }
}

async function searchSerper(query: string, apiKey: string, maxResults: number): Promise<WebSearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        q: query,
        num: Math.min(maxResults, 10),
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`Serper search failed (${res.status}): ${raw.slice(0, 200)}`);
    }
    const data = JSON.parse(raw) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    return (data.organic ?? [])
      .map((r) => ({
        title: String(r.title ?? "").trim(),
        url: String(r.link ?? "").trim(),
        snippet: String(r.snippet ?? "").trim().slice(0, 600),
      }))
      .filter((r) => r.url && (r.title || r.snippet));
  } finally {
    clearTimeout(timer);
  }
}

export async function webSearch(
  query: string,
  maxResults = 8,
): Promise<WebSearchResult[]> {
  const creds = webSearchApiKey();
  if (!creds) {
    throw new Error(
      "Live web research needs TAVILY_API_KEY or SERPER_API_KEY in .env.local (see .env.example).",
    );
  }
  if (creds.provider === "tavily") {
    return searchTavily(query, creds.key, maxResults);
  }
  return searchSerper(query, creds.key, maxResults);
}
