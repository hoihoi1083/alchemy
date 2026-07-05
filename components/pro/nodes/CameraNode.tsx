"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { CAMERA_PRESET_OPTIONS } from "@/lib/pro-canvas-camera";
import type { CameraNodeData } from "@/lib/pro-canvas-types";

export function CameraNode({ id, data }: NodeProps & { data: CameraNodeData }) {
  const { runCameraNode, updateNodeData } = useProCanvasActions();

  return (
    <div className="w-80 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-cyan-500" />
      <input
        value={data.alias ?? ""}
        onChange={(e) => updateNodeData(id, { alias: e.target.value })}
        placeholder="Alias for @mention"
        className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300"
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">{data.label}</p>
      <label className="mt-2 block text-[10px] text-slate-400">Preset</label>
      <select
        value={data.preset}
        onChange={(e) => updateNodeData(id, { preset: e.target.value as CameraNodeData["preset"] })}
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"
      >
        {CAMERA_PRESET_OPTIONS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="mt-2 space-y-2">
        <label className="block text-[10px] text-slate-400">
          Spin {data.spin}°
          <input
            type="range"
            min={-180}
            max={180}
            value={data.spin}
            onChange={(e) => updateNodeData(id, { spin: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-[10px] text-slate-400">
          Tilt {data.tilt}°
          <input
            type="range"
            min={0}
            max={90}
            value={data.tilt}
            onChange={(e) => updateNodeData(id, { tilt: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-[10px] text-slate-400">
          Zoom
          <input
            type="range"
            min={0}
            max={100}
            value={data.zoom}
            onChange={(e) => updateNodeData(id, { zoom: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </label>
      </div>
      <textarea
        value={data.promptExtra}
        onChange={(e) => updateNodeData(id, { promptExtra: e.target.value })}
        placeholder="Extra camera prompt…"
        className="mt-2 h-12 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
      />
      <button
        type="button"
        disabled={data.busy}
        onClick={() => runCameraNode(id)}
        className="mt-2 w-full rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? "Generating…" : "Apply camera"}
      </button>
      {data.imageUrl && (
        <img src={data.imageUrl} alt="" className="mt-2 max-h-36 w-full rounded-lg object-contain" />
      )}
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-cyan-500" />
    </div>
  );
}
