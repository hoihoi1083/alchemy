"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import type { AudioNodeData } from "@/lib/pro-canvas-types";

export function AudioNode({ id, data }: NodeProps & { data: AudioNodeData }) {
  const { onUploadAudio, runAudioNode, updateNodeData } = useProCanvasActions();

  return (
    <div className="w-64 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-lg">
      <input
        value={data.alias ?? ""}
        onChange={(e) => updateNodeData(id, { alias: e.target.value })}
        placeholder="Alias for @mention"
        className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300"
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">{data.label}</p>
      <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-slate-500 px-3 py-4 text-center text-xs text-slate-300 hover:border-amber-500">
        {data.fileName || "Upload MP3 / WAV"}
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadAudio(id, file);
            e.target.value = "";
          }}
        />
      </label>
      {data.audioUrl && <audio src={data.audioUrl} controls className="mt-2 w-full" />}
      <button
        type="button"
        disabled={data.busy}
        onClick={() => runAudioNode(id)}
        className="mt-2 w-full rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? "Uploading…" : "Upload to cloud"}
      </button>
      {data.error && <p className="mt-2 text-xs text-red-400">{data.error}</p>}
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </div>
  );
}
