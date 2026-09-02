import {
  appendArtStyleSeedanceHintIfNeeded,
  artStyleImageClause,
  DEFAULT_ART_STYLE,
  type ArtStyleId,
} from "@/lib/art-style";
import { TOKEN_COST, estimateVideoTokens } from "@/lib/billing/token-costs";
import type { ImageResolutionCap } from "@/lib/billing/entitlements";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";

export type UltraVideoAspectRatio = "9:16" | "16:9" | "1:1";

export const ULTRA_VIDEO_ASPECT_RATIOS: UltraVideoAspectRatio[] = ["9:16", "16:9", "1:1"];

export const ULTRA_VIDEO_CAMERAS = [
  "Static Locked Shot",
  "Slow Push In",
  "Slow Pull Out",
  "Gentle Orbit Around Subject",
  "Crane Rise",
  "Tracking Side Slide",
  "Handheld Subtle Sway",
  "Dolly Zoom",
] as const;

export type UltraVideoProControls = {
  aspectRatio: UltraVideoAspectRatio;
  camera: string;
  duration: string;
  resolution: "480p" | "720p" | "1080p";
  fast: boolean;
  generateAudio: boolean;
  artStyleId: ArtStyleId;
  /** 0–100 optional motion intensity hint for Seedance. */
  motionStrength?: number;
};

export const DEFAULT_ULTRA_VIDEO_PRO: UltraVideoProControls = {
  aspectRatio: "9:16",
  camera: "Slow Push In",
  duration: "8",
  resolution: "480p",
  fast: true,
  generateAudio: false,
  artStyleId: DEFAULT_ART_STYLE,
};

export function videoProFromPartial(pro?: Partial<UltraVideoProControls>): UltraVideoProControls {
  return { ...DEFAULT_ULTRA_VIDEO_PRO, ...pro };
}

/** Append video-safe art direction hint for Seedance prompts. */
export function appendUltraVideoProToPrompt(
  userPrompt: string,
  artStyleId: ArtStyleId | undefined,
): string {
  return appendArtStyleSeedanceHintIfNeeded(userPrompt.trim(), artStyleId);
}

export type UltraLightingPreset =
  | "studio_soft"
  | "rim_dramatic"
  | "golden_hour"
  | "neon_cyber"
  | "natural_window"
  | "custom";

export type UltraBackgroundPreset =
  | "clean_studio"
  | "gradient_dark"
  | "lifestyle_blur"
  | "urban_night"
  | "custom";

export type UltraImageProControls = {
  aspectRatio: ImageAspectRatio;
  resolution: ImageResolutionCap;
  artStyleId: ArtStyleId;
  lightingPreset: UltraLightingPreset;
  lightingCustom?: string;
  backgroundPreset: UltraBackgroundPreset;
  backgroundCustom?: string;
};

export const ULTRA_LIGHTING_PRESETS: UltraLightingPreset[] = [
  "studio_soft",
  "rim_dramatic",
  "golden_hour",
  "neon_cyber",
  "natural_window",
  "custom",
];

export const ULTRA_BACKGROUND_PRESETS: UltraBackgroundPreset[] = [
  "clean_studio",
  "gradient_dark",
  "lifestyle_blur",
  "urban_night",
  "custom",
];

export const DEFAULT_ULTRA_IMAGE_PRO: UltraImageProControls = {
  aspectRatio: "9:16",
  resolution: "1K",
  artStyleId: DEFAULT_ART_STYLE,
  lightingPreset: "studio_soft",
  backgroundPreset: "clean_studio",
};

const LIGHTING_CLAUSE: Record<Exclude<UltraLightingPreset, "custom">, string> = {
  studio_soft:
    "Soft three-point studio lighting with gentle key, fill, and subtle rim — premium product ad quality.",
  rim_dramatic:
    "Dramatic rim light with deep shadows and controlled contrast — cinematic hero lighting.",
  golden_hour:
    "Warm golden-hour sunlight with soft long shadows and natural skin tones.",
  neon_cyber:
    "Neon accent lighting, cool magenta/cyan edge glow, high-tech cyber atmosphere.",
  natural_window:
    "Soft natural window light, airy shadows, realistic indoor daylight mood.",
};

const BACKGROUND_CLAUSE: Record<Exclude<UltraBackgroundPreset, "custom">, string> = {
  clean_studio:
    "Clean studio sweep background — minimal, uncluttered, product-forward.",
  gradient_dark:
    "Dark charcoal-to-black gradient backdrop with subtle vignette — premium tech ad mood.",
  lifestyle_blur:
    "Shallow depth-of-field lifestyle environment — soft bokeh, context without clutter.",
  urban_night:
    "Urban night city bokeh — reflective surfaces, moody atmosphere, no readable signage.",
};

function resolveLightingClause(controls: UltraImageProControls): string {
  if (controls.lightingPreset === "custom") {
    return controls.lightingCustom?.trim() ?? "";
  }
  return LIGHTING_CLAUSE[controls.lightingPreset];
}

function resolveBackgroundClause(controls: UltraImageProControls): string {
  if (controls.backgroundPreset === "custom") {
    return controls.backgroundCustom?.trim() ?? "";
  }
  return BACKGROUND_CLAUSE[controls.backgroundPreset];
}

/** Prompt suffix for lighting, background, and art direction (client-side). */
export function buildUltraImagePromptSuffix(controls: UltraImageProControls): string {
  const parts: string[] = [];
  const lighting = resolveLightingClause(controls);
  const background = resolveBackgroundClause(controls);
  if (lighting) parts.push(`Lighting: ${lighting}`);
  if (background) parts.push(`Background: ${background}`);
  const styleClause = artStyleImageClause(controls.artStyleId);
  if (styleClause) parts.push(styleClause);
  return parts.filter(Boolean).join(" ");
}

export function appendUltraProToPrompt(userPrompt: string, controls: UltraImageProControls): string {
  const base = userPrompt.trim();
  const suffix = buildUltraImagePromptSuffix(controls);
  if (!suffix) return base;
  return `${base}\n\n${suffix}`.trim();
}

export function estimateCanvasImageTokens(): number {
  return TOKEN_COST.image;
}

export function estimateCanvasScriptTokens(): number {
  return 0;
}

/** Script planning uses DeepSeek plan quota, not token debit. */
export function canvasScriptUsesPlanQuota(): boolean {
  return true;
}

export function estimateCanvasSpliceTokens(opts: { hasMusic: boolean }): number {
  // Stitch is free; BGM mix via /api/add-bgm charges when audio is connected.
  return opts.hasMusic ? TOKEN_COST.bgm : 0;
}

export function estimateCanvasVideoTokens(opts: {
  resolution: string;
  duration: string;
  fast: boolean;
}): number {
  const sec = Math.max(1, parseInt(opts.duration, 10) || 8);
  return estimateVideoTokens({
    resolution: opts.resolution,
    fast: opts.fast,
    duration: sec,
  });
}

/** Build video pro controls from persisted node data. */
export function videoProFromNodeData(data: {
  camera?: string;
  duration: string;
  resolution: "480p" | "720p" | "1080p";
  fast: boolean;
  aspectRatio?: UltraVideoAspectRatio;
  generateAudio?: boolean;
  artStyleId?: ArtStyleId;
  motionStrength?: number;
}): UltraVideoProControls {
  return videoProFromPartial({
    aspectRatio: data.aspectRatio,
    camera: data.camera,
    duration: data.duration,
    resolution: data.resolution,
    fast: data.fast,
    generateAudio: data.generateAudio,
    artStyleId: data.artStyleId,
    motionStrength: data.motionStrength,
  });
}
