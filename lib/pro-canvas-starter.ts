import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";

type NodeLabels = Record<string, string>;

function nodeData(kind: ProCanvasNodeData["kind"], label: string): ProCanvasNodeData {
  switch (kind) {
    case "upload":
      return { kind, label };
    case "image":
      return {
        kind,
        label,
        prompt: "Premium vertical product ad, soft studio light, clean background, 9:16",
      };
    case "video":
      return {
        kind,
        label,
        prompt: "Subtle product motion, stable camera, cinematic lighting",
        camera: "Slow Push In",
        duration: "8",
        resolution: "480p",
        fast: true,
      };
    default:
      return { kind: "upload", label };
  }
}

/** Minimal upload → image → video chain for first-time Pro users. */
export function createProCanvasStarter(labels: NodeLabels): {
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
      data: nodeData("upload", uploadLabel),
    },
    {
      id: "starter-image",
      type: "image",
      position: { x: 320, y: 100 },
      data: nodeData("image", imageLabel),
    },
    {
      id: "starter-video",
      type: "video",
      position: { x: 620, y: 100 },
      data: nodeData("video", videoLabel),
    },
  ];

  const edges: Edge[] = [
    { id: "e-upload-image", source: "starter-upload", target: "starter-image" },
    { id: "e-image-video", source: "starter-image", target: "starter-video" },
  ];

  return { nodes, edges, nodeCounterSeed: 3 };
}
