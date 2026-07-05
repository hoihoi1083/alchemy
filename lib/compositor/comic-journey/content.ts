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

export type ComicCaption = { text: string; y: number; size?: number };

export type ComicSlide = {
  id: number;
  name: string;
  sourceFile: string;
  captions: ComicCaption[];
  sceneHint: string;
};

export const COMIC_STYLE_PROMPT = [
  "Transform IMAGE 1 into American graphic novel comic book illustration.",
  "Bold black ink outlines with varied line weight, dramatic cel shading, saturated colors,",
  "subtle halftone Ben-Day dot texture in shadows.",
  "Keep the exact same two-panel vertical layout, same scenes, poses, and character designs:",
  "young Asian woman with long wavy black hair in cream sweater (driver);",
  "young Asian man with short black hair in grey hoodie (passenger when shown).",
  "Same backgrounds: roads, tunnels, fog, sunrise, mountains, car interiors.",
  "Remove ALL text, watermarks, logos, UI arrows, and page numbers.",
  "Leave clean white margins above each panel for captions.",
  "No speech bubbles. Vertical 4:5.",
].join(" ");

export const COMIC_SLIDES: ComicSlide[] = [
  {
    id: 1,
    name: "01-future-fork",
    sourceFile: asset(
      "_____2026-06-03___9.06.31-5798fc63-3255-4208-9a2c-37c304757612.png",
    ),
    captions: [
      { text: "當你不知道未來會怎樣", y: 62, size: 40 },
      { text: "你只需要握緊方向盤", y: 502, size: 40 },
    ],
    sceneHint: "fork in road pink and blue paths, then autumn road couple focused",
  },
  {
    id: 2,
    name: "02-headlights",
    sourceFile: asset(
      "_____2026-06-03___9.06.38-5fb961f7-7bf9-42b5-a7b2-12e92bf6746c.png",
    ),
    captions: [
      { text: "車燈只能照亮五十米", y: 62, size: 40 },
      { text: "但你一樣能開完全程", y: 502, size: 40 },
    ],
    sceneHint: "night drive headlights on winding road, then starry night mountain highway",
  },
  {
    id: 3,
    name: "03-tunnel",
    sourceFile: asset(
      "_____2026-06-03___9.06.52-7768e94b-b593-4584-88bd-0b329d4c89e6.png",
    ),
    captions: [
      { text: "千萬不要提前害怕", y: 62, size: 40 },
      { text: "那些以為過不去的坎，後來都過去了", y: 498, size: 34 },
    ],
    sceneHint: "scared couple in dark tunnel, then smiling exiting into sunny mountains",
  },
  {
    id: 4,
    name: "04-kind-heart-fog",
    sourceFile: asset(
      "_____2026-06-03___9.07.01-f1127860-79ca-4fe5-8669-e5bc4b4a2d12.png",
    ),
    captions: [
      { text: "帶著你當初那顆善良的心", y: 48, size: 36 },
      { text: "前路再黑，霧再大", y: 88, size: 36 },
      { text: "你也能安全抵達", y: 512, size: 40 },
    ],
    sceneHint: "foggy night drive, then couple at coastal sunrise by car",
  },
  {
    id: 5,
    name: "05-detour",
    sourceFile: asset(
      "_____2026-06-03___9.06.48-afc317cc-168d-467a-95a8-c50941cc61ab.png",
    ),
    captions: [
      { text: "你以為是繞遠路", y: 62, size: 40 },
      { text: "後來才發現，遠路才是最近的路", y: 500, size: 34 },
    ],
    sceneHint: "pink blossom winding road, then overlook with sinkhole in road below",
  },
  {
    id: 6,
    name: "06-exit",
    sourceFile: asset(
      "_____2026-06-03___9.06.57-33991cf3-600f-4487-ab77-fcd54d4dad30.png",
    ),
    captions: [
      { text: "後來不都找到了出口", y: 62, size: 38 },
      { text: "把握當下 勇敢向前", y: 502, size: 40 },
    ],
    sceneHint: "surprised driver at dead end wall, then happy couple on open highway",
  },
  {
    id: 7,
    name: "07-no-shortcuts",
    sourceFile: asset(
      "_____2026-06-03___9.06.44-1cf80b26-394d-4b4a-85dd-91f45227e870.png",
    ),
    captions: [
      { text: "認真走好當下這條路", y: 62, size: 40 },
      { text: "盡量遠離捷徑", y: 502, size: 40 },
    ],
    sceneHint: "coastal sunset drive, then daytime highway with exit sign",
  },
];

export const W = 1080;
export const H = 1350;
