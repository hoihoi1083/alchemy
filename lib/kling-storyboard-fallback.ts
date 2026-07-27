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

function isEndCardScene(opts: {
  role?: string;
  sceneIndex: number;
  sceneCount: number;
  useBrandLogo?: boolean;
  endWithBrandLogo?: boolean;
}): boolean {
  const on = opts.useBrandLogo ?? opts.endWithBrandLogo;
  if (!on) return false;
  return opts.sceneCount > 0 && opts.sceneIndex === opts.sceneCount;
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
  const endCard = isEndCardScene(opts);
  const logoOn = Boolean(opts.useBrandLogo ?? opts.endWithBrandLogo);
  return [
    `Animate this exact still as storyboard scene ${opts.sceneIndex}/${opts.sceneCount}.`,
    theme ? `Mood: ${theme}.` : "",
    `Camera: ${motion}.`,
    "Add visible commercial motion — camera move and light should feel alive, not a near-static photo.",
    "Preserve the input frame — same people, product, layout, and brand logo already in the still.",
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
