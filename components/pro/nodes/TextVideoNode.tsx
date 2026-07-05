"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { MentionInput } from "@/components/pro/MentionInput";
import type { TextVideoNodeData } from "@/lib/pro-canvas-types";

export function TextVideoNode({ id, data }: NodeProps & { data: TextVideoNodeData }) {
  const { runTextVideoNode, updateNodeData, nodes } = useProCanvasActions();

  return (
    <div className="w-72 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-violet-500" />
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">{data.label}</p>
      <MentionInput
        nodeId={id}
        nodes={nodes}
        value={data.prompt}
        onChange={(prompt) => updateNodeData(id, { prompt })}
        placeholder="Cinematic text-to-video prompt…"
        rows={5}
        className="mt-2 h-28 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder:text-slate-500"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={data.duration}
          onChange={(e) => updateNodeData(id, { duration: e.target.value })}
          className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"
        >
          {["4", "6", "8", "10"].map((d) => (
            <option key={d} value={d}>
              {d}s
            </option>
          ))}
        </select>
        <select
          value={data.resolution}
          onChange={(e) =>
            updateNodeData(id, { resolution: e.target.value as "480p" | "720p" })
          }
          className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"
        >
          <option value="480p">480p</option>
          <option value="720p">720p</option>
        </select>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
        <input
          type="checkbox"
          checked={data.fast}
          onChange={(e) => updateNodeData(id, { fast: e.target.checked })}
        />
        Fast tier (draft)
      </label>
      <button
        type="button"
        disabled={data.busy}
        onClick={() => runTextVideoNode(id)}
        className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? "Generating…" : "Run text-to-video"}
      </button>
      {data.videoUrl && (
        <video src={data.videoUrl} controls className="mt-2 max-h-36 w-full rounded-lg" />
      )}
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-violet-500" />
    </div>
  );
}
