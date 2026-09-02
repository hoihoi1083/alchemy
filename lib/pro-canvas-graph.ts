import type { Edge, Node } from "@xyflow/react";
import type {
  AudioNodeData,
  BrandNodeData,
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
import { appendModifierSuffix, backgroundModClause, gradeModClause, lightingModClause } from "@/lib/pro-canvas-modifiers";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

function escapeRegexAlias(alias: string): string {
  return alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasMentionRegex(alias: string): RegExp {
  return new RegExp(`@${escapeRegexAlias(alias)}(?=\\s|$|[^\\w])`, "gi");
}

export type TopoSortResult = {
  sorted: Node[];
  hasCycle: boolean;
};

export function topoSortNodes(nodes: Node[], edges: Edge[]): Node[] {
  return topoSortNodesDetailed(nodes, edges).sorted;
}

export function topoSortNodesDetailed(nodes: Node[], edges: Edge[]): TopoSortResult {
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
  return {
    sorted: sorted.length === nodes.length ? sorted : nodes,
    hasCycle: sorted.length !== nodes.length,
  };
}

export function upstreamNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const ids = edges.filter((e) => e.target === nodeId).map((e) => e.source);
  return ids.map((id) => nodes.find((n) => n.id === id)).filter((n): n is Node => !!n);
}

/** Stable clip/source order: top-to-bottom, then left-to-right on the canvas. */
export function sortNodesByCanvasPosition(nodes: Node[]): Node[] {
  return [...nodes].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  );
}

export function upstreamNodesSorted(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  return sortNodesByCanvasPosition(upstreamNodes(nodeId, nodes, edges));
}

export function nodeHasRunnableOutput(node: Node): boolean {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "image" || data.kind === "camera") {
    return isHttpOrLibraryMediaUrl(imageUrlFromNode(node));
  }
  if (data.kind === "video" || data.kind === "textVideo" || data.kind === "splice") {
    return isHttpOrLibraryMediaUrl(videoUrlFromNode(node));
  }
  if (data.kind === "script") {
    return Boolean((data as ScriptNodeData).scenePrompts?.length);
  }
  if (data.kind === "audio") {
    return isHttpOrLibraryMediaUrl(audioUrlFromNode(node));
  }
  return false;
}

/** Walk upstream graph recursively (for modifier nodes). */
export function allUpstreamNodes(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  visited = new Set<string>(),
): Node[] {
  const direct = upstreamNodes(nodeId, nodes, edges);
  const result: Node[] = [];
  for (const n of direct) {
    if (visited.has(n.id)) continue;
    visited.add(n.id);
    result.push(n);
    result.push(...allUpstreamNodes(n.id, nodes, edges, visited));
  }
  return result;
}

export function collectUpstreamModifierSuffix(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): string {
  const parts: string[] = [];
  for (const n of allUpstreamNodes(nodeId, nodes, edges)) {
    const data = n.data as ProCanvasNodeData;
    if (data.kind === "lighting") {
      const clause = lightingModClause(data);
      if (clause) parts.push(`Lighting: ${clause}`);
    } else if (data.kind === "background") {
      const clause = backgroundModClause(data);
      if (clause) parts.push(`Background: ${clause}`);
    } else if (data.kind === "grade") {
      const clause = gradeModClause(data);
      if (clause) parts.push(clause);
    }
  }
  return parts.filter(Boolean).join("\n\n");
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
    const re = aliasMentionRegex(alias);
    const data = n.data as ProCanvasNodeData;
    out = out.replace(re, data.label);
  }
  return out;
}

/** Nodes that can supply image refs when @mentioned. */
function isMentionImageSource(node: Node): boolean {
  const kind = (node.data as ProCanvasNodeData).kind;
  return kind === "upload" || kind === "image" || kind === "camera" || kind === "brand";
}

function promptForMentionDeps(node: Node): string {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "image") return (data as ImageNodeData).prompt;
  if (data.kind === "video") return (data as VideoNodeData).prompt;
  if (data.kind === "textVideo") return (data as TextVideoNodeData).prompt;
  return "";
}

/** Extra edges so @mentioned sources run before dependents in Run all. */
export function mentionDependencyEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const synthetic: Edge[] = [];
  for (const n of nodes) {
    if (!isRunnableNode(n)) continue;
    const prompt = promptForMentionDeps(n);
    if (!prompt.trim()) continue;
    for (const src of mentionedNodesInOrder(prompt, nodes)) {
      if (src.id === n.id || !isMentionImageSource(src)) continue;
      synthetic.push({
        id: `mention-${src.id}-${n.id}`,
        source: src.id,
        target: n.id,
      });
    }
  }
  const seen = new Set(edges.map((e) => `${e.source}->${e.target}`));
  return [
    ...edges,
    ...synthetic.filter((e) => !seen.has(`${e.source}->${e.target}`)),
  ];
}

export function runnableExecutionOrder(
  nodes: Node[],
  edges: Edge[],
): { sorted: Node[]; error?: string } {
  const combined = mentionDependencyEdges(nodes, edges);
  const { sorted, hasCycle } = topoSortNodesDetailed(nodes, combined);
  if (hasCycle) {
    return { sorted: [], error: "Circular dependency — check node connections and @mentions." };
  }
  return { sorted: sorted.filter(isRunnableNode) };
}

export function findMissingImageSources(
  nodeId: string,
  prompt: string,
  nodes: Node[],
  edges: Edge[],
  getFile?: (id: string) => File | undefined,
): string | null {
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

  for (const src of orderedNodes) {
    const data = src.data as ProCanvasNodeData;
    const label = data.label;
    const file = getFile?.(src.id);
    const url = imageUrlFromNode(src);
    const durable = isHttpOrLibraryMediaUrl(url);
    const isMentioned = mentioned.some((n) => n.id === src.id);

    if (data.kind === "upload") {
      if (!file && !durable) {
        const alias = nodeAlias(src);
        return isMentioned
          ? `Re-attach or upload source for @${alias} (${label}) before running.`
          : `Upload or pick from library for connected source (${label}) before running.`;
      }
      continue;
    }

    if (data.kind === "brand" && (isMentioned || connected.some((n) => n.id === src.id))) {
      if (!durable) {
        return `Brand node (${label}) needs a logo — open brand kit or upload.`;
      }
      continue;
    }

    if ((data.kind === "image" || data.kind === "camera") && isMentioned && !durable) {
      const alias = nodeAlias(src);
      return `Run or connect output for @${alias} (${label}) before running.`;
    }
  }

  if (mentioned.length > 0) {
    const sources = collectOrderedImageSources(nodeId, prompt, nodes, edges, getFile);
    if (sources.length === 0) {
      return "Image sources for @mentions are missing — re-upload or pick from library.";
    }
  }
  return null;
}

export function uploadNodeNeedsAsset(node: Node, getFile?: (id: string) => File | undefined): boolean {
  const data = node.data as ProCanvasNodeData;
  if (data.kind !== "upload") return false;
  const url = (data as UploadNodeData).previewUrl;
  return !getFile?.(node.id) && !isHttpOrLibraryMediaUrl(url);
}

export function mentionedNodeIds(text: string, nodes: Node[]): string[] {
  return mentionedNodesInOrder(text, nodes).map((n) => n.id);
}

/** @mentions in left-to-right prompt order (first occurrence wins per node). */
export function mentionedNodesInOrder(text: string, nodes: Node[]): Node[] {
  const matches: { index: number; node: Node }[] = [];
  for (const n of nodes) {
    const alias = nodeAlias(n);
    const re = aliasMentionRegex(alias);
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
    } else if (url && isHttpOrLibraryMediaUrl(url)) {
      sources.push({ nodeId: src.id, alias, url });
    }
  }
  return sources;
}

export function imageUrlFromNode(node: Node): string | undefined {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "upload") {
    const url = (data as UploadNodeData).previewUrl;
    if (isHttpOrLibraryMediaUrl(url)) return url;
    return url;
  }
  if (data.kind === "brand") {
    return (data as BrandNodeData).logoUrl;
  }
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

/** Merge script scene prompts, upstream text, and @mentions for video nodes. */
export function resolveCanvasVideoPrompt(opts: {
  nodeId: string;
  basePrompt: string;
  sceneIndex?: number;
  nodes: Node[];
  edges: Edge[];
}): string {
  let prompt = opts.basePrompt.trim();
  const upstream = upstreamNodes(opts.nodeId, opts.nodes, opts.edges);
  const script = upstream.find((n) => (n.data as ProCanvasNodeData).kind === "script");
  if (script) {
    const scenes = (script.data as ScriptNodeData).scenePrompts ?? [];
    if (opts.sceneIndex != null && scenes[opts.sceneIndex]) {
      const sceneLine = scenes[opts.sceneIndex]!.trim();
      prompt = prompt ? `${sceneLine}\n\n${prompt}` : sceneLine;
    } else if (!prompt && scenes.length) {
      prompt = scenes.join("\n\n");
    }
  }
  const texts = upstream
    .map(textFromNode)
    .filter((t): t is string => !!t?.trim() && t.trim() !== prompt);
  const merged = [prompt, ...texts].filter(Boolean).join("\n\n");
  const withMentions = resolveMentions(merged, opts.nodes);
  const modifiers = collectUpstreamModifierSuffix(opts.nodeId, opts.nodes, opts.edges);
  return appendModifierSuffix(withMentions, modifiers);
}

/** Merge script scenes, text, @mentions, and upstream modifier nodes for image prompts. */
export function resolveCanvasImagePrompt(opts: {
  nodeId: string;
  basePrompt: string;
  sceneIndex?: number;
  nodes: Node[];
  edges: Edge[];
}): string {
  let prompt = opts.basePrompt.trim();
  const upstream = upstreamNodes(opts.nodeId, opts.nodes, opts.edges);
  const script = upstream.find((n) => (n.data as ProCanvasNodeData).kind === "script");
  if (script) {
    const scenes = (script.data as ScriptNodeData).scenePrompts ?? [];
    if (opts.sceneIndex != null && scenes[opts.sceneIndex]) {
      const sceneLine = scenes[opts.sceneIndex]!.trim();
      prompt = prompt ? `${sceneLine}\n\n${prompt}` : sceneLine;
    }
  }
  const texts = upstream
    .map(textFromNode)
    .filter((t): t is string => !!t?.trim() && t.trim() !== prompt);
  const merged = [prompt, ...texts].filter(Boolean).join("\n\n");
  const withMentions = resolveMentions(merged, opts.nodes);
  const modifiers = collectUpstreamModifierSuffix(opts.nodeId, opts.nodes, opts.edges);
  return appendModifierSuffix(withMentions, modifiers);
}

export function scriptScenePromptsFromNode(node: Node): string[] {
  const data = node.data as ProCanvasNodeData;
  if (data.kind !== "script") return [];
  return (data as ScriptNodeData).scenePrompts ?? [];
}

export function audioUrlFromNode(node: Node): string | undefined {
  const data = node.data as ProCanvasNodeData;
  if (data.kind === "audio") return (data as AudioNodeData).audioUrl;
  return undefined;
}

export function isRunnableNode(node: Node): boolean {
  const kind = (node.data as ProCanvasNodeData).kind;
  return (
    kind !== "upload" &&
    kind !== "text" &&
    kind !== "lighting" &&
    kind !== "background" &&
    kind !== "grade" &&
    kind !== "brand"
  );
}

export function runnableLabel(node: Node): string {
  return (node.data as ProCanvasNodeData).label;
}
