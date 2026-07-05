"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import type { ScriptNodeData } from "@/lib/pro-canvas-types";

export function ScriptNode({ id, data }: NodeProps & { data: ScriptNodeData }) {
  const { runScriptNode, updateNodeData } = useProCanvasActions();

  return (
    <div className="w-72 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-pink-500" />
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">{data.label}</p>
      <textarea
        value={data.brief}
        onChange={(e) => updateNodeData(id, { brief: e.target.value })}
        placeholder="Creative brief for script / scenes…"
        className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder:text-slate-500"
      />
      <button
        type="button"
        disabled={data.busy}
        onClick={() => runScriptNode(id)}
        className="mt-2 w-full rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? "Planning…" : "Plan script"}
      </button>
      {data.scriptText && (
        <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-2 text-[10px] text-slate-300">
          {data.scriptText}
        </pre>
      )}
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-pink-500" />
    </div>
  );
}
