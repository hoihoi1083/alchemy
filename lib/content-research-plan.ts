import { callDeepSeekChat } from "@/lib/deepseek-client";
import { resolveCopyLocale, plannerCopyLanguageRule } from "@/lib/copy-locale";
import {
  fetchPlatformWebResearch,
  formatPostsForPrompt,
  formatWebSnippetsForPrompt,
  hasLiveContentResearchConfigured,
} from "@/lib/content-research-web";
import {
  attachSourcePostsToPlan,
  RESEARCH_ANGLES_PER_PAGE,
  RESEARCH_LIVE_ANGLE_COUNT,
  RESEARCH_POSTS_FETCH_LIMIT,
} from "@/lib/content-research-enrich";
import { angleMatchesMediaFilter } from "@/lib/content-research-media-filter";
import { researchProductPromptLines } from "@/lib/content-research-promote";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompt-variables";
import {
  CONTENT_ANGLE_FORMATS,
  CONTENT_PLATFORMS,
  type ContentAngleCandidate,
  type ContentAngleFormat,
  type ContentPlatform,
  type ContentResearchPlan,
  type ContentResearchPost,
  type ContentResearchMediaFilter,
  type ContentResearchSource,
} from "@/lib/content-research-types";

const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  xiaohongshu: "小紅書 (Xiaohongshu)",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

function platformPlaybook(platform: ContentPlatform): string {
  switch (platform) {
    case "xiaohongshu":
      return [
        "小紅書: soft lifestyle product shots, low-saturation edu carousels, save-worthy tips, search-friendly keywords.",
        "Hooks often promise a gift guide, styling hack, or「避雷」checklist. CTA: 收藏這篇.",
        "Preferred formats: teaching-carousel, single-image lifestyle, campaign series.",
      ].join(" ");
    case "instagram":
      return [
        "Instagram: bold feed hooks, 4:5 or carousel, aesthetic flat-lays, short punchy captions.",
        "Reels need a visual hook in frame 1. Carousels: slide 1 = hook, slides 2–4 = value.",
      ].join(" ");
    case "tiktok":
      return [
        "TikTok: 15–30s script, spoken hook in first 2 seconds, trend-native pacing, on-screen text bullets.",
        "Prefer reel format with scene-by-scene beats.",
      ].join(" ");
    case "facebook":
      return [
        "Facebook: clear benefit headline, trust/proof, slightly longer copy OK, offer-friendly CTAs.",
        "Mix of single promo image and 3-slide campaign.",
      ].join(" ");
  }
}

function normalizeCandidate(
  raw: Partial<ContentAngleCandidate>,
  index: number,
): ContentAngleCandidate | null {
  const hook = String(raw.hook ?? "").trim();
  const title = String(raw.title ?? "").trim();
  if (!hook && !title) return null;
  const formatRaw = String(raw.format ?? "single-image").trim() as ContentAngleFormat;
  const format = CONTENT_ANGLE_FORMATS.includes(formatRaw) ? formatRaw : "single-image";
  const bullets = Array.isArray(raw.bulletPoints)
    ? raw.bulletPoints.map((b) => String(b).trim()).filter(Boolean).slice(0, 5)
    : String((raw as { bullets?: string }).bullets ?? "")
        .split(/\||\n/)
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 5);
  const sourceUrl = String(raw.sourceUrl ?? "").trim() || undefined;
  return {
    id: String(raw.id ?? `angle-${index + 1}`).trim() || `angle-${index + 1}`,
    title: title || hook.slice(0, 40),
    hook: hook || title,
    scriptOutline: String(raw.scriptOutline ?? "").trim(),
    format,
    formatLabel: String(raw.formatLabel ?? format).trim() || format,
    whyItWorks: String(raw.whyItWorks ?? "").trim(),
    bulletPoints: bullets,
    cta: String(raw.cta ?? "").trim(),
    score: Math.min(100, Math.max(0, Number(raw.score) || 50)),
    sourceUrl,
    sourceTitle: String(raw.sourceTitle ?? "").trim() || undefined,
  };
}

function normalizePlan(
  parsed: Partial<ContentResearchPlan>,
  input: {
    topic: string;
    platform: ContentPlatform;
    researchMode: ContentResearchPlan["researchMode"];
    searchProvider?: ContentResearchPlan["searchProvider"];
    sources?: ContentResearchSource[];
    posts?: ContentResearchPost[];
  },
): ContentResearchPlan {
  const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : [])
    .map((c, i) => normalizeCandidate(c as Partial<ContentAngleCandidate>, i))
    .filter((c): c is ContentAngleCandidate => Boolean(c))
    .slice(0, 10);

  while (candidates.length < 3 && input.researchMode === "playbook") {
    const i = candidates.length;
    candidates.push({
      id: `fallback-${i + 1}`,
      title: `${input.topic} — angle ${i + 1}`,
      hook: input.topic,
      scriptOutline: "Intro → key tip → proof → CTA",
      format: "single-image",
      formatLabel: "Single image",
      whyItWorks: `Works on ${PLATFORM_LABELS[input.platform]} for SMB promos.`,
      bulletPoints: [],
      cta: "Learn more",
      score: 40 - i,
    });
  }

  const topFromModel = (Array.isArray(parsed.topPicks) ? parsed.topPicks : [])
    .map((c, i) => normalizeCandidate(c as Partial<ContentAngleCandidate>, i))
    .filter((c): c is ContentAngleCandidate => Boolean(c));

  const topPickIds = Array.isArray((parsed as { topPickIds?: string[] }).topPickIds)
    ? (parsed as { topPickIds?: string[] }).topPickIds!.map((id) => String(id).trim()).filter(Boolean)
    : [];

  const topPicksFromIds = topPickIds
    .map((id) => candidates.find((c) => c.id === id))
    .filter((c): c is ContentAngleCandidate => Boolean(c));

  const topPicks =
    topFromModel.length >= 3
      ? topFromModel.slice(0, 3)
      : topPicksFromIds.length >= 3
        ? topPicksFromIds.slice(0, 3)
        : [...candidates].sort((a, b) => b.score - a.score).slice(0, 3);

  // Live search can backfill from raw platform posts in attachSourcePostsToPlan — defer min check.
  const canBackfillFromPosts =
    input.researchMode === "live-web" &&
    (input.posts?.length ?? 0) >= RESEARCH_ANGLES_PER_PAGE;

  if (topPicks.length < 3 && input.researchMode === "live-web" && !canBackfillFromPosts) {
    throw new Error(
      "Could not extract enough content angles from web results. Try a different keyword.",
    );
  }

  return {
    platform: input.platform,
    platformLabel: String(parsed.platformLabel ?? "").trim() || PLATFORM_LABELS[input.platform],
    topic: String(parsed.topic ?? "").trim() || input.topic,
    summary: String(parsed.summary ?? "").trim(),
    researchMode: input.researchMode,
    searchProvider: input.searchProvider,
    sources: input.sources,
    posts: input.posts,
    candidates,
    topPicks,
  };
}

function mediaFilterPromptLine(filter?: ContentResearchMediaFilter): string {
  if (filter === "image") {
    return "- User selected IMAGE workflow — only suggest image/carousel angles (teaching-carousel, single-image, campaign, model-wear). No reel/video angles.";
  }
  if (filter === "video") {
    return "- User selected VIDEO workflow — only suggest reel/short-video angles (format: reel).";
  }
  return "";
}

export function applyMediaFilterToPlan(
  plan: ContentResearchPlan,
  filter?: ContentResearchMediaFilter,
): ContentResearchPlan {
  if (!filter) return { ...plan, mediaFilter: undefined };

  const candidates = plan.candidates.filter((c) => angleMatchesMediaFilter(c.format, filter));
  const topPicks = plan.topPicks.filter((c) => angleMatchesMediaFilter(c.format, filter));

  return {
    ...plan,
    mediaFilter: filter,
    candidates,
    topPicks: topPicks.length >= 1 ? topPicks : candidates.slice(0, RESEARCH_ANGLES_PER_PAGE),
  };
}

function ensureMinLiveAngles(plan: ContentResearchPlan): ContentResearchPlan {
  if (plan.topPicks.length >= RESEARCH_ANGLES_PER_PAGE) return plan;

  const sorted = [...plan.candidates].sort((a, b) => b.score - a.score);
  const topPicks = sorted.slice(0, RESEARCH_ANGLES_PER_PAGE);
  if (topPicks.length < RESEARCH_ANGLES_PER_PAGE) {
    throw new Error(
      plan.mediaFilter === "video"
        ? "小紅書有影片結果，但湊唔夠 3 個可用角度。試較闊關鍵字，或直接用貼文連結搜尋。"
        : "Could not extract enough content angles from web results. Try a different keyword.",
    );
  }

  return { ...plan, topPicks };
}

export function finalizeLiveResearchPlan(
  parsed: Partial<ContentResearchPlan>,
  normalizeInput: {
    topic: string;
    platform: ContentPlatform;
    researchMode: ContentResearchPlan["researchMode"];
    searchProvider?: ContentResearchPlan["searchProvider"];
    sources?: ContentResearchSource[];
    posts?: ContentResearchPost[];
  },
  options?: { mediaFilter?: ContentResearchMediaFilter; fallbackWarning?: string },
): ContentResearchPlan {
  return ensureMinLiveAngles(
    applyMediaFilterToPlan(
      attachSourcePostsToPlan({
        ...normalizePlan(parsed, normalizeInput),
        researchWarning: options?.fallbackWarning,
      }),
      options?.mediaFilter,
    ),
  );
}

function buildPlaybookPrompt(input: {
  topic: string;
  platform: ContentPlatform;
  market: PromptMarket;
  promotionMode: "physical" | "concept";
  product?: string;
  business?: string;
  mediaFilter?: ContentResearchMediaFilter;
}): string {
  const copyLocale = resolveCopyLocale(
    input.market,
    input.topic,
    input.product,
    input.business,
  );
  return [
    "You are a social content strategist for SMB brands. Return JSON only — no markdown.",
    "Generate proven content ANGLES (templates) — NOT from live web data.",
    "",
    "Required JSON:",
    '{"platform":"","platformLabel":"","topic":"","summary":"","candidates":[{"id":"","title":"","hook":"","scriptOutline":"","format":"","formatLabel":"","whyItWorks":"","bulletPoints":[""],"cta":"","score":0}],"topPicks":[]}',
    "",
    "Rules:",
    "- candidates: exactly 10 distinct angles for the topic on this platform",
    "- topPicks: best 3 from candidates (copy full objects, highest score)",
    "- format: teaching-carousel | single-image | campaign | reel | model-wear",
    `- Copy language: ${plannerCopyLanguageRule(copyLocale)}`,
    `- Platform playbook: ${platformPlaybook(input.platform)}`,
    input.promotionMode === "physical"
      ? "- User sells a PHYSICAL product — prefer model-wear, product hero angles when relevant."
      : "- User promotes a SERVICE / concept — prefer edu carousels, trust builders.",
    mediaFilterPromptLine(input.mediaFilter),
    "",
    `- Platform: ${PLATFORM_LABELS[input.platform]}`,
    ...researchProductPromptLines(input.topic, input.product),
    input.business ? `Business: ${input.business}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLiveWebPrompt(input: {
  topic: string;
  platform: ContentPlatform;
  market: PromptMarket;
  promotionMode: "physical" | "concept";
  product?: string;
  business?: string;
  webBlock: string;
  postsBlock?: string;
  angleCount?: number;
  mediaFilter?: ContentResearchMediaFilter;
}): string {
  const copyLocale = resolveCopyLocale(
    input.market,
    input.topic,
    input.product,
    input.business,
  );
  const angleCount = input.angleCount ?? (input.postsBlock ? RESEARCH_LIVE_ANGLE_COUNT : 6);
  return [
    "You analyze REAL web search snippets from social platforms. Return JSON only.",
    "Extract content patterns, hooks, and structures evidenced in the snippets — then ADAPT them for the user's product.",
    "",
    "Required JSON:",
    '{"platform":"","platformLabel":"","topic":"","summary":"","candidates":[{"id":"1","title":"","hook":"","scriptOutline":"","format":"teaching-carousel","formatLabel":"","whyItWorks":"","bullets":"point1 | point2","cta":"","score":90,"sourceUrl":"","sourceTitle":""}],"topPickIds":["1","2","3"]}',
    "",
    "Rules:",
    `- candidates: exactly ${angleCount} distinct angles grounded in snippets (one per post when possible)`,
    "- topPickIds: ids of best 3 candidates (for legacy; include all candidates anyway)",
    "- Keep every string under 120 chars; use simple punctuation — no raw double-quotes inside JSON strings",
    "- bullets: one pipe-separated string, NOT a JSON array",
    "- Each candidate MUST include sourceUrl + sourceTitle copied from a snippet that inspired it",
    "- hook/scriptOutline: adapt real patterns to user's product — borrow FORMAT only, not reference subject matter",
    "- whyItWorks: cite what you saw in search results (format, hook style, engagement pattern)",
    "- Do NOT invent viral claims without snippet evidence",
    "- format: teaching-carousel | single-image | campaign | reel | model-wear",
    `- Copy language: ${plannerCopyLanguageRule(copyLocale)}`,
    `- Platform: ${PLATFORM_LABELS[input.platform]}`,
    ...researchProductPromptLines(input.topic, input.product),
    input.business ? `Business: ${input.business}` : "",
    input.promotionMode === "physical"
      ? "- User sells a PHYSICAL product."
      : "- User promotes a SERVICE / concept.",
    mediaFilterPromptLine(input.mediaFilter),
    "",
    input.postsBlock
      ? `=== ${PLATFORM_LABELS[input.platform].toUpperCase()} POSTS (structured search results with engagement) ===`
      : "",
    input.postsBlock ?? "",
    input.postsBlock ? "" : "",
    "=== WEB SEARCH SNIPPETS (real results) ===",
    input.webBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callResearchPlanner(
  system: string,
  user: string,
): Promise<Partial<ContentResearchPlan>> {
  let lastError: unknown;
  const temps = [0.4, 0.3, 0.25];
  for (let attempt = 0; attempt < temps.length; attempt++) {
    try {
      const outputText = await callDeepSeekChat(
        [
          { role: "system", content: system },
          {
            role: "user",
            content:
              attempt > 0
                ? `${user}\n\nIMPORTANT: Return STRICT valid JSON. No markdown. No unescaped " inside string values.`
                : user,
          },
        ],
        { temperature: temps[attempt], max_tokens: 2800, jsonObject: true },
      );
      return parseLlmJsonObject<Partial<ContentResearchPlan>>(
        outputText,
        "Content research plan",
      );
    } catch (e) {
      lastError = e;
      const msg = String(e);
      if (attempt < temps.length - 1 && msg.includes("invalid JSON")) continue;
      throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Content research plan failed.");
}

export function isContentPlatform(value: string): value is ContentPlatform {
  return (CONTENT_PLATFORMS as readonly string[]).includes(value);
}

async function planContentResearchPlaybook(input: {
  topic: string;
  platform: ContentPlatform;
  market: PromptMarket;
  promotionMode: "physical" | "concept";
  product?: string;
  business?: string;
  mediaFilter?: ContentResearchMediaFilter;
}): Promise<ContentResearchPlan> {
  const parsed = await callResearchPlanner(
    "You output strict JSON for social content angle research.",
    buildPlaybookPrompt(input),
  );
  return applyMediaFilterToPlan(
    normalizePlan(parsed, {
      topic: input.topic,
      platform: input.platform,
      researchMode: "playbook",
    }),
    input.mediaFilter,
  );
}

async function planContentResearchLive(input: {
  topic: string;
  platform: ContentPlatform;
  market: PromptMarket;
  promotionMode: "physical" | "concept";
  product?: string;
  business?: string;
  mediaFilter?: ContentResearchMediaFilter;
}): Promise<ContentResearchPlan> {
  const bundle = await fetchPlatformWebResearch(
    input.topic,
    input.platform,
    input.market,
    input.mediaFilter,
  );
  const sources: ContentResearchSource[] = bundle.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));
  const postLimit = bundle.posts?.length
    ? Math.min(bundle.posts.length, RESEARCH_POSTS_FETCH_LIMIT)
    : 8;
  const webBlock =
    bundle.posts && bundle.posts.length > 0
      ? formatPostsForPrompt(bundle.posts.slice(0, postLimit))
      : formatWebSnippetsForPrompt(bundle.results.slice(0, 8));
  const parsed = await callResearchPlanner(
    "You synthesize social content angles from real web search snippets. Return compact valid JSON only — escape quotes inside strings.",
    buildLiveWebPrompt({
      ...input,
      webBlock,
      postsBlock:
        bundle.posts && bundle.posts.length > 0
          ? formatPostsForPrompt(bundle.posts.slice(0, postLimit))
          : undefined,
      angleCount:
        bundle.posts && bundle.posts.length > 0 ? RESEARCH_LIVE_ANGLE_COUNT : 6,
    }),
  );
  return finalizeLiveResearchPlan(
    parsed,
    {
      topic: input.topic,
      platform: input.platform,
      researchMode: "live-web",
      searchProvider: bundle.provider,
      sources,
      posts: bundle.posts,
    },
    { mediaFilter: input.mediaFilter, fallbackWarning: bundle.fallbackWarning },
  );
}

export async function planContentResearch(input: {
  topic: string;
  platform: ContentPlatform;
  market?: PromptMarket;
  promotionMode?: "physical" | "concept";
  product?: string;
  business?: string;
  /** Skip web search — AI playbook only (dev / no API key). */
  usePlaybookOnly?: boolean;
  mediaFilter?: ContentResearchMediaFilter;
}): Promise<ContentResearchPlan> {
  const topic = input.topic?.trim();
  if (!topic) throw new Error("Enter a product or topic to research.");
  if (!isContentPlatform(input.platform)) {
    throw new Error("Pick a supported platform.");
  }

  const base = {
    topic,
    platform: input.platform,
    market: input.market ?? "hk",
    promotionMode: input.promotionMode ?? "concept",
    product: input.product,
    business: input.business,
    mediaFilter: input.mediaFilter,
  };

  if (input.usePlaybookOnly) {
    return planContentResearchPlaybook(base);
  }

  if (!hasLiveContentResearchConfigured(input.platform)) {
    throw new Error(
      "Live content research needs JUSTONEAPI_TOKEN or TAVILY_API_KEY in .env.local (see docs/XHS_NOTE_SEARCH_SETUP.md).",
    );
  }

  return planContentResearchLive(base);
}
