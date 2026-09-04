"use client";

import { CanvasTextarea } from "@/components/pro/CanvasTextField";
import { useMemo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { UltraLibraryPicker } from "@/components/pro/UltraLibraryPicker";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { WorldNodeData } from "@/lib/pro-canvas-types";
import { estimateCanvasImageTokens } from "@/lib/ultra-pro-controls";

export function WorldNode({ id, data }: NodeProps & { data: WorldNodeData }) {
  const {
    updateNodeData,
    onUploadFile,
    onPickLibraryImage,
    runWorldNode,
    boardBusy,
  } = useProCanvasActions();
  const { m } = useLocale();
  const wn = m.ultraCanvas.worldNode;
  const [pickerOpen, setPickerOpen] = useState(false);
  const tokenCost = useMemo(() => estimateCanvasImageTokens(), []);
  const canBuild = Boolean(data.description?.trim() || data.previewUrl);

  return (
    <>
      <ProNodeShell
        accent="cyan"
        label={data.label}
        sourceHandle
        targetHandle={false}
        alias={data.alias ?? "World"}
        onAliasChange={(alias) => updateNodeData(id, { alias })}
        aliasPlaceholder={m.ultraCanvas.aliasPlaceholder}
        widthClass="w-72"
      >
        <p className="mb-2 text-[10px] text-slate-400">{wn.hint}</p>
        <CanvasTextarea
          value={data.description}
          onChange={(description) => updateNodeData(id, { description })}
          placeholder={wn.descriptionPlaceholder}
          className="h-24 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-teal-500/40 focus:outline-none"
        />
        <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-cyan-500/30 bg-cyan-950/10 px-3 py-2 text-center text-[10px] text-slate-300 transition hover:border-cyan-400/50">
          {data.fileName || wn.uploadPlaceholder}
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
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-1.5 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-medium text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
        >
          {m.ultraCanvas.pickFromLibrary}
        </button>
        <button
          type="button"
          disabled={data.busy || boardBusy || !canBuild}
          onClick={() => void runWorldNode(id)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {data.busy ? m.ultraCanvas.running : wn.buildSpace}
          {!data.busy ? (
            <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
              {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
            </span>
          ) : null}
        </button>
        {data.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.previewUrl}
            alt=""
            className="mt-2 max-h-28 w-full rounded-lg object-cover ring-1 ring-cyan-500/20"
          />
        ) : null}
        {data.spaceSheetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.spaceSheetUrl}
            alt=""
            className="mt-2 max-h-40 w-full rounded-lg object-contain ring-1 ring-cyan-500/30"
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
