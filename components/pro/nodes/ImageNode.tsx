"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { MentionInput } from "@/components/pro/MentionInput";
import type { ImageNodeData } from "@/lib/pro-canvas-types";

export function ImageNode({ id, data }: NodeProps & { data: ImageNodeData }) {
  const { runImageNode, updateNodeData, nodes } = useProCanvasActions();

  return (
    <div className="w-72 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <input
        value={data.alias ?? ""}
        onChange={(e) => updateNodeData(id, { alias: e.target.value })}
        placeholder="Alias for @mention (e.g. Ava)"
        className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300"
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">{data.label}</p>
      <MentionInput
        nodeId={id}
        nodes={nodes}
        value={data.prompt}
        onChange={(prompt) => updateNodeData(id, { prompt })}
        placeholder="Describe the ad image… use @refs for multi-image"
        rows={4}
        className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder:text-slate-500"
      />
      <button
        type="button"
        disabled={data.busy}
        onClick={() => runImageNode(id)}
        className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? "Generating…" : "Run image"}
      </button>
      {data.imageUrl && (
        <img src={data.imageUrl} alt="" className="mt-2 max-h-36 w-full rounded-lg object-contain" />
      )}
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </div>
  );
}
