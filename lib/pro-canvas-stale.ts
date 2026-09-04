import type { Edge, Node } from "@xyflow/react";
import type {
  CameraNodeData,
  CharacterNodeData,
  ImageNodeData,
  ProCanvasNodeData,
  ScriptNodeData,
  VideoNodeData,
} from "@/lib/pro-canvas-types";
import { allUpstreamNodes, nodeHasRunnableOutput } from "@/lib/pro-canvas-graph";

/** Stable fingerprint of inputs that affect a node's generated output. */
export function computeNodeInputFingerprint(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): string {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return "";
  const chunks = [stableNodeInputSlice(node)];
  for (const up of allUpstreamNodes(nodeId, nodes, edges)) {
    chunks.push(stableNodeInputSlice(up));
  }
  return chunks.sort().join("||");
}

function stableNodeInputSlice(node: Node): string {
  const d = node.data as ProCanvasNodeData;
  const id = node.id;
  switch (d.kind) {
    case "script": {
      const s = d as ScriptNodeData;
      return `${id}|script|${s.brief}|${s.sceneCount}|${JSON.stringify(s.sceneBeats ?? [])}|${JSON.stringify(s.scenePrompts ?? [])}|${JSON.stringify(s.sceneImagePrompts ?? [])}`;
    }
    case "image": {
      const img = d as ImageNodeData;
      return `${id}|image|${img.prompt}|${img.sceneIndex ?? ""}|${img.aspectRatio}|${img.resolution}|${img.artStyleId}|${img.lightingPreset}|${img.backgroundPreset}|out:${img.imageUrl ?? ""}`;
    }
    case "video": {
      const v = d as VideoNodeData;
      return `${id}|video|${v.prompt}|${v.sceneIndex ?? ""}|${v.camera}|${v.duration}|${v.resolution}|${v.fast}|${v.motionStrength}|${v.generateAudio}|out:${v.videoUrl ?? ""}`;
    }
    case "textVideo":
      return `${id}|textVideo|${d.prompt}|${d.sceneIndex ?? ""}|${d.duration}|${d.resolution}|${d.fast}|${d.motionStrength}|${d.generateAudio}|out:${d.videoUrl ?? ""}`;
    case "camera": {
      const c = d as CameraNodeData;
      return `${id}|camera|${c.preset}|${c.spin}|${c.tilt}|${c.zoom}|${c.promptExtra}|out:${c.imageUrl ?? ""}`;
    }
    case "upload":
      return `${id}|upload|${d.previewUrl ?? ""}|${d.fileName ?? ""}`;
    case "character": {
      const c = d as CharacterNodeData;
      return `${id}|character|${c.previewUrl ?? ""}|${c.fileName ?? ""}|${c.biography ?? ""}|${c.generatePrompt ?? ""}`;
    }
    case "research":
      return `${id}|research|${d.summary}`;
    case "text":
      return `${id}|text|${d.text}`;
    case "audio":
      return `${id}|audio|${d.audioUrl ?? ""}|${d.fileName ?? ""}`;
    case "voice":
      return `${id}|voice|${d.script}|${d.locale}|${d.voicePresetId}|out:${d.audioUrl ?? ""}`;
    case "world":
      return `${id}|world|${d.description}|${d.previewUrl ?? ""}|${d.fileName ?? ""}`;
    case "storyboard":
      return `${id}|storyboard|${JSON.stringify((d as { acts?: unknown; panels?: unknown }).acts ?? d.panels ?? [])}`;
    case "brainstorm":
      return `${id}|brainstorm|${d.idea}|${d.durationSec}|${d.selectedOptionId ?? ""}|${JSON.stringify(d.options ?? [])}`;
    case "lighting":
      return `${id}|lighting|${d.preset}|${d.custom ?? ""}`;
    case "background":
      return `${id}|background|${d.preset}|${d.custom ?? ""}`;
    case "grade":
      return `${id}|grade|${d.artStyleId}`;
    case "brand":
      return `${id}|brand|${d.logoUrl ?? ""}|${d.tagline ?? ""}|${d.primaryColor ?? ""}`;
    case "splice":
      return `${id}|splice`;
    default:
      return `${id}|unknown`;
  }
}

export function isNodeOutputStale(node: Node, nodes: Node[], edges: Edge[]): boolean {
  if (!nodeHasRunnableOutput(node)) return false;
  const stored = (node.data as { outputInputFingerprint?: string }).outputInputFingerprint;
  if (!stored) return false;
  return stored !== computeNodeInputFingerprint(node.id, nodes, edges);
}

export function nodeNeedsRun(node: Node, nodes: Node[], edges: Edge[]): boolean {
  if (!nodeHasRunnableOutput(node)) return true;
  return isNodeOutputStale(node, nodes, edges);
}
