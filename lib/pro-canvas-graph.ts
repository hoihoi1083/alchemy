import type { Edge, Node } from "@xyflow/react";
import type {
  AudioNodeData,
  CameraNodeData,
  CanvasImageSource,
  ImageNodeData,
  ProCanvasNodeData,
  ScriptNodeData,
  TextNodeData,
  TextVideoNodeData,
  UploadNodeData,
  VideoNodeData,
} from "@/lib/pro-canvas-types";

export function topoSortNodes(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const queue = [...nodes].filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  const sorted: Node[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    sorted.push(n);
    for (const t of adj.get(n.id) ?? []) {
      const d = (inDegree.get(t) ?? 1) - 1;
      inDegree.set(t, d);
      if (d === 0) {
        const node = nodes.find((x) => x.id === t);
        if (node) queue.push(node);
      }
    }
  }
  return sorted.length === nodes.length ? sorted : nodes;
}

export function upstreamNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const ids = edges.filter((e) => e.target === nodeId).map((e) => e.source);
  return ids.map((id) => nodes.find((n) => n.id === id)).filter((n): n is Node => !!n);
}

export function nodeAlias(node: Node): string {
  const data = node.data as ProCanvasNodeData;
  return (data.alias?.trim() || data.label || node.id).replace(/\s+/g, "_");
}

export function mentionableNodes(nodes: Node[], excludeId?: string): { id: string; alias: string; label: string }[] {
  return nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => {
      const data = n.data as ProCanvasNodeData;
      return { id: n.id, alias: nodeAlias(n), label: data.label };
    });
}

export function resolveMentions(text: string, nodes: Node[]): string {
  let out = text;
  for (const n of nodes) {
    const alias = nodeAlias(n);
    const re = new RegExp(`@${alias}\\b`, "gi");
    const data = n.data as ProCanvasNodeData;
    out = out.replace(re, data.label);
  }
  return out;
}

export function mentionedNodeIds(text: string, nodes: Node[]): string[] {
  return mentionedNodesInOrder(text, nodes).map((n) => n.id);
}

/** @mentions in left-to-right prompt order (first occurrence wins per node). */
export function mentionedNodesInOrder(text: string, nodes: Node[]): Node[] {
  const matches: { index: number; node: Node }[] = [];
  for (const n of nodes) {
    const alias = nodeAlias(n);
    const re = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      matches.push({ index: match.index, node: n });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  const ordered: Node[] = [];
  for (const { node } of matches) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      ordered.push(node);
    }
  }
  return ordered;
}

/** Collect upstream / @mentioned image sources in slot order for compose. */
export function collectOrderedImageSources(
  nodeId: string,
  prompt: string,
  nodes: Node[],
  edges: Edge[],
  getFile?: (id: string) => File | undefined,
): CanvasImageSource[] {
  const connected = upstreamNodes(nodeId, nodes, edges);
  const mentioned = mentionedNodesInOrder(prompt, nodes);

  const orderedNodes: Node[] = [];
  const seen = new Set<string>();
  for (const n of mentioned) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      orderedNodes.push(n);
    }
  }
  for (const n of connected) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      orderedNodes.push(n);
    }
  }

  const sources: CanvasImageSource[] = [];
  for (const src of orderedNodes) {
    const alias = nodeAlias(src);
    const file = getFile?.(src.id);
    const url = imageUrlFromNode(src);

    if (file) {
      sources.push({ nodeId: src.id, alias, file });
    } else if (url?.startsWith("http")) {
      sources.push({ nodeId: src.id, alias, url });
    }
  }
  return sources;
}

export function imageUrlFromNode(node: Node): string | undefined {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "upload") return (data as UploadNodeData).previewUrl;
  if (data.kind === "image" || data.kind === "camera") {
    return (data as ImageNodeData | CameraNodeData).imageUrl;
  }
  return undefined;
}

export function videoUrlFromNode(node: Node): string | undefined {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "video" || data.kind === "textVideo" || data.kind === "splice") {
    return (data as VideoNodeData | TextVideoNodeData | { videoUrl?: string }).videoUrl;
  }
  return undefined;
}

export function textFromNode(node: Node): string | undefined {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "text") return (data as TextNodeData).text;
  if (data.kind === "script") return (data as ScriptNodeData).scriptText;
  return undefined;
}

export function audioUrlFromNode(node: Node): string | undefined {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "audio") return (data as AudioNodeData).audioUrl;
  return undefined;
}

export function isRunnableNode(node: Node): boolean {
  const kind = (node.data as ProCanvasNodeData).kind;
  return kind !== "upload" && kind !== "text";
}

export function runnableLabel(node: Node): string {
  return (node.data as ProCanvasNodeData).label;
}
