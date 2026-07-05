import path from "path";

const ASSETS = path.join(
  process.env.HOME || "",
  ".cursor",
  "projects",
  "Users-michaelng-Desktop-ai-marketing-studio",
  "assets",
);

export const STYLE_REF_01 = path.join(
  ASSETS,
  "01-future-fork-181eb871-f73d-47cb-b107-4a1aebc3bd59.png",
);
export const STYLE_REF_06 = path.join(
  ASSETS,
  "06-exit-16de2bd3-ce99-4bee-9d45-7468d024634e.png",
);

/**
 * IMAGE 1 = scene/composition (webtoon). IMAGE 2 = style sample only.
 * Critical: do NOT copy roads/scenes from IMAGE 2.
 */
export function buildWatercolorStylizePrompt(): string {
  return [
    "Two images. IMAGE 1 is ONLY a style reference (brush technique, paper texture, line weight). IMAGE 2 is the storyboard to repaint.",
    "Repaint IMAGE 2 in the exact artistic style of IMAGE 1: soft digital watercolor on textured cream cold-press paper,",
    "visible paper grain, wet-on-wet color bleeds, delicate thin brown-grey outlines (NOT black comic ink, NOT cel shading, NOT flat webtoon).",
    "Gentle manhua faces; keep the lighting mood of IMAGE 2 scenes (night, fog, tunnel, sunset, etc.).",
    "MUST keep IMAGE 2 unchanged: same two horizontal panels stacked vertically, same camera angles, same environments",
    "(night headlights, tunnel, fog, sunset, highway exit, coastal road — whatever IMAGE 2 shows).",
    "Same characters: woman long dark wavy hair cream sweater driver; man grey hoodie passenger when shown.",
    "Do NOT import fork-in-the-road or other scenes from IMAGE 1 unless they already appear in IMAGE 2.",
    "Remove ALL text, speech bubbles, watermarks, UI arrows, carousel chrome.",
    "Leave clean cream margins for Chinese caption boxes. Vertical 4:5.",
  ].join(" ");
}

export const W = 1080;
export const H = 1350;

/** Finished watercolor sources — strip baked text, re-place captions. */
export const READY_WATERCOLOR_IDS = new Set([1, 5, 6]);

/** Same layout as 01: centered captions, mid line in gutter. */
export const CENTERED_LAYOUT_IDS = new Set([1, 2, 3, 4, 5, 6, 7]);

export function usesCenteredLayout(slideId: number): boolean {
  return CENTERED_LAYOUT_IDS.has(slideId);
}

export const LAYOUT = {
  paperColor: "#f5f2ec",
  panelX: 40,
  panelW: 1000,
  panelH: 500,
  panelRadius: 12,
  panel1Y: 100,
  panel2Y: 700,
  captionLeft: 52,
  topCaptionY: 92,
  top2CaptionY: 140,
  midCaptionY: 668,
  captionFont: 42,
  boxPadX: 22,
  boxPadY: 14,
  boxRadius: 10,
};

/** Centered layout (01-style) for slides 01, 02, 03, 04, 06, 07. */
export const LAYOUT_CENTERED = {
  ...LAYOUT,
  panel1Y: 124,
  panel2Y: 724,
  panelH: 478,
  topCaptionY: 82,
  top2CaptionY: 132,
  midCaptionY: 672,
  captionFont: 44,
  boxPadX: 24,
  boxPadY: 14,
};

/** @deprecated alias */
export const LAYOUT_READY = LAYOUT_CENTERED;
