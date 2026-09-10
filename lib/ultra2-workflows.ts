import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";
import {
  createProCanvasSingleClipStarter,
  createProCanvasStarter,
} from "@/lib/pro-canvas-starter";
import { DEFAULT_ULTRA_IMAGE_PRO } from "@/lib/ultra-pro-controls";

export type Ultra2WorkflowId =
  | "textToImage"
  | "refToImage"
  | "imagesToVideo"
  | "storyboard"
  | "scratch";

export const ULTRA2_WORKFLOW_IDS: Ultra2WorkflowId[] = [
  "textToImage",
  "refToImage",
  "imagesToVideo",
  "storyboard",
  "scratch",
];

export const ULTRA2_WORKFLOW_SESSION_KEY = "ams-ultra2-workflow-chosen";
export const ULTRA2_DRAFT_KEY = "ams-ultra2-draft-v1";

export type Ultra2Graph = {
  nodes: Node[];
  edges: Edge[];
  nodeCounterSeed: number;
  workflowId: Ultra2WorkflowId;
  /** Open add-node palette after apply */
  openPalette?: boolean;
};

type NodeLabels = Record<string, string>;

function imageNode(
  id: string,
  x: number,
  y: number,
  label: string,
): Node {
  return {
    id,
    type: "image",
    position: { x, y },
    data: {
      kind: "image",
      label,
      prompt: "Premium product still, clean composition, brand-forward lighting",
      aspectRatio: DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
      resolution: DEFAULT_ULTRA_IMAGE_PRO.resolution,
      artStyleId: DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
      lightingPreset: DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
      backgroundPreset: DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
    } satisfies ProCanvasNodeData,
  };
}

/** Prompt-only still — no upload required. */
export function buildTextToImageGraph(labels: NodeLabels): Ultra2Graph {
  const image = labels.image ?? "Image";
  return {
    nodes: [imageNode("u2-image", 280, 140, image)],
    edges: [],
    nodeCounterSeed: 2,
    workflowId: "textToImage",
  };
}

/** Upload reference → generate / edit image. */
export function buildRefToImageGraph(labels: NodeLabels): Ultra2Graph {
  const upload = labels.upload ?? "Upload";
  const image = labels.image ?? "Image";
  return {
    nodes: [
      {
        id: "u2-upload",
        type: "upload",
        position: { x: 40, y: 160 },
        data: {
          kind: "upload",
          label: upload,
          alias: "Reference",
        } satisfies ProCanvasNodeData,
      },
      imageNode("u2-image", 420, 140, image),
    ],
    edges: [{ id: "e-u2-up-img", source: "u2-upload", target: "u2-image" }],
    nodeCounterSeed: 3,
    workflowId: "refToImage",
  };
}

/** Upload → Image → Image-to-video. */
export function buildImagesToVideoGraph(labels: NodeLabels): Ultra2Graph {
  const base = createProCanvasSingleClipStarter(labels);
  return {
    nodes: base.nodes,
    edges: base.edges,
    nodeCounterSeed: base.nodeCounterSeed,
    workflowId: "imagesToVideo",
  };
}

/**
 * Director storyboard kit without the orphan Text-to-video B-lane node.
 * Script → Storyboard → Voice → Splice (+ Audio → Splice); Upload optional upstream of Script.
 */
export function buildStoryboardGraph(labels: NodeLabels): Ultra2Graph {
  const base = createProCanvasStarter(labels);
  const nodes = base.nodes.filter((n) => n.id !== "starter-textVideo");
  return {
    nodes,
    edges: base.edges,
    nodeCounterSeed: base.nodeCounterSeed,
    workflowId: "storyboard",
  };
}

export function buildScratchGraph(): Ultra2Graph {
  return {
    nodes: [],
    edges: [],
    nodeCounterSeed: 1,
    workflowId: "scratch",
    openPalette: true,
  };
}

export function buildUltra2Workflow(
  id: Ultra2WorkflowId,
  labels: NodeLabels,
): Ultra2Graph {
  switch (id) {
    case "textToImage":
      return buildTextToImageGraph(labels);
    case "refToImage":
      return buildRefToImageGraph(labels);
    case "imagesToVideo":
      return buildImagesToVideoGraph(labels);
    case "storyboard":
      return buildStoryboardGraph(labels);
    case "scratch":
      return buildScratchGraph();
  }
}

/** Badges retired for the simple start-picker ultra-2. */
export function ultra2NodeBadge(
  _kind: string,
  _workflowId: Ultra2WorkflowId | null,
): "required" | "optional" | null {
  return null;
}

export function isUltra2WorkflowId(value: unknown): value is Ultra2WorkflowId {
  return (
    typeof value === "string" &&
    (ULTRA2_WORKFLOW_IDS as string[]).includes(value)
  );
}
