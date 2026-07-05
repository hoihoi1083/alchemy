"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import type { SpliceNodeData } from "@/lib/pro-canvas-types";

export function SpliceNode({ id, data }: NodeProps & { data: SpliceNodeData }) {
  const { runSpliceNode } = useProCanvasActions();

  return (
    <div className="w-72 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-orange-500" />
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">{data.label}</p>
      <p className="mt-1 text-[10px] text-slate-400">
        Connect one or more video nodes. Optional audio node for BGM.
      </p>
      <button
        type="button"
        disabled={data.busy}
        onClick={() => runSpliceNode(id)}
        className="mt-2 w-full rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? "Splicing…" : "Splice videos"}
      </button>
      {data.videoUrl && (
        <video src={data.videoUrl} controls className="mt-2 max-h-36 w-full rounded-lg" />
      )}
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-orange-500" />
    </div>
  );
}
