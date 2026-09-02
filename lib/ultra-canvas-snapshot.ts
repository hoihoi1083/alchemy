import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

export type UltraCanvasSnapshot = {
  version: 1;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: ProCanvasNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
  nodeCounterSeed: number;
};

function isPersistableUrl(url: unknown): url is string {
  return typeof url === "string" && isHttpOrLibraryMediaUrl(url);
}

/** Strip blob: URLs and local File refs before Mongo persistence. */
export function serializeUltraCanvasSnapshot(
  nodes: Node[],
  edges: Edge[],
  nodeCounterSeed: number,
): UltraCanvasSnapshot {
  return {
    version: 1,
    nodeCounterSeed,
    nodes: nodes.map((n) => {
      const data = { ...(n.data as ProCanvasNodeData) };
      if ("previewUrl" in data && !isPersistableUrl(data.previewUrl)) {
        delete (data as { previewUrl?: string }).previewUrl;
      }
      if ("audioUrl" in data && !isPersistableUrl(data.audioUrl)) {
        delete (data as { audioUrl?: string }).audioUrl;
      }
      if ("imageUrl" in data && !isPersistableUrl(data.imageUrl)) {
        delete (data as { imageUrl?: string }).imageUrl;
      }
      if ("videoUrl" in data && !isPersistableUrl(data.videoUrl)) {
        delete (data as { videoUrl?: string }).videoUrl;
      }
      delete (data as { busy?: boolean }).busy;
      delete (data as { error?: string }).error;
      return {
        id: n.id,
        type: n.type ?? "default",
        position: n.position,
        data,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

export function deserializeUltraCanvasSnapshot(snapshot: UltraCanvasSnapshot): {
  nodes: Node[];
  edges: Edge[];
  nodeCounterSeed: number;
} {
  if (snapshot.version !== 1) {
    throw new Error("Unsupported canvas snapshot version.");
  }
  return {
    nodeCounterSeed: snapshot.nodeCounterSeed,
    nodes: snapshot.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: snapshot.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
  };
}
