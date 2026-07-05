import path from "path";

const ASSETS = path.join(
  process.env.HOME || "",
  ".cursor",
  "projects",
  "Users-michaelng-Desktop-ai-marketing-studio",
  "assets",
);

/** Primary style reference — soft emotional watercolor manhua (two-panel layout). */
export const STYLE_REF_PATH = path.join(
  ASSETS,
  "set_watercolor_02_love-f7aff7b2-a67c-4199-b62e-7cb7d49befb2.png",
);

export const WATERCOLOR_STYLE_PROMPT = [
  "Recreate IMAGE 1 using the exact artistic style of IMAGE 2.",
  "Soft digital watercolor illustration: wet-on-wet color bleeds, visible paper grain,",
  "delicate thin brown-gray linework (not heavy comic inks), painterly soft edges,",
  "expressive manhua character faces, warm golden or cool blue atmospheric lighting as in IMAGE 1 scenes.",
  "Keep IMAGE 1 composition: two horizontal panels stacked vertically, same story, poses,",
  "car interiors, roads, tunnels, fog, sunrise, mountains, couple in car when shown",
  "(woman long dark wavy hair cream sweater driver; man short dark hair grey hoodie passenger).",
  "Remove ALL text, speech bubbles, watermarks, UI arrows, page numbers.",
  "Leave clean margin at top of each panel area for Chinese captions.",
  "Emotional, gentle, premium Instagram carousel aesthetic. Vertical 4:5.",
].join(" ");
