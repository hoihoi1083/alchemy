/**
 * Shared “footer-style” glow background themes for tool pages.
 *
 * Tune colors here — structure (4 radials + dots) is fixed in StudioGlowShell.
 * Use space-separated rgb() so values stay CSS-parser safe.
 */
export type StudioGlowThemeId = "violet" | "cyan" | "magenta";

export type StudioGlowTheme = {
  base: string;
  g1: string;
  g2: string;
  g3: string;
  g4: string;
  dot: string;
  dotOpacity: string;
};

export const STUDIO_GLOW_THEMES: Record<StudioGlowThemeId, StudioGlowTheme> = {
  /** Brand violet — edit-image */
  violet: {
    base: "#070b16",
    g1: "rgb(108 59 255 / 0.55)",
    g2: "rgb(139 92 246 / 0.38)",
    g3: "rgb(76 37 212 / 0.22)",
    g4: "rgb(108 59 255 / 0.14)",
    dot: "rgb(255 255 255 / 0.16)",
    dotOpacity: "0.5",
  },
  /** Cool cyan — captions */
  cyan: {
    base: "#050a12",
    g1: "rgb(6 182 212 / 0.42)",
    g2: "rgb(59 130 246 / 0.34)",
    g3: "rgb(14 116 144 / 0.2)",
    g4: "rgb(99 102 241 / 0.16)",
    dot: "rgb(186 230 253 / 0.18)",
    dotOpacity: "0.45",
  },
  /** Magenta alternate */
  magenta: {
    base: "#0a0612",
    g1: "rgb(192 38 211 / 0.4)",
    g2: "rgb(139 92 246 / 0.36)",
    g3: "rgb(124 58 237 / 0.2)",
    g4: "rgb(236 72 153 / 0.14)",
    dot: "rgb(255 255 255 / 0.15)",
    dotOpacity: "0.48",
  },
};

/** Which tool page uses which preset. */
export const STUDIO_PAGE_GLOW: {
  editImage: StudioGlowThemeId;
  captions: StudioGlowThemeId;
} = {
  editImage: "violet",
  captions: "cyan",
};
