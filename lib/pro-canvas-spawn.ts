import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData, ScriptNodeData } from "@/lib/pro-canvas-types";
import { allUpstreamNodes } from "@/lib/pro-canvas-graph";
import { inferSceneCast, scriptBeatAt } from "@/lib/pro-canvas-scene-continuity";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

const SPAWN_SCENE_ID_PREFIXES = ["image-scene-", "video-scene-", "textVideo-scene-"] as const;

const SPAWN_WIRING_KINDS = new Set([
  "research",
  "upload",
  "lighting",
  "background",
  "grade",
  "brand",
  "world",
]);

export function isAutoSpawnedSceneNodeId(nodeId: string): boolean {
  return SPAWN_SCENE_ID_PREFIXES.some((prefix) => nodeId.startsWith(prefix));
}

/** True when script already has auto-spawned scene nodes (ignores template pre-wired tpl-* nodes). */
export function scriptHasSpawnedSceneOutputs(
  scriptNodeId: string,
  edges: Edge[],
  nodes: Node[],
): boolean {
  return edges.some((e) => {
    if (e.source !== scriptNodeId) return false;
    const target = nodes.find((n) => n.id === e.target);
    if (!target) return false;
    return isAutoSpawnedSceneNodeId(target.id);
  });
}

/** Upload / research / modifiers upstream of script — excludes characters (wire or @mention per shot). */
export function collectSpawnPipelineSources(
  scriptNodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node[] {
  const upstream = allUpstreamNodes(scriptNodeId, nodes, edges);
  const seen = new Set<string>();
  const result: Node[] = [];
  for (const n of upstream) {
    if (seen.has(n.id)) continue;
    const kind = (n.data as ProCanvasNodeData).kind;
    if (!SPAWN_WIRING_KINDS.has(kind)) continue;
    seen.add(n.id);
    result.push(n);
  }
  return result;
}

/** Connect each spawned video node to the first splice node on the board (if any). */
export function edgesFromVideosToSplice(
  videoIds: string[],
  spliceNodeId: string,
  existingEdges: Edge[],
): Edge[] {
  const newEdges: Edge[] = [];
  for (const videoId of videoIds) {
    const id = `e-${videoId}-${spliceNodeId}`;
    if (existingEdges.some((e) => e.id === id)) continue;
    if (newEdges.some((e) => e.id === id)) continue;
    newEdges.push({ id, source: videoId, target: spliceNodeId });
  }
  return newEdges;
}

/** Character nodes upstream of script (for auto-cast on spawn). */
export function collectScriptUpstreamCharacters(
  scriptNodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node[] {
  return allUpstreamNodes(scriptNodeId, nodes, edges).filter(
    (n) => (n.data as ProCanvasNodeData).kind === "character",
  );
}

/** Pick characters to wire to a spawned scene image (story-arc cast, not % rotate). */
export function charactersForSpawnedScene(
  sceneIndex: number,
  scenePrompt: string,
  characters: Node[],
  nodes: Node[],
  opts?: { scriptNode?: Node; sceneCount?: number },
): Node[] {
  const scriptNode =
    opts?.scriptNode ??
    nodes.find((n) => (n.data as ProCanvasNodeData).kind === "script");
  const sceneCount =
    opts?.sceneCount ??
    (scriptNode?.data as ScriptNodeData | undefined)?.scenePrompts?.length ??
    (scriptNode?.data as ScriptNodeData | undefined)?.sceneCount ??
    Math.max(sceneIndex + 1, characters.length);
  return inferSceneCast(
    sceneIndex,
    sceneCount,
    scenePrompt,
    characters,
    scriptBeatAt(scriptNode, sceneIndex),
  );
}

export function edgesForSceneCharacterCast(
  imageId: string,
  characters: Node[],
  existingEdges: Edge[],
  pendingEdges: Edge[],
): Edge[] {
  const added: Edge[] = [];
  for (const char of characters) {
    const edgeId = `e-${char.id}-${imageId}`;
    if (existingEdges.some((e) => e.id === edgeId)) continue;
    if (pendingEdges.some((e) => e.id === edgeId)) continue;
    if (added.some((e) => e.id === edgeId)) continue;
    added.push({ id: edgeId, source: char.id, target: imageId });
  }
  return added;
}

/** Find auto-spawned image node for a scene index. */
export function findSpawnedImageNodeBySceneIndex(
  nodes: Node[],
  sceneIndex: number,
): Node | undefined {
  return nodes.find((n) => {
    if (!isAutoSpawnedSceneNodeId(n.id)) return false;
    const d = n.data as ProCanvasNodeData;
    return d.kind === "image" && (d as { sceneIndex?: number }).sceneIndex === sceneIndex;
  });
}

/** Find auto-spawned video node for a scene index. */
export function findSpawnedVideoNodeBySceneIndex(
  nodes: Node[],
  sceneIndex: number,
): Node | undefined {
  return nodes.find((n) => {
    if (!isAutoSpawnedSceneNodeId(n.id)) return false;
    const d = n.data as ProCanvasNodeData;
    return (
      (d.kind === "video" || d.kind === "textVideo") &&
      (d as { sceneIndex?: number }).sceneIndex === sceneIndex
    );
  });
}

/** Still URLs from storyboard panels to seed Image nodes on spawn. */
export function stillUrlsFromStoryboardPanels(
  panels: Array<{ imageUrl?: string }>,
): Array<string | undefined> {
  return panels.map((p) =>
    isHttpOrLibraryMediaUrl(p.imageUrl) ? p.imageUrl : undefined,
  );
}

/** Collect outline stills from the board's storyboard hub (if any). */
export function stillUrlsFromBoardStoryboard(nodes: Node[]): Array<string | undefined> {
  const board = nodes.find((n) => (n.data as ProCanvasNodeData).kind === "storyboard");
  if (!board) return [];
  const data = board.data as {
    acts?: Array<{ panels: Array<{ imageUrl?: string }> }>;
    panels?: Array<{ imageUrl?: string }>;
  };
  const panels =
    data.acts?.length ? data.acts.flatMap((a) => a.panels) : (data.panels ?? []);
  return stillUrlsFromStoryboardPanels(panels);
}

/**
 * Patches for spawned Image nodes: copy storyboard panel.imageUrl → image.imageUrl
 * by sceneIndex. Returns list of { nodeId, imageUrl }.
 */
export function storyboardStillPatchesForSceneImages(
  nodes: Node[],
): Array<{ nodeId: string; imageUrl: string; sceneIndex: number }> {
  const board = nodes.find((n) => (n.data as ProCanvasNodeData).kind === "storyboard");
  if (!board) return [];
  const data = board.data as {
    acts?: Array<{ panels: Array<{ imageUrl?: string }> }>;
    panels?: Array<{ imageUrl?: string }>;
  };
  const panels =
    data.acts?.length ? data.acts.flatMap((a) => a.panels) : (data.panels ?? []);
  const patches: Array<{ nodeId: string; imageUrl: string; sceneIndex: number }> = [];
  panels.forEach((p, i) => {
    if (!isHttpOrLibraryMediaUrl(p.imageUrl)) return;
    const img = findSpawnedImageNodeBySceneIndex(nodes, i);
    if (!img) return;
    const existing = (img.data as { imageUrl?: string }).imageUrl;
    if (existing === p.imageUrl) return;
    patches.push({ nodeId: img.id, imageUrl: p.imageUrl, sceneIndex: i });
  });
  return patches;
}
