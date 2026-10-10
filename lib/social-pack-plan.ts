import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { TOKEN_COST } from "@/lib/billing/token-costs";

/** Feed still packs — TikTok omitted (video-first; add in phase 2 with clip). */
export const SOCIAL_PACK_PLATFORMS = [
  "instagram",
  "facebook",
  "xiaohongshu",
] as const;

export type SocialPackPlatform = (typeof SOCIAL_PACK_PLATFORMS)[number];

export type SocialPackShot = {
  role: string;
  prompt: string;
};

export type SocialPackPlan = {
  platform: SocialPackPlatform;
  caption: string;
  hashtags: string[];
  shots: SocialPackShot[];
  visualDna: string;
  aspectRatio: string;
  tokenEstimate: number;
  imageCount: number;
};

const PLATFORM_DEFAULTS: Record<
  SocialPackPlatform,
  { aspectRatio: string; hashtagHint: string; copyHint: string; visualHint: string }
> = {
  instagram: {
    aspectRatio: "4:5",
    hashtagHint: "5–12 curated niche tags, no spam walls",
    copyHint: "polished hook + short line breaks; lifestyle-aware",
    visualHint: "feed-ready product/lifestyle stills, 4:5 framing",
  },
  facebook: {
    aspectRatio: "4:5",
    hashtagHint: "0–5 light tags",
    copyHint: "clear offer/CTA, slightly longer OK",
    visualHint: "clear product hero, readable at small size",
  },
  xiaohongshu: {
    aspectRatio: "3:4",
    hashtagHint: "RedNote (小红书) style Chinese tags when copy is Chinese",
    copyHint: "RedNote note-style authentic CN tone when market fits; detail + lifestyle",
    visualHint: "3:4 vertical, authentic detail shots, soft natural light",
  },
};

export function parseSocialPackPlatform(raw: unknown): SocialPackPlatform | null {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if ((SOCIAL_PACK_PLATFORMS as readonly string[]).includes(t)) {
    return t as SocialPackPlatform;
  }
  return null;
}

const ALLOWED_ASPECT = new Set(["1:1", "4:5", "3:4", "9:16", "16:9"]);

export function sanitizeSocialPackAspectRatio(
  raw: unknown,
  fallback: string,
): string {
  const t = String(raw ?? "").trim();
  if (ALLOWED_ASPECT.has(t)) return t;
  if (ALLOWED_ASPECT.has(fallback)) return fallback;
  return "4:5";
}

function clampImageCount(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 3;
  return Math.min(4, Math.max(1, Math.round(v)));
}

function normalizeHashtags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    let t = String(item ?? "").trim();
    if (!t) continue;
    if (!t.startsWith("#")) t = `#${t.replace(/^#+/, "")}`;
    if (t.length > 1 && !out.includes(t)) out.push(t);
    if (out.length >= 15) break;
  }
  return out;
}

function normalizeShots(
  raw: unknown,
  count: number,
  visualDna: string,
  brief: string,
): SocialPackShot[] {
  const rolesDefault = ["hero", "detail", "lifestyle", "proof"];
  const arr = Array.isArray(raw) ? raw : [];
  const shots: SocialPackShot[] = [];
  for (let i = 0; i < count; i++) {
    const item = arr[i] as { role?: unknown; prompt?: unknown } | undefined;
    const role =
      String(item?.role ?? "").trim() || rolesDefault[i] || `shot_${i + 1}`;
    let prompt = String(item?.prompt ?? "").trim();
    if (!prompt) {
      prompt = [
        `Social still for: ${brief.slice(0, 200)}.`,
        `Role: ${role}.`,
        visualDna ? `Visual DNA: ${visualDna}.` : "",
        "No long marketing copy on the image. No watermarks. Photoreal product marketing still.",
      ]
        .filter(Boolean)
        .join(" ");
    }
    shots.push({ role, prompt: prompt.slice(0, 1200) });
  }
  return shots;
}

export async function planSocialPack(input: {
  brief: string;
  platform: SocialPackPlatform;
  imageCount?: number;
  hasProductPhoto?: boolean;
  hasStyleRef?: boolean;
  market?: string;
}): Promise<SocialPackPlan> {
  const platform = input.platform;
  const defaults = PLATFORM_DEFAULTS[platform];
  const imageCount = clampImageCount(input.imageCount);
  const brief = input.brief.trim();
  const market = (input.market ?? "hk").trim() || "hk";

  const redNoteZh =
    platform === "xiaohongshu" &&
    /^(hk|tw|cn|zh)/i.test(market);

  const system = [
    "You plan a social content pack: feed caption + hashtags + image shot prompts.",
    "Return ONLY a JSON object with keys:",
    "caption (string), hashtags (string array), visualDna (string), aspectRatio (string like 4:5),",
    "shots (array of {role, prompt}) with exactly the requested image count.",
    "Fulfill the user brief exactly — do not invent a different product or offer.",
    "Caption and hashtags MUST be native to the chosen platform (tone, length, tag style).",
    redNoteZh
      ? "Platform is RedNote (小红书): write caption and hashtags in Chinese (Traditional for hk/tw, Simplified for cn). Do not use English-only captions."
      : "",
    "Image prompts: English visual direction, no long on-image slogans, no watermarks.",
    "aspectRatio must be one of: 1:1, 4:5, 3:4, 9:16, 16:9.",
    "If a product photo will be used, say keep product identity/shape/colors faithful in each prompt.",
    "If a style reference will be used, say match its layout/mood/lighting — not its product.",
    "visualDna = one short shared look (lighting, palette, lens) for set coherence.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Platform: ${platform}`,
    `Market: ${market}`,
    `Brief (must fulfill): ${brief}`,
    `Image count: ${imageCount}`,
    `Has product reference photo: ${input.hasProductPhoto ? "yes" : "no"}`,
    `Has style reference image: ${input.hasStyleRef ? "yes" : "no"}`,
    `Preferred aspect ratio: ${defaults.aspectRatio}`,
    `Copy style: ${defaults.copyHint}`,
    `Hashtag style: ${defaults.hashtagHint}`,
    `Visual bias: ${defaults.visualHint}`,
    "Write caption ready to paste. Hashtags without duplicating words already in caption if possible.",
  ].join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.55, max_tokens: 1400, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<{
    caption?: unknown;
    hashtags?: unknown;
    visualDna?: unknown;
    aspectRatio?: unknown;
    shots?: unknown;
  }>(raw, "Social pack plan");

  const visualDna =
    String(parsed.visualDna ?? "").trim() ||
    `${defaults.visualHint}; cohesive set`;
  const aspectRatio = sanitizeSocialPackAspectRatio(
    parsed.aspectRatio,
    defaults.aspectRatio,
  );
  const caption =
    String(parsed.caption ?? "").trim() ||
    brief.slice(0, 280);
  const hashtags = normalizeHashtags(parsed.hashtags);
  const shots = normalizeShots(parsed.shots, imageCount, visualDna, brief).map(
    (s) => ({
      ...s,
      prompt: [
        s.prompt,
        visualDna ? `Shared look: ${visualDna}.` : "",
        `Aspect ${aspectRatio}. Platform ${platform}.`,
        input.hasProductPhoto
          ? "Keep the referenced product identity faithful (shape, materials, logo placement if visible)."
          : "",
        input.hasStyleRef
          ? "Follow the style reference for composition, lighting mood, and color energy — not its product."
          : "",
        "No long readable marketing paragraphs on the image.",
      ]
        .filter(Boolean)
        .join(" "),
    }),
  );

  return {
    platform,
    caption,
    hashtags,
    shots,
    visualDna,
    aspectRatio,
    imageCount,
    tokenEstimate: imageCount * TOKEN_COST.image,
  };
}
