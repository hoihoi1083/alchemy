import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";
import {
  ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
  type ScriptSceneBeat,
} from "@/lib/pro-canvas-script-plan";

const STORY_DIFFERENCE_BRIEF =
  "20s Alchemy difference ad — No Prompt + AI Research. " +
  "Hook: Give us the product. Not the prompt. " +
  "Pain → colleague introduces Alchemy → upload reference → AI research → creative direction → beautiful output → logo CTA. " +
  "Tone: grounded office UGC, 烟火气, same two cast throughout.";

const STORY_DIFFERENCE_BEATS: ScriptSceneBeat[] = [
  {
    time: "0-2s",
    emotion: "frustrated",
    line: "Still writing prompts?",
    framing: "medium close-up",
    camera: "locked tripod",
    blocking: "typing, slumped",
  },
  {
    time: "2-4s",
    emotion: "exhausted loop",
    line: "Prompt → Generate → Wrong → Repeat",
    framing: "OTS screen glow",
    camera: "slow push-in",
    blocking: "micro head shake",
  },
  {
    time: "4-6s",
    emotion: "defeated",
    line: "Worked all day, still not right",
    framing: "wide office",
    camera: "static",
    blocking: "leans back, sigh",
  },
  {
    time: "6-8s",
    emotion: "surprised",
    line: "Haven't you heard of Alchemy?",
    framing: "two-shot",
    camera: "pan to colleague",
    blocking: "colleague enters frame",
  },
  {
    time: "8-12s",
    emotion: "confident demo",
    line: "Give us the product. Not the prompt.",
    framing: "medium",
    camera: "handheld subtle",
    blocking: "shows UI / product",
  },
  {
    time: "12-20s",
    emotion: "payoff + CTA",
    line: "Less prompting. More creating.",
    framing: "product hero + logo",
    camera: "slow push-out",
    blocking: "hold product, smile",
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
      return {
        nodeCounterSeed: 12,
        nodes: [
          node("tpl-char-a", "character", 40, 40, {
            kind: "character",
            label: `${character} A`,
            alias: "PersonA",
            biography:
              "Exhausted office worker, late 20s, typing prompts all day, slouched posture, 烟火气 not glam.",
          }),
          node("tpl-char-b", "character", 40, 200, {
            kind: "character",
            label: `${character} B`,
            alias: "PersonB",
            biography:
              "Confident colleague, introduces Alchemy, warm grounded tone, smart-casual office wear.",
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
          node("tpl-brand", "brand", 280, 40, {
            kind: "brand",
            label: brand,
            alias: "brand",
          }),
          node("tpl-lighting", "lighting", 280, 140, {
            kind: "lighting",
            label: lighting,
            preset: "natural_window",
          }),
          node("tpl-script", "script", 520, 120, {
            kind: "script",
            label: script,
            brief: STORY_DIFFERENCE_BRIEF,
            sceneCount: ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
            sceneBeats: STORY_DIFFERENCE_BEATS,
          }),
          node("tpl-splice", "splice", 920, 200, { kind: "splice", label: splice }),
          node("tpl-audio", "audio", 920, 360, { kind: "audio", label: audio }),
        ],
        edges: [
          edge("e-res-script", "tpl-research", "tpl-script"),
          edge("e-product-script", "tpl-upload-product", "tpl-script"),
          edge("e-ui-script", "tpl-upload-ui", "tpl-script"),
          edge("e-light-script", "tpl-lighting", "tpl-script"),
          edge("e-brand-script", "tpl-brand", "tpl-script"),
          edge("e-char-a-script", "tpl-char-a", "tpl-script"),
          edge("e-char-b-script", "tpl-char-b", "tpl-script"),
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
