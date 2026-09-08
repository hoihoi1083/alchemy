/** Live-text fonts + Konva effect helpers for edit-image-2 Magic Layers. */

export type LiveTextFontGroup =
  | "system"
  | "cjk"
  | "sans"
  | "serif"
  | "display"
  | "script";

export type LiveTextFont = {
  /** CSS font-family stack used by Konva / canvas. */
  id: string;
  labelKey: string;
  group: LiveTextFontGroup;
};

/**
 * Curated poster-friendly stacks. Google families load via
 * {@link LIVE_TEXT_GOOGLE_FONTS_HREF}; system stacks work offline.
 */
export const LIVE_TEXT_FONTS: LiveTextFont[] = [
  // System / OS
  { id: 'system-ui, "Segoe UI", sans-serif', labelKey: "fontSystem", group: "system" },
  {
    id: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    labelKey: "fontPingFang",
    group: "system",
  },
  {
    id: '"Songti SC", "STSong", "SimSun", serif',
    labelKey: "fontSongtiSystem",
    group: "system",
  },
  {
    id: '"Yuanti SC", "Rounded Mplus 1c", sans-serif',
    labelKey: "fontYuantiSystem",
    group: "system",
  },
  // CJK (Google)
  {
    id: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    labelKey: "fontNotoSansSc",
    group: "cjk",
  },
  {
    id: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    labelKey: "fontNotoSansTc",
    group: "cjk",
  },
  {
    id: '"Noto Serif SC", "Songti SC", "STSong", serif',
    labelKey: "fontNotoSerifSc",
    group: "cjk",
  },
  {
    id: '"ZCOOL XiaoWei", "Noto Serif SC", serif',
    labelKey: "fontZcoolXiaowei",
    group: "cjk",
  },
  {
    id: '"ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif',
    labelKey: "fontZcoolQingke",
    group: "cjk",
  },
  {
    id: '"Ma Shan Zheng", "ZCOOL XiaoWei", cursive',
    labelKey: "fontMaShanZheng",
    group: "cjk",
  },
  // Latin sans
  { id: '"Inter", system-ui, sans-serif', labelKey: "fontInter", group: "sans" },
  { id: '"Montserrat", "Inter", sans-serif', labelKey: "fontMontserrat", group: "sans" },
  { id: '"Poppins", "Inter", sans-serif', labelKey: "fontPoppins", group: "sans" },
  { id: '"Nunito", "Inter", sans-serif', labelKey: "fontNunito", group: "sans" },
  {
    id: '"Space Grotesk", "Inter", sans-serif',
    labelKey: "fontSpaceGrotesk",
    group: "sans",
  },
  {
    id: '"Roboto Condensed", "Arial Narrow", sans-serif',
    labelKey: "fontRobotoCondensed",
    group: "sans",
  },
  // Serif
  {
    id: '"Playfair Display", Georgia, serif',
    labelKey: "fontPlayfair",
    group: "serif",
  },
  { id: "Georgia, 'Times New Roman', serif", labelKey: "fontGeorgia", group: "serif" },
  // Display / poster
  { id: '"Oswald", "Arial Narrow", sans-serif', labelKey: "fontOswald", group: "display" },
  {
    id: '"Barlow Condensed", "Oswald", sans-serif',
    labelKey: "fontBarlowCondensed",
    group: "display",
  },
  { id: '"Bebas Neue", "Oswald", sans-serif', labelKey: "fontBebasNeue", group: "display" },
  { id: '"Anton", Impact, sans-serif', labelKey: "fontAnton", group: "display" },
  { id: "Impact, Haettenschweiler, sans-serif", labelKey: "fontImpact", group: "display" },
  { id: '"Righteous", "Oswald", sans-serif', labelKey: "fontRighteous", group: "display" },
  { id: '"Bangers", Impact, sans-serif', labelKey: "fontBangers", group: "display" },
  // Script
  { id: '"Lobster", "Brush Script MT", cursive', labelKey: "fontLobster", group: "script" },
  { id: '"Pacifico", "Brush Script MT", cursive', labelKey: "fontPacifico", group: "script" },
];

export const LIVE_TEXT_FONT_GROUPS: LiveTextFontGroup[] = [
  "system",
  "cjk",
  "sans",
  "serif",
  "display",
  "script",
];

export const LIVE_TEXT_FONT_GROUP_LABEL_KEY: Record<LiveTextFontGroup, string> = {
  system: "fontGroupSystem",
  cjk: "fontGroupCjk",
  sans: "fontGroupSans",
  serif: "fontGroupSerif",
  display: "fontGroupDisplay",
  script: "fontGroupScript",
};

/** Default stack — CJK-capable Google + OS fallbacks. */
export const LIVE_TEXT_DEFAULT_FONT = LIVE_TEXT_FONTS.find(
  (f) => f.labelKey === "fontNotoSansSc",
)!.id;

/**
 * Google Fonts CSS for canvas-safe families used above.
 * Loaded once on the Magic Layers page (not global app layout).
 */
export const LIVE_TEXT_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Anton",
    "family=Bangers",
    "family=Barlow+Condensed:wght@600;700",
    "family=Bebas+Neue",
    "family=Inter:wght@400;700",
    "family=Lobster",
    "family=Ma+Shan+Zheng",
    "family=Montserrat:wght@400;700",
    "family=Noto+Sans+SC:wght@400;700",
    "family=Noto+Sans+TC:wght@400;700",
    "family=Noto+Serif+SC:wght@400;700",
    "family=Nunito:wght@400;700",
    "family=Oswald:wght@500;700",
    "family=Pacifico",
    "family=Playfair+Display:wght@400;700",
    "family=Poppins:wght@400;700",
    "family=Righteous",
    "family=Roboto+Condensed:wght@400;700",
    "family=Space+Grotesk:wght@400;700",
    "family=ZCOOL+QingKe+HuangYou",
    "family=ZCOOL+XiaoWei",
    "display=swap",
  ].join("&");

/**
 * Visual effects for live Konva text.
 * `shadow` is kept as a legacy alias of `softShadow`.
 */
export type LiveTextEffect =
  | "none"
  | "outline"
  | "shadow"
  | "softShadow"
  | "hardShadow"
  | "glow"
  | "neon"
  | "outlineShadow"
  | "heavyOutline";

export const LIVE_TEXT_EFFECTS: Array<{ id: LiveTextEffect; labelKey: string }> = [
  { id: "none", labelKey: "textEffectNone" },
  { id: "outline", labelKey: "textEffectOutline" },
  { id: "heavyOutline", labelKey: "textEffectHeavyOutline" },
  { id: "softShadow", labelKey: "textEffectSoftShadow" },
  { id: "hardShadow", labelKey: "textEffectHardShadow" },
  { id: "glow", labelKey: "textEffectGlow" },
  { id: "neon", labelKey: "textEffectNeon" },
  { id: "outlineShadow", labelKey: "textEffectOutlineShadow" },
];

export function normalizeLiveTextEffect(
  effect: LiveTextEffect | undefined,
): Exclude<LiveTextEffect, "shadow"> {
  if (!effect || effect === "none") return "none";
  if (effect === "shadow") return "softShadow";
  return effect;
}

export function liveTextEffectNeedsStroke(effect: LiveTextEffect | undefined): boolean {
  const e = normalizeLiveTextEffect(effect);
  return e === "outline" || e === "heavyOutline" || e === "neon" || e === "outlineShadow";
}

export function liveTextEffectNeedsEffectColor(
  effect: LiveTextEffect | undefined,
): boolean {
  const e = normalizeLiveTextEffect(effect);
  return (
    e === "softShadow" ||
    e === "hardShadow" ||
    e === "glow" ||
    e === "neon" ||
    e === "outlineShadow"
  );
}

export type LiveTextKonvaEffectProps = {
  stroke?: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor?: string;
  shadowBlur: number;
  shadowOffset?: { x: number; y: number };
  shadowOpacity?: number;
};

/** Map effect + colors → Konva Text props. */
export function liveTextKonvaEffectProps(
  effect: LiveTextEffect | undefined,
  fontSize: number,
  opts?: { strokeColor?: string; effectColor?: string },
): LiveTextKonvaEffectProps {
  const e = normalizeLiveTextEffect(effect);
  const strokeColor = opts?.strokeColor?.trim() || "#ffffff";
  const effectColor = opts?.effectColor?.trim() || "#000000";
  const softBlur = Math.max(4, fontSize * 0.14);
  const hardOff = Math.max(2, fontSize * 0.06);
  const glowBlur = Math.max(8, fontSize * 0.28);

  switch (e) {
    case "outline":
      return {
        stroke: strokeColor,
        strokeWidth: Math.max(1.5, fontSize * 0.07),
        shadowEnabled: false,
        shadowBlur: 0,
      };
    case "heavyOutline":
      return {
        stroke: strokeColor,
        strokeWidth: Math.max(3, fontSize * 0.14),
        shadowEnabled: false,
        shadowBlur: 0,
      };
    case "softShadow":
      return {
        strokeWidth: 0,
        shadowEnabled: true,
        shadowColor: effectColor,
        shadowBlur: softBlur,
        shadowOffset: { x: Math.max(1, fontSize * 0.04), y: Math.max(2, fontSize * 0.05) },
        shadowOpacity: 0.65,
      };
    case "hardShadow":
      return {
        strokeWidth: 0,
        shadowEnabled: true,
        shadowColor: effectColor,
        shadowBlur: 0,
        shadowOffset: { x: hardOff, y: hardOff },
        shadowOpacity: 0.9,
      };
    case "glow":
      return {
        strokeWidth: 0,
        shadowEnabled: true,
        shadowColor: effectColor,
        shadowBlur: glowBlur,
        shadowOffset: { x: 0, y: 0 },
        shadowOpacity: 0.95,
      };
    case "neon":
      return {
        stroke: strokeColor,
        strokeWidth: Math.max(1.5, fontSize * 0.06),
        shadowEnabled: true,
        shadowColor: effectColor,
        shadowBlur: glowBlur,
        shadowOffset: { x: 0, y: 0 },
        shadowOpacity: 1,
      };
    case "outlineShadow":
      return {
        stroke: strokeColor,
        strokeWidth: Math.max(1.5, fontSize * 0.07),
        shadowEnabled: true,
        shadowColor: effectColor,
        shadowBlur: softBlur,
        shadowOffset: { x: Math.max(1, fontSize * 0.04), y: Math.max(2, fontSize * 0.05) },
        shadowOpacity: 0.7,
      };
    default:
      return { strokeWidth: 0, shadowEnabled: false, shadowBlur: 0 };
  }
}

/** Display string for Konva — vertical stacks characters with newlines. */
export function liveTextDisplayString(
  raw: string,
  vertical: boolean | undefined,
): string {
  const text = raw ?? "";
  if (!vertical) return text;
  if (text.includes("\n")) return text;
  return [...text.replace(/\s+/g, "")].join("\n");
}
