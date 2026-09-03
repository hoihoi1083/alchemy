"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { UltraLibraryPicker } from "@/components/pro/UltraLibraryPicker";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { UploadNodeData } from "@/lib/pro-canvas-types";

export function UploadNode({ id, data }: NodeProps & { data: UploadNodeData }) {
  const { onUploadFile, onPickLibraryImage, updateNodeData } = useProCanvasActions();
  const { m } = useLocale();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <ProNodeShell
        accent="emerald"
        label={data.label}
        sourceHandle
        targetHandle={false}
        alias={data.alias}
        onAliasChange={(alias) => updateNodeData(id, { alias })}
        aliasPlaceholder={m.ultraCanvas.aliasPlaceholder}
      >
        <label className="nodrag nopan block cursor-pointer rounded-lg border border-dashed border-emerald-500/30 bg-emerald-950/10 px-3 py-4 text-center text-xs text-slate-300 transition hover:border-emerald-400/50 hover:bg-emerald-950/20">
          {data.fileName || m.ultraCanvas.uploadPlaceholder}
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
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
          {m.ultraCanvas.uploadRefHint}
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200"
        >
          {m.ultraCanvas.pickFromLibrary}
        </button>
        {data.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.previewUrl}
            alt=""
            className="mt-2 max-h-32 w-full rounded-lg object-contain ring-1 ring-slate-700/80"
          />
        ) : null}
        {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
      </ProNodeShell>
      <UltraLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="image"
        onPick={({ previewUrl, name }) => onPickLibraryImage(id, previewUrl, name)}
      />
    </>
  );
}
