import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";
import { DEFAULT_ULTRA_IMAGE_PRO, DEFAULT_ULTRA_VIDEO_PRO } from "@/lib/ultra-pro-controls";
import { ULTRA_SCRIPT_SCENE_COUNT_DEFAULT } from "@/lib/pro-canvas-script-plan";

type NodeLabels = Record<string, string>;

/**
 * Default Ultra board: director kit for any brief
 * (Script → Storyboard → Voice → Splice + optional upload).
 * Not Creative-B-specific — empty beats until Plan.
 */
export function createProCanvasStarter(labels: NodeLabels): {
  nodes: Node[];
  edges: Edge[];
  nodeCounterSeed: number;
} {
  const upload = labels.upload ?? "Upload";
  const script = labels.script ?? "Script planning";
  const storyboard = labels.storyboard ?? "Storyboard";
  const voice = labels.voice ?? "Voice";
  const splice = labels.splice ?? "Video splice";
  const audio = labels.audio ?? "Audio";

  const nodes: Node[] = [
    {
      id: "starter-upload",
      type: "upload",
      position: { x: 40, y: 200 },
      data: { kind: "upload", label: upload, alias: "Product" } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-script",
      type: "script",
      position: { x: 300, y: 80 },
      data: {
        kind: "script",
        label: script,
        brief: "",
        sceneCount: ULTRA_SCRIPT_SCENE_COUNT_DEFAULT,
        sceneBeats: [],
      } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-storyboard",
      type: "storyboard",
      position: { x: 580, y: 80 },
      data: {
        kind: "storyboard",
        label: storyboard,
        panels: [],
        acts: [],
      } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-voice",
      type: "voice",
      position: { x: 860, y: 280 },
      data: {
        kind: "voice",
        label: voice,
        script: "",
        locale: "en",
        voicePresetId: "en-male",
      } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-splice",
      type: "splice",
      position: { x: 860, y: 80 },
      data: { kind: "splice", label: splice } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-audio",
      type: "audio",
      position: { x: 860, y: 440 },
      data: { kind: "audio", label: audio } satisfies ProCanvasNodeData,
    },
  ];

  const edges: Edge[] = [
    { id: "e-upload-script", source: "starter-upload", target: "starter-script" },
    { id: "e-script-board", source: "starter-script", target: "starter-storyboard" },
    { id: "e-script-voice", source: "starter-script", target: "starter-voice" },
    { id: "e-board-voice", source: "starter-storyboard", target: "starter-voice" },
    { id: "e-voice-splice", source: "starter-voice", target: "starter-splice" },
    { id: "e-audio-splice", source: "starter-audio", target: "starter-splice" },
  ];

  return { nodes, edges, nodeCounterSeed: 6 };
}

/** Legacy single-clip chain (upload → image → video) if needed elsewhere. */
export function createProCanvasSingleClipStarter(labels: NodeLabels): {
  nodes: Node[];
  edges: Edge[];
  nodeCounterSeed: number;
} {
  const uploadLabel = labels.upload ?? "Upload";
  const imageLabel = labels.image ?? "Image";
  const videoLabel = labels.video ?? "Image-to-video";

  const nodes: Node[] = [
    {
      id: "starter-upload",
      type: "upload",
      position: { x: 40, y: 120 },
      data: { kind: "upload", label: uploadLabel } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-image",
      type: "image",
      position: { x: 320, y: 100 },
      data: {
        kind: "image",
        label: imageLabel,
        prompt: "Premium vertical product ad, soft studio light, clean background, 9:16",
        aspectRatio: DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
        resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
        artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
        lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
        backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
      } satisfies ProCanvasNodeData,
    },
    {
      id: "starter-video",
      type: "video",
      position: { x: 620, y: 100 },
      data: {
        kind: "video",
        label: videoLabel,
        prompt: "Subtle product motion, stable camera, cinematic lighting",
        camera: DEFAULT_ULTRA_VIDEO_PRO.camera,
        duration: DEFAULT_ULTRA_VIDEO_PRO.duration,
        resolution: DEFAULT_ULTRA_VIDEO_PRO.resolution,
        fast: DEFAULT_ULTRA_VIDEO_PRO.fast,
        aspectRatio: DEFAULT_ULTRA_VIDEO_PRO.aspectRatio,
        artStyleId: DEFAULT_ULTRA_VIDEO_PRO.artStyleId,
        generateAudio: DEFAULT_ULTRA_VIDEO_PRO.generateAudio,
        motionStrength: DEFAULT_ULTRA_VIDEO_PRO.motionStrength ?? 35,
      } satisfies ProCanvasNodeData,
    },
  ];

  const edges: Edge[] = [
    { id: "e-upload-image", source: "starter-upload", target: "starter-image" },
    { id: "e-image-video", source: "starter-image", target: "starter-video" },
  ];

  return { nodes, edges, nodeCounterSeed: 3 };
}
