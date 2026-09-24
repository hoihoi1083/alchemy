/**
 * Category broaden for research keyword search.
 * When a specific product phrase returns thin/empty results, search a parent
 * category (e.g. 上海鮮肉月餅 → 月餅) and merge distinct posts.
 */
import type { ContentResearchPost } from "@/lib/content-research-types";

/** Fill when unique posts are below the live angle target (SSOT for RESEARCH_LIVE_ANGLE_COUNT). */
export const RESEARCH_THIN_POSTS_THRESHOLD = 9;

function normalizePhrase(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function phraseKey(value: string): string {
  return normalizePhrase(value).toLowerCase();
}

/** Cheap offline broadeners when DeepSeek is unavailable. */
export function heuristicCategoryKeywords(keyword: string): string[] {
  const t = normalizePhrase(keyword);
  if (!t) return [];
  const out: string[] = [];
  const add = (value: string) => {
    const phrase = normalizePhrase(value);
    if (phrase.length < 2) return;
    if (phraseKey(phrase) === phraseKey(t)) return;
    if (!out.some((p) => phraseKey(p) === phraseKey(phrase))) out.push(phrase);
  };

  const hanRuns = t.match(/[\u3400-\u9fff]+/g) ?? [];
  const han = hanRuns.join("");
  if (han.length >= 4) {
    add(han.slice(-2));
    if (han.length >= 6) add(han.slice(-3));
  }

  const latinWords = t.match(/[A-Za-z]{3,}/g) ?? [];
  if (latinWords.length >= 2) {
    add(latinWords[latinWords.length - 1]!);
  }

  return out.slice(0, 2);
}

function isMeaningfullyBroader(original: string, category: string): boolean {
  const o = phraseKey(original);
  const c = phraseKey(category);
  if (!c || c === o) return false;
  // Substring parent (上海鮮肉月餅 → 月餅) or clearly shorter phrase.
  if (o.includes(c) && c.length < o.length) return true;
  if (c.length <= Math.max(2, Math.floor(o.length * 0.75))) return true;
  // Cross-script category (CJK → English mooncake, or EN → 月餅) is allowed.
  const oHan = /[\u3400-\u9fff]/.test(o);
  const cHan = /[\u3400-\u9fff]/.test(c);
  if (oHan !== cHan) return true;
  return false;
}

/**
 * Broader category phrases for social search (DeepSeek + heuristic).
 * Soft-fail: heuristic only when DeepSeek is unavailable.
 */
export async function extractCategoryKeywords(keyword: string): Promise<string[]> {
  const original = normalizePhrase(keyword);
  if (!original) return [];

  const out: string[] = [];
  const add = (value: string) => {
    const phrase = normalizePhrase(value);
    if (!isMeaningfullyBroader(original, phrase)) return;
    if (!out.some((p) => phraseKey(p) === phraseKey(phrase))) out.push(phrase);
  };

  const { callDeepSeekChat, deepSeekApiKey } = await import("@/lib/deepseek-client");
  if (deepSeekApiKey()) {
    try {
      const raw = await callDeepSeekChat(
        [
          {
            role: "system",
            content:
              'Broaden this product/search phrase into a shorter PARENT category for social search when the specific phrase finds few posts. Reply JSON only: {"categories":["月餅","mooncake"]}. Keep the same script family as the input when it is Chinese (prefer Simplified for mainland platforms). For English input prefer short English categories. Max 2. Must be meaningfully broader/shorter — never return the original phrase or a synonym of equal length.',
          },
          { role: "user", content: original.slice(0, 80) },
        ],
        { temperature: 0.2, max_tokens: 80, jsonObject: true },
      );
      const parsed = JSON.parse(raw) as { categories?: unknown };
      const list = Array.isArray(parsed.categories) ? parsed.categories : [];
      for (const entry of list) {
        if (typeof entry === "string") add(entry);
        if (out.length >= 2) break;
      }
    } catch (err) {
      console.warn("[content-research] category extract failed:", err);
    }
  }

  for (const h of heuristicCategoryKeywords(original)) {
    add(h);
    if (out.length >= 2) break;
  }

  return out.slice(0, 2);
}

export function researchPostDedupeKey(post: ContentResearchPost): string {
  // Prefer URL so two API rows with different ids but the same post collapse.
  const url = post.url.replace(/\/$/, "").split("?")[0]?.toLowerCase() ?? "";
  if (url) return `${post.platform}:url:${url}`;
  const id = post.id?.trim();
  // Synthetic map* ids restart at 1 per search — never use them as merge keys.
  const isFallbackId = id ? /^(xhs|ig|tiktok|fb)-\d+$/i.test(id) : false;
  if (id && !isFallbackId) return `${post.platform}:id:${id.toLowerCase()}`;
  const cover = post.coverImageUrl?.trim().toLowerCase();
  if (cover) return `${post.platform}:cover:${cover}`;
  return `${post.platform}:title:${post.title.toLowerCase()}`;
}

/** Merge category posts after primary hits — primary order wins. */
export function mergeResearchPosts(
  primary: ContentResearchPost[],
  extra: ContentResearchPost[],
  limit: number,
): ContentResearchPost[] {
  const seen = new Set<string>();
  const out: ContentResearchPost[] = [];
  for (const post of [...primary, ...extra]) {
    const key = researchPostDedupeKey(post);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
    if (out.length >= limit) break;
  }
  return out;
}

/** How many LLM angles to request for a live Just One result set. */
export function liveResearchAngleCount(postCount: number): number {
  if (postCount <= 0) return 6;
  return Math.min(RESEARCH_THIN_POSTS_THRESHOLD, postCount);
}
