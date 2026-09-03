import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData, TextVideoNodeData, VideoNodeData } from "@/lib/pro-canvas-types";
import {
  audioUrlFromNode,
  runnableExecutionOrder,
  upstreamNodesSorted,
} from "@/lib/pro-canvas-graph";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import { nodeNeedsRun } from "@/lib/pro-canvas-stale";
import {
  estimateCanvasImageTokens,
  estimateCanvasSpliceTokens,
  estimateCanvasVideoTokens,
} from "@/lib/ultra-pro-controls";

export type EstimateRunAllOpts = {
  hasLocalAudio?: (nodeId: string) => boolean;
};

export function spliceUpstreamHasMusic(
  spliceNodeId: string,
  nodes: Node[],
  edges: Edge[],
  opts?: EstimateRunAllOpts,
): boolean {
  const upstream = upstreamNodesSorted(spliceNodeId, nodes, edges);
  return upstream.some((u) => {
    const k = (u.data as ProCanvasNodeData).kind;
    if (k !== "audio") return false;
    if (isHttpOrLibraryMediaUrl(audioUrlFromNode(u))) return true;
    return opts?.hasLocalAudio?.(u.id) ?? false;
  });
}

/** Sum token cost for pending runnable nodes in Run-all execution order. */
export function estimateRunAllTokens(
  nodes: Node[],
  edges: Edge[],
  opts?: EstimateRunAllOpts,
): number {
  const { sorted } = runnableExecutionOrder(nodes, edges);
  const pending = sorted.filter((n) => nodeNeedsRun(n, nodes, edges));
  let total = 0;
  for (const n of pending) {
    const data = n.data as ProCanvasNodeData;
    switch (data.kind) {
      case "image":
      case "camera":
        total += estimateCanvasImageTokens();
        break;
      case "video": {
        const v = data as VideoNodeData;
        total += estimateCanvasVideoTokens({
          resolution: v.resolution,
          duration: v.duration,
          fast: v.fast,
        });
        break;
      }
      case "textVideo": {
        const v = data as TextVideoNodeData;
        total += estimateCanvasVideoTokens({
          resolution: v.resolution,
          duration: v.duration,
          fast: v.fast,
        });
        break;
      }
      case "splice": {
        const hasMusic = spliceUpstreamHasMusic(n.id, nodes, edges, opts);
        total += estimateCanvasSpliceTokens({ hasMusic });
        break;
      }
      default:
        break;
    }
  }
  return total;
}
