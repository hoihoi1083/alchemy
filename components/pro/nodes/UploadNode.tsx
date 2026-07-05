"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import type { UploadNodeData } from "@/lib/pro-canvas-types";

export function UploadNode({ id, data }: NodeProps & { data: UploadNodeData }) {
  const { onUploadFile, updateNodeData } = useProCanvasActions();

  return (
    <div className="w-64 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <input
        value={data.alias ?? ""}
        onChange={(e) => updateNodeData(id, { alias: e.target.value })}
        placeholder="Alias for @mention (e.g. Outfit)"
        className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300"
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">{data.label}</p>
      <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-slate-500 px-3 py-4 text-center text-xs text-slate-300 hover:border-emerald-500">
        {data.fileName || "Upload image / keyframe"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadFile(id, file);
            e.target.value = "";
          }}
        />
      </label>
      {data.previewUrl && (
        <img src={data.previewUrl} alt="" className="mt-2 max-h-32 w-full rounded-lg object-contain" />
      )}
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </div>
  );
}
