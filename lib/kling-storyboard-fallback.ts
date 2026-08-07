import type { KlingClipDuration } from "@/lib/billing/token-costs";
import { estimateKlingStoryboardTokens, KLING_TURBO_PRO } from "@/lib/billing/token-costs";

export { estimateKlingStoryboardTokens, KLING_TURBO_PRO };
export type { KlingClipDuration };

/** Pick Kling clip length from storyboard scene span (API only allows 5 or 10). */
export function klingClipDurationForScene(
  startSec: number,
  endSec: number,
): KlingClipDuration {
  const span = Math.max(0, endSec - startSec);
  return span > 5.5 ? 10 : 5;
}

/** Default clip length when animating every scene for an N-scene / totalDuration reel. */
export function klingClipDurationForStoryboard(
  sceneCount: number,
  totalDurationSec: number,
): KlingClipDuration {
  const n = Math.max(1, sceneCount);
  const per = totalDurationSec / n;
  return per > 5.5 ? 10 : 5;
}

/** Lightweight scene timing meta for client + server token estimates (no Node deps). */
export type KlingSceneMeta = {
  startSec?: number;
  endSec?: number;
  sceneDescriptionZh?: string;
  imagePrompt?: string;
  role?: string;
  /** User opted into Brand kit logo on storyboard stills. */
  useBrandLogo?: boolean;
  /** @deprecated alias of useBrandLogo */
  endWithBrandLogo?: boolean;
};

/** Parse client `scenes_meta` JSON; ignore malformed payloads. */
export function parseKlingScenesMeta(raw: string | null | undefined): KlingSceneMeta[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is KlingSceneMeta => Boolean(row) && typeof row === "object");
  } catch {
    return [];
  }
}

/**
 * When the client omits scenes_meta, still give Kling role-based motion instead of
 * identical generic push-ins across every clip.
 */
export function defaultKlingScenesMeta(sceneCount: number): KlingSceneMeta[] {
  const n = Math.max(0, sceneCount);
  if (n <= 0) return [];
  if (n === 1) return [{ role: "product hero" }];
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return { role: "hook open" };
    if (i === n - 1) return { role: "cta end" };
    return { role: "product demo" };
  });
}

/** Prefer client meta; pad with role defaults when short; cap when long. */
export function resolveKlingScenesMeta(
  sceneCount: number,
  clientMeta: KlingSceneMeta[],
): KlingSceneMeta[] {
  if (sceneCount <= 0) return [];
  if (clientMeta.length === 0) return defaultKlingScenesMeta(sceneCount);
  const defaults = defaultKlingScenesMeta(sceneCount);
  return defaults.map((d, i) => clientMeta[i] ?? d);
}

export function resolveKlingClipDurations(
  sceneCount: number,
  totalDurationSec: number,
  scenesMeta: KlingSceneMeta[],
): KlingClipDuration[] {
  const defaultClip = klingClipDurationForStoryboard(sceneCount, totalDurationSec);
  return Array.from({ length: sceneCount }, (_, i) => {
    const meta = scenesMeta[i];
    if (
      meta &&
      typeof meta.startSec === "number" &&
      typeof meta.endSec === "number"
    ) {
      return klingClipDurationForScene(meta.startSec, meta.endSec);
    }
    return defaultClip;
  });
}

export function klingStoryboardTokenCost(clipDurations: KlingClipDuration[]): number {
  return clipDurations.reduce(
    (sum, d) => sum + estimateKlingStoryboardTokens(1, d),
    0,
  );
}

/** English-only camera language for I2V — never pass Chinese captions (Kling invents glyphs). */
const KLING_MOTION_BY_ROLE: Array<{ re: RegExp; motion: string }> = [
  {
    re: /\b(hook|open|intro|cover)\b/i,
    motion:
      "confident slow push-in with parallax background bokeh and soft light sweep across the frame",
  },
  {
    re: /\b(upload|phone|mobile|hand)\b/i,
    motion:
      "noticeable handheld drift and slight phone tilt, thumb micro-tap energy, cinematic light moving on the glass",
  },
  {
    re: /\b(edit|laptop|prompt|type|screen|tablet|dashboard)\b/i,
    motion:
      "slow orbit around the device, panels softly pulse with light, camera drifts closer — keep UI chrome blank",
  },
  {
    re: /\b(cta|end|outro|brand|payoff|closing)\b/i,
    motion:
      "bold slow push-in on the end card, lens flare sweep, logo sparkle and depth parallax — keep layout locked",
  },
  {
    re: /\b(demo|product|hero|publish|ad)\b/i,
    motion:
      "gentle product orbit with stronger camera push and shimmering reflections, premium commercial energy",
  },
];

function klingMotionFromMeta(opts: {
  sceneDescription?: string;
  imagePrompt?: string;
  role?: string;
}): string {
  const blob = [opts.role, opts.sceneDescription, opts.imagePrompt].filter(Boolean).join(" ");
  for (const row of KLING_MOTION_BY_ROLE) {
    if (row.re.test(blob)) return row.motion;
  }
  return "confident slow push-in with light sweep and gentle parallax, premium social-ad pacing";
}

function isEndCardScene(_opts: {
  role?: string;
  sceneIndex: number;
  sceneCount: number;
  useBrandLogo?: boolean;
  endWithBrandLogo?: boolean;
}): boolean {
  // Blank centered logo end-card path retired — last scene is a normal beat.
  return false;
}

/** Drop UI placeholders / Chinese prompt-editor junk so Kling never sees them as Action. */
export function sanitizeKlingSceneAction(raw?: string): string | undefined {
  const text = raw?.trim();
  if (!text) return undefined;
  if (/自动生成|可编辑\s*Prompt|editable\s*prompt|placeholder/i.test(text)) {
    return undefined;
  }
  // Keep motion beats short; long Chinese marketing copy tends to paint gibberish on screens.
  if (text.length > 180) return text.slice(0, 180).trim();
  return text;
}

export function klingSceneMotionPrompt(opts: {
  sceneIndex: number;
  sceneCount: number;
  sceneDescription?: string;
  imagePrompt?: string;
  theme?: string;
  role?: string;
  useBrandLogo?: boolean;
  endWithBrandLogo?: boolean;
}): string {
  const motion = klingMotionFromMeta(opts);
  const theme = opts.theme?.trim();
  const action = sanitizeKlingSceneAction(opts.sceneDescription);
  const endCard = isEndCardScene(opts);
  const logoOn = Boolean(opts.useBrandLogo ?? opts.endWithBrandLogo);
  return [
    `Animate this exact still as storyboard scene ${opts.sceneIndex}/${opts.sceneCount}.`,
    theme ? `Mood: ${theme}.` : "",
    action
      ? `Action: ${action} — follow this beat with natural motion; do not change identity or layout.`
      : "",
    `Camera: ${motion}.`,
    "Add visible commercial motion — camera move and light should feel alive, not a near-static photo.",
    "Preserve the input frame — Keep the same people, product, layout, and brand logo already in the still.",
    "CRITICAL: do not invent, redraw, or morph any readable text, Chinese characters, Latin letters, digits, captions, watermarks, or gibberish glyphs.",
    "If the still has a laptop/phone/tablet screen, keep UI blank or abstract — never invent English/Chinese labels, inverted text, or dashboard copy.",
    "If the still has blank bars or empty UI labels, keep them blank — never fill them with fake words.",
    "FALLBACK: if any accidental on-screen words, glyphs, or gibberish appear, keep them heavily out-of-focus / soft bokeh so they are unreadable — never sharpen fake text.",
    endCard
      ? "END CARD: the centered brand logo is the hero — preserve it exactly, do not invent a second wordmark, slogan, or fake Chinese. Motion = camera + light + sparkle only."
      : logoOn
        ? "Preserve the corner brand logo badge exactly — do not invent a second mark or slogan."
        : "If a brand logo is already in the still, preserve it pixel-faithfully; if there is none, do not invent one.",
    "9:16 vertical, no morphing faces.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const KLING_TEXTLESS_NEGATIVE =
  "static image, no motion, frozen frame, distort, low quality, watermark, morphing face, extra limbs, readable text, chinese characters, latin letters, gibberish text, sharp fake text, legible invented words, fake ui labels, inverted text, mirrored text, laptop screen text, monitor ui text, dashboard labels, hexagon labels, subtitles, captions, invented logo, second logo, misspelled words, on-screen typography, slogan under logo";
