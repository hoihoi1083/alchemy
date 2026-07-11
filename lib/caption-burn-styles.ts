/** Preset styles for server-side caption overlay burn (SVG → PNG → ffmpeg). */
export type CaptionStylePresetId =
  | "classic"
  | "xhs-bold"
  | "minimal"
  | "karaoke"
  | "neon-pink"
  | "soft-glow"
  | "red-cta"
  | "blue-tech"
  | "gold-luxury"
  | "green-fresh"
  | "outline-only"
  | "tiktok-pop"
  | "carousel-title"
  | "carousel-white"
  | "carousel-body"
  | "carousel-cta";

export type CaptionBurnStyle = {
  preset: CaptionStylePresetId;
  fontSizeScale?: number;
  fill?: string;
  stroke?: string;
  strokeWidthScale?: number;
  fontWeight?: number;
  fontFamily?: "NotoBody" | "NotoDisplay";
};

export const CAPTION_STYLE_PRESETS: Record<
  CaptionStylePresetId,
  Omit<CaptionBurnStyle, "preset"> & { labelEn: string; labelZh: string }
> = {
  classic: {
    labelEn: "Classic white + black outline",
    labelZh: "經典白字黑邊",
    fill: "white",
    stroke: "black",
    fontWeight: 700,
    fontFamily: "NotoBody",
    fontSizeScale: 1,
    strokeWidthScale: 1,
  },
  "xhs-bold": {
    labelEn: "XHS bold yellow headline",
    labelZh: "小紅書粗黃標題",
    fill: "#FFE566",
    stroke: "#1a1a1a",
    fontWeight: 800,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.08,
    strokeWidthScale: 1.15,
  },
  minimal: {
    labelEn: "Minimal bottom caption",
    labelZh: "簡約底字幕",
    fill: "#f8fafc",
    stroke: "#0f172a",
    fontWeight: 600,
    fontFamily: "NotoBody",
    fontSizeScale: 0.92,
    strokeWidthScale: 0.75,
  },
  karaoke: {
    labelEn: "High-contrast pop",
    labelZh: "高對比彈出字",
    fill: "#ffffff",
    stroke: "#7c3aed",
    fontWeight: 800,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.05,
    strokeWidthScale: 1.2,
  },
  "neon-pink": {
    labelEn: "Neon pink glow",
    labelZh: "霓虹粉光",
    fill: "#ff6bcb",
    stroke: "#3b0764",
    fontWeight: 800,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.06,
    strokeWidthScale: 1.1,
  },
  "soft-glow": {
    labelEn: "Soft white glow",
    labelZh: "柔白光暈",
    fill: "#ffffff",
    stroke: "#64748b",
    fontWeight: 600,
    fontFamily: "NotoBody",
    fontSizeScale: 0.98,
    strokeWidthScale: 0.85,
  },
  "red-cta": {
    labelEn: "Red sale CTA",
    labelZh: "紅色促銷字",
    fill: "#fecaca",
    stroke: "#991b1b",
    fontWeight: 800,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.1,
    strokeWidthScale: 1.2,
  },
  "blue-tech": {
    labelEn: "Blue tech headline",
    labelZh: "科技藍標題",
    fill: "#7dd3fc",
    stroke: "#0c4a6e",
    fontWeight: 700,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.02,
    strokeWidthScale: 1,
  },
  "gold-luxury": {
    labelEn: "Gold luxury",
    labelZh: "金色奢華",
    fill: "#fcd34d",
    stroke: "#451a03",
    fontWeight: 700,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.04,
    strokeWidthScale: 1.05,
  },
  "green-fresh": {
    labelEn: "Fresh green",
    labelZh: "清新綠字",
    fill: "#bbf7d0",
    stroke: "#14532d",
    fontWeight: 700,
    fontFamily: "NotoBody",
    fontSizeScale: 1,
    strokeWidthScale: 1,
  },
  "outline-only": {
    labelEn: "Outline only",
    labelZh: "純描邊字",
    fill: "transparent",
    stroke: "#ffffff",
    fontWeight: 800,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.05,
    strokeWidthScale: 1.35,
  },
  "tiktok-pop": {
    labelEn: "TikTok pop",
    labelZh: "抖音彈跳字",
    fill: "#ffffff",
    stroke: "#ec4899",
    fontWeight: 900,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.12,
    strokeWidthScale: 1.25,
  },
  "carousel-title": {
    labelEn: "Carousel title (brown)",
    labelZh: "輪播主標題（啡色）",
    fill: "#4a3728",
    stroke: "transparent",
    fontWeight: 800,
    fontFamily: "NotoDisplay",
    fontSizeScale: 1.15,
    strokeWidthScale: 0,
  },
  "carousel-white": {
    labelEn: "White on capsule",
    labelZh: "膠囊白字",
    fill: "#ffffff",
    stroke: "transparent",
    fontWeight: 700,
    fontFamily: "NotoBody",
    fontSizeScale: 0.95,
    strokeWidthScale: 0,
  },
  "carousel-body": {
    labelEn: "Body copy (brown)",
    labelZh: "內文（啡色）",
    fill: "#5c4033",
    stroke: "transparent",
    fontWeight: 600,
    fontFamily: "NotoBody",
    fontSizeScale: 0.88,
    strokeWidthScale: 0,
  },
  "carousel-cta": {
    labelEn: "CTA button text",
    labelZh: "按鈕文字",
    fill: "#5c4033",
    stroke: "transparent",
    fontWeight: 600,
    fontFamily: "NotoBody",
    fontSizeScale: 0.9,
    strokeWidthScale: 0,
  },
};

export const CAPTION_STYLE_PRESET_IDS = Object.keys(
  CAPTION_STYLE_PRESETS,
) as CaptionStylePresetId[];

export function isCaptionStylePresetId(id: string): id is CaptionStylePresetId {
  return id in CAPTION_STYLE_PRESETS;
}

export function resolveCaptionBurnStyle(
  raw?: Partial<CaptionBurnStyle> | string | null,
): CaptionBurnStyle {
  const presetId =
    (typeof raw === "string" ? raw : raw?.preset)?.trim() || "classic";
  const base = isCaptionStylePresetId(presetId)
    ? CAPTION_STYLE_PRESETS[presetId]
    : CAPTION_STYLE_PRESETS.classic;
  if (typeof raw === "string" || !raw) {
    return { preset: isCaptionStylePresetId(presetId) ? presetId : "classic", ...base };
  }
  return {
    preset: (raw.preset && isCaptionStylePresetId(raw.preset) ? raw.preset : "classic"),
    fontSizeScale: raw.fontSizeScale ?? base.fontSizeScale,
    fill: raw.fill ?? base.fill,
    stroke: raw.stroke ?? base.stroke,
    strokeWidthScale: raw.strokeWidthScale ?? base.strokeWidthScale,
    fontWeight: raw.fontWeight ?? base.fontWeight,
    fontFamily: raw.fontFamily ?? base.fontFamily,
  };
}

export function parseCaptionBurnStyleJson(raw: unknown): CaptionBurnStyle {
  if (!raw || typeof raw !== "object") return resolveCaptionBurnStyle("classic");
  return resolveCaptionBurnStyle(raw as Partial<CaptionBurnStyle>);
}

export function resolveLineCaptionStyle(
  linePreset: string | undefined,
  fallback: CaptionBurnStyle,
): CaptionBurnStyle {
  if (linePreset && isCaptionStylePresetId(linePreset)) {
    return resolveCaptionBurnStyle(linePreset);
  }
  return fallback;
}
