"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import type { TextNodeData } from "@/lib/pro-canvas-types";

export function TextNode({ id, data }: NodeProps & { data: TextNodeData }) {
  const { updateNodeData } = useProCanvasActions();

  return (
    <div className="w-64 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <input
        value={data.alias ?? ""}
        onChange={(e) => updateNodeData(id, { alias: e.target.value })}
        placeholder="Alias for @mention"
        className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300"
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{data.label}</p>
      <textarea
        value={data.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Notes, brief, or prompt fragment…"
        className="mt-2 h-24 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder:text-slate-500"
      />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}
