import path from "path";
import {
  STYLE_REF_01,
  STYLE_REF_06,
} from "./constants";
import type { JourneyCaption, JourneySlide } from "../journey-unified/content";

export { STYLE_REF_01, STYLE_REF_06 };
export type { JourneyCaption, JourneySlide };

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

/** Latest user attachments: 01+06 watercolor refs; 02–05,07 webtoon sources to recreate. */
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
      "_____2026-06-03___9.06.38-29cd37dd-6bb5-4e9f-a54b-01498f9d05dd.png",
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
      "_____2026-06-03___9.06.52-a171ee8c-c082-4214-bc06-1cdd2d6d3889.png",
    ),
    captions: [
      { text: "千萬不要提前害怕", slot: "top" },
      { text: "那些以為過不去的坎，後來都過去了", slot: "mid", size: 38 },
    ],
  },
  {
    id: 4,
    name: "04-kind-heart-fog",
    sourceFile: asset(
      "_____2026-06-03___9.07.01-995f7932-b8d7-407a-a9a2-02d83c5f48f0.png",
    ),
    captions: [
      { text: "帶著你當初那顆善良的心", slot: "top", size: 38 },
      { text: "前路再黑，霧再大", slot: "top2", size: 38 },
      { text: "你也能安全抵達", slot: "mid" },
    ],
  },
  {
    id: 5,
    name: "05-detour",
    sourceFile: asset("05-detour-1285f9d3-b379-4b97-b171-51629cb4eba6.png"),
    captions: [
      { text: "你以為是繞遠路", slot: "top" },
      { text: "後來才發現，遠路才是最近的路", slot: "mid", size: 38 },
    ],
  },
  {
    id: 6,
    name: "06-exit",
    sourceFile: STYLE_REF_06,
    captions: [
      { text: "後來不都找到了出口", slot: "top", size: 42 },
      { text: "把握當下 勇敢向前", slot: "mid" },
    ],
  },
  {
    id: 7,
    name: "07-no-shortcuts",
    sourceFile: asset(
      "_____2026-06-03___9.06.44-1a0d92e3-b8e9-4ebc-a256-f0a3c3e29313.png",
    ),
    captions: [
      { text: "認真走好當下這條路", slot: "top" },
      { text: "盡量遠離捷徑", slot: "mid" },
    ],
  },
];
