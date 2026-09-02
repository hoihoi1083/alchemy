"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { UltraLibraryPicker } from "@/components/pro/UltraLibraryPicker";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { AudioNodeData } from "@/lib/pro-canvas-types";

export function AudioNode({ id, data }: NodeProps & { data: AudioNodeData }) {
  const { onUploadAudio, onPickLibraryAudio, runAudioNode, updateNodeData, boardBusy } =
    useProCanvasActions();
  const { m } = useLocale();
  const an = m.ultraCanvas.audioNode;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <ProNodeShell
        accent="amber"
        label={data.label}
        sourceHandle
        targetHandle={false}
        alias={data.alias}
        onAliasChange={(alias) => updateNodeData(id, { alias })}
        aliasPlaceholder={m.ultraCanvas.aliasPlaceholder}
      >
        <label className="block cursor-pointer rounded-lg border border-dashed border-amber-500/30 bg-amber-950/10 px-3 py-4 text-center text-xs text-slate-300 transition hover:border-amber-400/50 hover:bg-amber-950/20">
          {data.fileName || an.uploadPlaceholder}
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
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-500/40 hover:text-amber-200"
        >
          {m.ultraCanvas.pickFromLibrary}
        </button>
        {data.audioUrl ? <audio src={data.audioUrl} controls className="mt-2 w-full" /> : null}
        <button
          type="button"
          disabled={data.busy || boardBusy}
          onClick={() => runAudioNode(id)}
          className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {data.busy ? an.uploading : an.uploadCloud}
        </button>
        {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
      </ProNodeShell>
      <UltraLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="audio"
        onPick={({ previewUrl, name }) => onPickLibraryAudio(id, previewUrl, name)}
      />
    </>
  );
}
