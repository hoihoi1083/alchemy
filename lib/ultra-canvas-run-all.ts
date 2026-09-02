import type { Edge, Node } from "@xyflow/react";
import type { ProCanvasNodeData, TextVideoNodeData, VideoNodeData } from "@/lib/pro-canvas-types";
import {
  audioUrlFromNode,
  nodeHasRunnableOutput,
  runnableExecutionOrder,
  upstreamNodesSorted,
} from "@/lib/pro-canvas-graph";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import {
  estimateCanvasImageTokens,
  estimateCanvasSpliceTokens,
  estimateCanvasVideoTokens,
} from "@/lib/ultra-pro-controls";

/** Sum token cost for pending runnable nodes in Run-all execution order. */
export function estimateRunAllTokens(nodes: Node[], edges: Edge[]): number {
  const { sorted } = runnableExecutionOrder(nodes, edges);
  const pending = sorted.filter((n) => !nodeHasRunnableOutput(n));
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
        const upstream = upstreamNodesSorted(n.id, nodes, edges);
        const hasMusic = upstream.some((u) => {
          const k = (u.data as ProCanvasNodeData).kind;
          return k === "audio" && isHttpOrLibraryMediaUrl(audioUrlFromNode(u));
        });
        total += estimateCanvasSpliceTokens({ hasMusic });
        break;
      }
      default:
        break;
    }
  }
  return total;
}
