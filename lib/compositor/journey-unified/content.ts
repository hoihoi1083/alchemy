import path from "path";

const ASSETS = path.join(
  process.env.HOME || "",
  ".cursor",
  "projects",
  "Users-michaelng-Desktop-ai-marketing-studio",
  "assets",
);

function asset(name: string): string {
  return path.join(ASSETS, name);
}

/** Slide 01 — style reference for all panels (webtoon). */
export const STYLE_REF_01 = asset(
  "_____2026-06-03___9.06.31-af6b8a4c-bede-4b1f-908e-2c926a8714c8.png",
);

export type JourneyCaption = {
  text: string;
  /** "top" | "mid" | "top2" (second line under top) */
  slot: "top" | "top2" | "mid";
  size?: number;
};

export type JourneySlide = {
  id: number;
  name: string;
  sourceFile: string;
  captions: JourneyCaption[];
};

export const WEBTOON_STYLE_PROMPT = [
  "Transform IMAGE 1 to match IMAGE 2 art style exactly.",
  "Modern Korean webtoon manhwa: clean thin black outlines, soft flat cel shading,",
  "muted pastel colors, large expressive eyes, same line weight and rendering as IMAGE 2.",
  "Keep IMAGE 1 identical story composition: two horizontal panels stacked vertically,",
  "same characters (woman long black wavy hair cream sweater driver;",
  "man short black hair grey hoodie passenger when shown), same scenes and poses.",
  "Remove ALL text, watermarks, UI arrows, page numbers, carousel dots.",
  "Plain white gutters between panels for captions. Vertical 4:5.",
].join(" ");

/** Canonical copy + latest source files from user attachments. */
export const JOURNEY_SLIDES: JourneySlide[] = [
  {
    id: 1,
    name: "01-future-fork",
    sourceFile: STYLE_REF_01,
    captions: [
      { text: "當你不知道未來會怎樣", slot: "top" },
      { text: "你只需要握緊方向盤", slot: "mid" },
    ],
  },
  {
    id: 2,
    name: "02-headlights",
    sourceFile: asset(
      "_____2026-06-03___9.06.38-b02ed432-7f81-4040-b144-5b5def8b79e1.png",
    ),
    captions: [
      { text: "車燈只能照亮五十米", slot: "top" },
      { text: "但你一樣能開完全程", slot: "mid" },
    ],
  },
  {
    id: 3,
    name: "03-tunnel",
    sourceFile: asset(
      "_____2026-06-03___9.06.52-7ebb4d96-6804-4fe2-b21d-631f7f9b542a.png",
    ),
    captions: [
      { text: "千萬不要提前害怕", slot: "top" },
      { text: "那些以為過不去的坎，後來都過去了", slot: "mid", size: 34 },
    ],
  },
  {
    id: 4,
    name: "04-kind-heart-fog",
    sourceFile: asset(
      "_____2026-06-03___9.07.01-7ba57b69-5521-4dd5-ba98-6b96094d0728.png",
    ),
    captions: [
      { text: "帶著你當初那顆善良的心", slot: "top", size: 34 },
      { text: "前路再黑，霧再大", slot: "top2", size: 34 },
      { text: "你也能安全抵達", slot: "mid" },
    ],
  },
  {
    id: 5,
    name: "05-detour",
    sourceFile: asset(
      "_____2026-06-03___9.06.48-c785ea3b-0138-40b4-a6b7-2df2807883c5.png",
    ),
    captions: [
      { text: "你以為是繞遠路", slot: "top" },
      { text: "後來才發現，遠路才是最近的路", slot: "mid", size: 34 },
    ],
  },
  {
    id: 6,
    name: "06-exit",
    sourceFile: asset(
      "_____2026-06-03___9.06.57-dc64ac2f-e001-4d51-a2b6-8d38dc27b501.png",
    ),
    captions: [
      { text: "後來不都找到了出口", slot: "top", size: 36 },
      { text: "把握當下 勇敢向前", slot: "mid" },
    ],
  },
  {
    id: 7,
    name: "07-no-shortcuts",
    sourceFile: asset(
      "_____2026-06-03___9.06.44-581d927e-2283-443b-bda0-2baa9f93d3d2.png",
    ),
    captions: [
      { text: "認真走好當下這條路", slot: "top" },
      { text: "盡量遠離捷徑", slot: "mid" },
    ],
  },
];

export const W = 1080;
export const H = 1350;

/** Layout tuned to match 01 reference (centered captions, rounded panels). */
export const LAYOUT = {
  panelX: 40,
  panelW: 1000,
  panelH: 500,
  panelRadius: 18,
  panel1Y: 108,
  panel2Y: 728,
  topY: 72,
  top2Y: 112,
  midY: 668,
  defaultFont: 40,
  midFontLong: 34,
};
