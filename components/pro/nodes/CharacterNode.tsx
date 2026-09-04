"use client";

import { useMemo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { UltraLibraryPicker } from "@/components/pro/UltraLibraryPicker";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import type { CharacterNodeData } from "@/lib/pro-canvas-types";
import { estimateCanvasImageTokens } from "@/lib/ultra-pro-controls";

export function CharacterNode({ id, data }: NodeProps & { data: CharacterNodeData }) {
  const {
    onUploadFile,
    onPickLibraryImage,
    updateNodeData,
    runCharacterNode,
    runCharacterAnglesNode,
    boardBusy,
  } = useProCanvasActions();
  const { m } = useLocale();
  const cn = m.ultraCanvas.characterNode;
  const [pickerOpen, setPickerOpen] = useState(false);
  const tokenCost = useMemo(() => estimateCanvasImageTokens(), []);
  const canGenerate = Boolean(
    (data.generatePrompt ?? "").trim() || (data.biography ?? "").trim(),
  );
  const hasFace = Boolean(data.previewUrl);

  return (
    <>
      <ProNodeShell
        accent="amber"
        label={data.label}
        sourceHandle
        targetHandle={false}
        alias={data.alias}
        onAliasChange={(alias) => updateNodeData(id, { alias })}
        aliasPlaceholder={cn.aliasPlaceholder}
        widthClass="w-72"
      >
        <p className="mb-2 text-[10px] text-slate-400">{cn.hint}</p>
        <textarea
          value={data.biography ?? ""}
          onChange={(e) => updateNodeData(id, { biography: e.target.value })}
          placeholder={cn.biographyPlaceholder}
          className="h-14 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none"
        />
        <textarea
          value={data.generatePrompt ?? ""}
          onChange={(e) => updateNodeData(id, { generatePrompt: e.target.value })}
          placeholder={cn.generatePromptPlaceholder}
          className="mt-1.5 h-12 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none"
        />
        <button
          type="button"
          disabled={data.busy || boardBusy || !canGenerate}
          onClick={() => void runCharacterNode(id)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(245,158,11,0.2)] disabled:opacity-40"
        >
          {data.busy ? m.ultraCanvas.running : cn.generate}
          {!data.busy ? (
            <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
              {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          disabled={data.busy || boardBusy || !hasFace}
          onClick={() => void runCharacterAnglesNode(id)}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-[10px] font-semibold text-amber-100 disabled:opacity-40"
        >
          {cn.generateAngles}
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-medium">
            {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
          </span>
        </button>
        <p className="mt-1.5 text-center text-[10px] text-slate-500">{cn.orUpload}</p>
        <label className="mt-1 block cursor-pointer rounded-lg border border-dashed border-amber-500/30 bg-amber-950/10 px-3 py-2.5 text-center text-xs text-slate-300 transition hover:border-amber-400/50 hover:bg-amber-950/20">
          {data.fileName || cn.uploadPlaceholder}
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
          className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-500/40 hover:text-amber-200"
        >
          {m.ultraCanvas.pickFromLibrary}
        </button>
        {data.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.previewUrl}
            alt=""
            className="mt-2 max-h-28 w-full rounded-lg object-contain ring-1 ring-amber-500/20"
          />
        ) : null}
        {data.angleSheetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.angleSheetUrl}
            alt=""
            className="mt-2 max-h-36 w-full rounded-lg object-contain ring-1 ring-amber-500/30"
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
