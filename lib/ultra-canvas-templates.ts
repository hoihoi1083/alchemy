import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";
import {
  type ScriptSceneBeat,
} from "@/lib/pro-canvas-script-plan";

/** Creative B V2 QA sheet — hybrid: AI live bookends + your real UI screen record. */
const STORY_DIFFERENCE_BRIEF =
  "Alchemy Creative B V2 — ~23s vertical Reels (9:16). HYBRID cut: " +
  "GENERATE Act 1 live office (0–10.5s) + Act 3 live close (18.5–23s). " +
  "DO NOT AI-generate the middle UI — user supplies a real screen recording for 10.5–18.5s " +
  "(Upload Product/Reference + NO PROMPT + AI RESEARCH + Creative Direction + Final Output). " +
  "USP ONLY: No Prompt + AI Research. " +
  "Hook: Give us the product. Not the prompt. End: Less prompting. More creating. + CTA + domain. " +
  "NO glasses; lock face/hair/clothes; helper sits beside (no shoulder); no wall/cup logos.";

const STORY_DIFFERENCE_WORLD =
  "Contemporary open office, warm overhead LEDs, messy desk with laptop and plain coffee mug (NO logo on mug/wall/corner props), " +
  "soft window daylight from the left. Same room language every shot — do not jump locations. " +
  "Brand logo appears only on phone screen or end card — never as set dressing. " +
  "Middle act is a real monitor screen recording match-cut from OTS — not an invented UI still.";

/**
 * Hybrid 3-act Creative B (matches QA timeline sheet):
 * Act 1 GENERATE 0–10.5s · Act 2 USER screen record 10.5–18.5s · Act 3 GENERATE 18.5–23s
 */
const STORY_DIFFERENCE_BEATS: ScriptSceneBeat[] = [
  {
    act: "Act 1 · Live open (GENERATE)",
    time: "0-10s",
    emotion: "pain → helper",
    line: "Still writing prompts all day? Haven't you heard about Alchemy?",
    speaker: "PersonB",
    framing:
      "0–2s zoom office + girl writing prompts (Hook) · 2–4s Generate→Wrong→Rewrite fast cuts (mute-readable) · " +
      "4–5.5s strongest collapse/pain payoff · 5.5–7.5s friendly male helper · " +
      "7.5–9s he sits beside, she hands mouse · 9–10.5s OTS push into monitor (match-cut ready for screen record)",
    camera: "hook zoom → fast fail cuts → peer sit-down → OTS push into screen",
    blocking:
      "@PersonA NO glasses, typing slumped 烟火气. @PersonB sits BESIDE her — helpful 'I'll show you an easier way', " +
      "NO hand on shoulder, NO standing over. End frame: OTS laptop screen filling frame so next cut is real UI record.",
  },
  {
    act: "Act 2 · Screen demo (YOUR RECORDING)",
    time: "10-18s",
    emotion: "USP demo",
    line: "Give us the product. Not the prompt. Alchemy researches first. Understand first. Create next.",
    speaker: "PersonB",
    framing:
      "USER SCREEN RECORD only — do not AI-fake Alchemy UI. " +
      "10.5–12s Upload Product/Reference + big type NO PROMPT · 12–14.5s AI RESEARCH hero type · " +
      "14.5–16.5s Creative Direction → Create · 16.5–18.5s Final Output beautiful campaign/video",
    camera: "cropped one-feature UI moves; large on-screen USP type",
    blocking:
      "REPLACE THIS CLIP with trimmed real project screen recording (~8s). " +
      "On Ultra: skip Generate for this act — upload/wire the MP4 into Splice as the middle clip. " +
      "VO can still Pull these lines over the recording.",
  },
  {
    act: "Act 3 · Live close (GENERATE)",
    time: "18-24s",
    emotion: "hand-off + brand + CTA",
    line: "Less prompting. More creating.",
    speaker: "PersonB",
    framing:
      "18.5–20s pull back — girl operates herself, helper nods and leaves · " +
      "20–21.5s she shows phone (logo OR final creative only) · 21.5–23s clean end card",
    camera: "pull-out from desk → phone settle → hard cut end card",
    blocking:
      "Same cast lock, NO glasses. Phone = Alchemy logo or final IG creative only (no wall/cup logos). " +
      "End card 1.5–2s: @brand logo + Less prompting. More creating. + CTA + website domain.",
  },
];

import { buildExplosionUnboxVideoPrompt, EXPLOSION_UNBOX_DEFAULT_THEME } from "@/lib/explosion-unbox-prompt";
import { DEFAULT_ULTRA_IMAGE_PRO, DEFAULT_ULTRA_VIDEO_PRO } from "@/lib/ultra-pro-controls";
import {
  DEFAULT_BACKGROUND_MOD_PRESET,
  DEFAULT_GRADE_ART_STYLE,
  DEFAULT_LIGHTING_MOD_PRESET,
} from "@/lib/pro-canvas-modifiers";

export type UltraCanvasTemplateId =
  | "productHero"
  | "ugcReel"
  | "carouselStill"
  | "scriptToFilm"
  | "storyDifferenceAd"
  | "explosionUnbox"
  | "conceptTextVideo"
  | "brandMotionReel";

type NodeLabels = Record<string, string>;

function node(
  id: string,
  type: string,
  x: number,
  y: number,
  data: ProCanvasNodeData,
): Node {
  return { id, type, position: { x, y }, data };
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

export function createUltraCanvasTemplate(
  templateId: UltraCanvasTemplateId,
  labels: NodeLabels,
): { nodes: Node[]; edges: Edge[]; nodeCounterSeed: number } {
  switch (templateId) {
    case "productHero": {
      const upload = labels.upload ?? "Upload";
      const image = labels.image ?? "Image";
      const lighting = labels.lighting ?? "Lighting";
      const video = labels.video ?? "Image-to-video";
      const splice = labels.splice ?? "Video splice";
      return {
        nodeCounterSeed: 5,
        nodes: [
          node("tpl-upload", "upload", 40, 140, { kind: "upload", label: upload, alias: "Product" }),
          node("tpl-lighting", "lighting", 40, 20, {
            kind: "lighting",
            label: lighting,
            preset: DEFAULT_LIGHTING_MOD_PRESET,
          }),
          node("tpl-image", "image", 300, 100, {
            kind: "image",
            label: image,
            prompt: "Premium product hero shot, clean composition, brand-forward",
            aspectRatio: DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
            resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
            lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
            backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
          }),
          node("tpl-video", "video", 580, 100, {
            kind: "video",
            label: video,
            prompt: "Subtle hero motion, premium ad feel",
            camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
            duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
            resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
            fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
            aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
            artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
          }),
          node("tpl-splice", "splice", 860, 100, { kind: "splice", label: splice }),
        ],
        edges: [
          edge("e-l-img", "tpl-lighting", "tpl-image"),
          edge("e-u-img", "tpl-upload", "tpl-image"),
          edge("e-img-vid", "tpl-image", "tpl-video"),
          edge("e-vid-spl", "tpl-video", "tpl-splice"),
        ],
      };
    }
    case "ugcReel": {
      const script = labels.script ?? "Script planning";
      const textVideo = labels.textVideo ?? "Text-to-video";
      const audio = labels.audio ?? "Audio";
      const splice = labels.splice ?? "Video splice";
      return {
        nodeCounterSeed: 4,
        nodes: [
          node("tpl-script", "script", 60, 120, {
            kind: "script",
            label: script,
            brief: "UGC-style reel: authentic hook, product demo, CTA — vertical 9:16",
          }),
          node("tpl-tv", "textVideo", 360, 120, {
            kind: "textVideo",
            label: textVideo,
            prompt: "",
            sceneIndex: 0,
            duration: "8",
            resolution: "480p",
            fast: true,
            aspectRatio: "9:16",
          }),
          node("tpl-audio", "audio", 360, 280, { kind: "audio", label: audio, alias: "BGM" }),
          node("tpl-splice", "splice", 660, 120, { kind: "splice", label: splice }),
        ],
        edges: [
          edge("e-sc-tv", "tpl-script", "tpl-tv"),
          edge("e-tv-sp", "tpl-tv", "tpl-splice"),
          edge("e-au-sp", "tpl-audio", "tpl-splice"),
        ],
      };
    }
    case "carouselStill": {
      const upload = labels.upload ?? "Upload";
      const grade = labels.grade ?? "Look grade";
      const bg = labels.background ?? "Background";
      const image = labels.image ?? "Image";
      return {
        nodeCounterSeed: 4,
        nodes: [
          node("tpl-upload", "upload", 60, 160, { kind: "upload", label: upload, alias: "Product" }),
          node("tpl-grade", "grade", 60, 40, {
            kind: "grade",
            label: grade,
            artStyleId: DEFAULT_GRADE_ART_STYLE,
          }),
          node("tpl-bg", "background", 60, 280, {
            kind: "background",
            label: bg,
            preset: DEFAULT_BACKGROUND_MOD_PRESET,
          }),
          node("tpl-image", "image", 340, 140, {
            kind: "image",
            label: image,
            prompt: "Carousel slide, bold typography space, product hero",
            aspectRatio: "4:5",
            resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: DEFAULT_GRADE_ART_STYLE,
            lightingPreset: "studio_soft",
            backgroundPreset: "clean_studio",
          }),
        ],
        edges: [
          edge("e-gr-img", "tpl-grade", "tpl-image"),
          edge("e-bg-img", "tpl-bg", "tpl-image"),
          edge("e-up-img", "tpl-upload", "tpl-image"),
        ],
      };
    }
    case "scriptToFilm": {
      const script = labels.script ?? "Script planning";
      const image = labels.image ?? "Image";
      const video = labels.video ?? "Image-to-video";
      const splice = labels.splice ?? "Video splice";
      return {
        nodeCounterSeed: 4,
        nodes: [
          node("tpl-script", "script", 40, 120, {
            kind: "script",
            label: script,
            brief: "3-scene cinematic product film — hook, demo, payoff",
          }),
          node("tpl-image", "image", 320, 80, {
            kind: "image",
            label: `${image} 1`,
            prompt: "",
            sceneIndex: 0,
            aspectRatio: "9:16",
            resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
            artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
            lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
            backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
          }),
          node("tpl-video", "video", 600, 80, {
            kind: "video",
            label: `${video} 1`,
            prompt: "",
            sceneIndex: 0,
            camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
            duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
            resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
            fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
            aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
          }),
          node("tpl-splice", "splice", 880, 120, { kind: "splice", label: splice }),
        ],
        edges: [
          edge("e-sc-img", "tpl-script", "tpl-image"),
          edge("e-img-vid", "tpl-image", "tpl-video"),
          edge("e-vid-sp", "tpl-video", "tpl-splice"),
        ],
      };
    }
    case "storyDifferenceAd": {
      const script = labels.script ?? "Script planning";
      const character = labels.character ?? "Character";
      const upload = labels.upload ?? "Upload";
      const research = labels.research ?? "Research";
      const brand = labels.brand ?? "Brand kit";
      const lighting = labels.lighting ?? "Lighting";
      const splice = labels.splice ?? "Video splice";
      const audio = labels.audio ?? "Audio";
      const world = labels.world ?? "World / scene";
      const storyboard = labels.storyboard ?? "Storyboard";
      const voice = labels.voice ?? "Voice";
      const brainstorm = labels.brainstorm ?? "Brainstorm";
      return {
        nodeCounterSeed: 16,
        nodes: [
          node("tpl-char-a", "character", 40, 40, {
            kind: "character",
            label: `${character} A`,
            alias: "PersonA",
            biography:
              "Exhausted office worker, late 20s, typing prompts all day, slouched 烟火气 not glam. " +
              "NO glasses ever. Lock one face, hair, and outfit across every shot.",
          }),
          node("tpl-char-b", "character", 40, 200, {
            kind: "character",
            label: `${character} B`,
            alias: "PersonB",
            biography:
              "Helpful peer colleague (not a boss). Warm grounded tone, smart-casual office wear. " +
              "Sits beside her and points at the screen — never hand on shoulder, never stands over her. " +
              "NO glasses. Same face/hair/clothes lock as PersonA continuity.",
          }),
          node("tpl-upload-product", "upload", 40, 360, {
            kind: "upload",
            label: `${upload} · product`,
            alias: "Product",
          }),
          node("tpl-upload-ui", "upload", 40, 520, {
            kind: "upload",
            label: `${upload} · UI`,
            alias: "UI",
          }),
          node("tpl-research", "research", 40, 680, {
            kind: "research",
            label: research,
            summary: "",
          }),
          node("tpl-brainstorm", "brainstorm", 280, 500, {
            kind: "brainstorm",
            label: brainstorm,
            idea:
              "Creative B V2 HYBRID — AI Act1+Act3 · your screen record 10.5–18.5s · 9:16 · ~23s",
            durationSec: 23,
          }),
          node("tpl-world", "world", 280, 40, {
            kind: "world",
            label: world,
            alias: "World",
            description: STORY_DIFFERENCE_WORLD,
          }),
          node("tpl-brand", "brand", 280, 220, {
            kind: "brand",
            label: brand,
            alias: "brand",
          }),
          node("tpl-lighting", "lighting", 280, 340, {
            kind: "lighting",
            label: lighting,
            preset: "natural_window",
          }),
          node("tpl-script", "script", 520, 120, {
            kind: "script",
            label: script,
            brief: STORY_DIFFERENCE_BRIEF,
            sceneCount: STORY_DIFFERENCE_BEATS.length,
            sceneBeats: STORY_DIFFERENCE_BEATS,
          }),
          node("tpl-storyboard", "storyboard", 780, 120, {
            kind: "storyboard",
            label: storyboard,
            panels: [],
            acts: [],
          }),
          node("tpl-voice", "voice", 1040, 360, {
            kind: "voice",
            label: voice,
            script: "",
            locale: "en",
            voicePresetId: "en-male",
          }),
          node("tpl-splice", "splice", 1040, 200, { kind: "splice", label: splice }),
          node("tpl-audio", "audio", 1040, 520, { kind: "audio", label: audio }),
        ],
        edges: [
          edge("e-res-script", "tpl-research", "tpl-script"),
          edge("e-product-script", "tpl-upload-product", "tpl-script"),
          edge("e-ui-script", "tpl-upload-ui", "tpl-script"),
          edge("e-light-script", "tpl-lighting", "tpl-script"),
          edge("e-brand-script", "tpl-brand", "tpl-script"),
          edge("e-world-script", "tpl-world", "tpl-script"),
          edge("e-brain-script", "tpl-brainstorm", "tpl-script"),
          edge("e-char-a-script", "tpl-char-a", "tpl-script"),
          edge("e-char-b-script", "tpl-char-b", "tpl-script"),
          edge("e-script-board", "tpl-script", "tpl-storyboard"),
          edge("e-script-voice", "tpl-script", "tpl-voice"),
          edge("e-board-voice", "tpl-storyboard", "tpl-voice"),
          edge("e-voice-splice", "tpl-voice", "tpl-splice"),
          edge("e-audio-splice", "tpl-audio", "tpl-splice"),
        ],
      };
    }
    case "explosionUnbox": {
      const textVideo = labels.textVideo ?? "Text-to-video";
      const theme = EXPLOSION_UNBOX_DEFAULT_THEME;
      return {
        nodeCounterSeed: 1,
        nodes: [
          node("tpl-tv", "textVideo", 120, 140, {
            kind: "textVideo",
            label: textVideo,
            prompt: buildExplosionUnboxVideoPrompt(theme),
            duration: "8",
            resolution: "480p",
            fast: true,
            aspectRatio: "9:16",
            generateAudio: true,
          }),
        ],
        edges: [],
      };
    }
    case "conceptTextVideo": {
      const textVideo = labels.textVideo ?? "Text-to-video";
      return {
        nodeCounterSeed: 1,
        nodes: [
          node("tpl-tv", "textVideo", 120, 140, {
            kind: "textVideo",
            label: textVideo,
            prompt:
              "Cinematic concept reel — dramatic lighting, emotional pacing, no on-screen text. Describe your theme here.",
            duration: "8",
            resolution: "480p",
            fast: true,
            aspectRatio: "9:16",
            generateAudio: true,
          }),
        ],
        edges: [],
      };
    }
    case "brandMotionReel": {
      const script = labels.script ?? "Script planning";
      const textVideo = labels.textVideo ?? "Text-to-video";
      const splice = labels.splice ?? "Video splice";
      return {
        nodeCounterSeed: 3,
        nodes: [
          node("tpl-script", "script", 60, 120, {
            kind: "script",
            label: script,
            brief: "Brand motion reel — hook, product story, CTA. Vertical 9:16, no on-screen text.",
          }),
          node("tpl-tv", "textVideo", 360, 120, {
            kind: "textVideo",
            label: textVideo,
            prompt: "",
            sceneIndex: 0,
            duration: "8",
            resolution: "480p",
            fast: true,
            aspectRatio: "9:16",
          }),
          node("tpl-splice", "splice", 660, 120, { kind: "splice", label: splice }),
        ],
        edges: [
          edge("e-sc-tv", "tpl-script", "tpl-tv"),
          edge("e-tv-sp", "tpl-tv", "tpl-splice"),
        ],
      };
    }
  }
}

export const ULTRA_CANVAS_TEMPLATE_IDS: UltraCanvasTemplateId[] = [
  "productHero",
  "storyDifferenceAd",
  "explosionUnbox",
  "conceptTextVideo",
  "brandMotionReel",
  "ugcReel",
  "carouselStill",
  "scriptToFilm",
];
