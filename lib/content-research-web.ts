import { RESEARCH_POSTS_FETCH_LIMIT } from "@/lib/content-research-enrich";
import { hasJustOneApiConfigured } from "@/lib/justoneapi-client";
import { searchPlatformPostsByKeyword } from "@/lib/justoneapi-platform-search";
import type { ContentPlatform, ContentResearchMediaFilter, ContentResearchPost } from "@/lib/content-research-types";
import type { PromptMarket } from "@/lib/prompt-variables";
import { webSearch, webSearchApiKey, type WebSearchResult } from "@/lib/web-search";

export type ContentResearchWebBundle = {
  queries: string[];
  results: WebSearchResult[];
  posts?: ContentResearchPost[];
  provider: "tavily" | "serper" | "justoneapi";
  /** Set when Just One API failed and Tavily was used instead. */
  fallbackWarning?: string;
};

function platformSiteHint(platform: ContentPlatform): string {
  switch (platform) {
    case "xiaohongshu":
      return "site:xiaohongshu.com OR 小红书";
    case "instagram":
      return "site:instagram.com";
    case "tiktok":
      return "site:tiktok.com";
    case "facebook":
      return "site:facebook.com";
  }
}

export function buildPlatformSearchQueries(
  topic: string,
  platform: ContentPlatform,
): string[] {
  const t = topic.trim();
  const site = platformSiteHint(platform);
  switch (platform) {
    case "xiaohongshu":
      return [
        `${site} ${t} 爆款 筆記 標題`,
        `小紅書 ${t} 熱門 內容 收藏`,
        `xiaohongshu ${t} popular post hook caption`,
      ];
    case "instagram":
      return [
        `${site} ${t} viral reel hook caption`,
        `instagram ${t} carousel post ideas 2025`,
        `${t} instagram marketing post examples`,
      ];
    case "tiktok":
      return [
        `${site} ${t} viral script hook`,
        `tiktok ${t} trending video caption`,
        `${t} tiktok content ideas short form`,
      ];
    case "facebook":
      return [
        `${site} ${t} post engagement ad copy`,
        `facebook ${t} marketing post examples`,
        `${t} facebook carousel ad hook`,
      ];
  }
}

function dedupeResults(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];
  for (const r of results) {
    const key = r.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function postsToWebResults(posts: ContentResearchPost[]): WebSearchResult[] {
  return posts.map((p) => ({
    title: p.title,
    url: p.url,
    snippet: [
      p.snippet,
      p.author ? `作者: ${p.author}` : "",
      p.collects != null ? `收藏: ${p.collects}` : "",
      p.likes != null ? `讚: ${p.likes}` : "",
      p.comments != null ? `評論: ${p.comments}` : "",
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 600),
  }));
}

async function fetchJustOneApiResearch(
  topic: string,
  platform: ContentPlatform,
  market?: PromptMarket,
  mediaFilter?: ContentResearchMediaFilter,
): Promise<ContentResearchWebBundle> {
  const { posts, endpoint } = await searchPlatformPostsByKeyword(platform, topic, {
    limit: RESEARCH_POSTS_FETCH_LIMIT,
    market,
    mediaFilter,
  });
  return {
    queries: [`justoneapi:${endpoint} keyword=${topic}`],
    results: postsToWebResults(posts),
    posts,
    provider: "justoneapi",
  };
}

async function fetchTavilyResearch(
  topic: string,
  platform: ContentPlatform,
): Promise<ContentResearchWebBundle> {
  const queries = buildPlatformSearchQueries(topic, platform);
  const batches = await Promise.all(
    queries.map((q) => webSearch(q, 6).catch(() => [] as WebSearchResult[])),
  );
  const merged = dedupeResults(batches.flat()).slice(0, 18);

  if (merged.length < 2) {
    throw new Error(
      "Web search returned too few results for this topic. Try a broader keyword or another platform.",
    );
  }

  const creds = webSearchApiKey();
  return {
    queries,
    results: merged,
    provider: creds?.provider ?? "tavily",
  };
}

export function hasLiveContentResearchConfigured(_platform: ContentPlatform): boolean {
  if (hasJustOneApiConfigured()) return true;
  return webSearchApiKey() !== null;
}

function formatJustOneApiFallbackWarning(platform: ContentPlatform, error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("permission") || lower.includes("600")) {
    return `Just One API 未開通 ${platform} 搜尋權限（code 600，不是餘額問題）。你已有充值也仍會出現此錯誤 — 請到 dashboard 的 API 列表開通「小紅書 note search」等 endpoint，或聯繫客服開通。目前改用公開網頁搜尋，無貼文封面。`;
  }
  if (lower.includes("balance") || lower.includes("601")) {
    return `Just One API 餘額不足（code 601）— 請到 dashboard 充值。目前改用公開網頁搜尋，無貼文封面。`;
  }
  if (lower.includes("602") || lower.includes("budget")) {
    return `Just One API token 用量上限已滿（code 602）— 請在 dashboard 提高 token 預算。目前改用公開網頁搜尋，無貼文封面。`;
  }
  return `Just One API 失敗（${error}）— 已改用公開網頁搜尋，無貼文封面。`;
}

export async function fetchPlatformWebResearch(
  topic: string,
  platform: ContentPlatform,
  market?: PromptMarket,
  mediaFilter?: ContentResearchMediaFilter,
): Promise<ContentResearchWebBundle> {
  if (hasJustOneApiConfigured()) {
    try {
      return await fetchJustOneApiResearch(topic, platform, market, mediaFilter);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (mediaFilter === "video") {
        throw new Error(
          `影片搜尋暫時失敗（${msg}）。請再搜尋一次 — 影片模式必須用平台 API 取得 MP4，唔可以用網頁後備搜尋。`,
        );
      }
      if (!webSearchApiKey()) throw e;
      console.warn(`[content-research] Just One API (${platform}) failed, falling back to Tavily:`, msg);
      const tavily = await fetchTavilyResearch(topic, platform);
      return {
        ...tavily,
        fallbackWarning: formatJustOneApiFallbackWarning(platform, msg),
      };
    }
  }
  if (mediaFilter === "video") {
    throw new Error(
      "影片模式需要設定 JUSTONEAPI_TOKEN — 網頁搜尋無法下載參考 MP4。",
    );
  }
  return fetchTavilyResearch(topic, platform);
}

export function formatWebSnippetsForPrompt(results: WebSearchResult[]): string {
  return results
    .map((r, i) => {
      const snippet = (r.snippet || "(no snippet)").slice(0, 280);
      return [
        `[${i + 1}] ${r.title || "Untitled"}`,
        `URL: ${r.url}`,
        `Snippet: ${snippet}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function formatPostsForPrompt(posts: ContentResearchPost[]): string {
  return posts
    .map((p, i) => {
      const stats = [
        p.collects != null ? `collects=${p.collects}` : "",
        p.likes != null ? `likes=${p.likes}` : "",
        p.comments != null ? `comments=${p.comments}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      return [
        `[post ${i + 1}] ${p.title}`,
        `URL: ${p.url}`,
        p.author ? `Author: ${p.author}` : "",
        p.mediaType ? `Media: ${p.mediaType}` : "",
        p.imageUrls?.length ? `Images: ${p.imageUrls.length} slides` : "",
        stats ? `Engagement: ${stats}` : "",
        p.snippet ? `Body: ${p.snippet.slice(0, 220)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}
