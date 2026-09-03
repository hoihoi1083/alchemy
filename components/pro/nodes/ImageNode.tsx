"use client";

import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { DirectorPromptChips } from "@/components/pro/DirectorPromptChips";
import { ExportToLibraryButton } from "@/components/pro/ExportToLibraryButton";
import { ProControlFields } from "@/components/pro/ProControlFields";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { StaleOutputBadge } from "@/components/pro/StaleOutputBadge";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { MentionInput } from "@/components/pro/MentionInput";
import { useLocale } from "@/components/LocaleProvider";
import type { ImageNodeData } from "@/lib/pro-canvas-types";
import {
  DEFAULT_ULTRA_IMAGE_PRO,
  estimateCanvasImageTokens,
  type UltraImageProControls,
} from "@/lib/ultra-pro-controls";

function imageProFromData(data: ImageNodeData): UltraImageProControls {
  return {
    aspectRatio: data.aspectRatio ?? DEFAULT_ULTRA_IMAGE_PRO.aspectRatio,
    resolution: data.resolution ?? DEFAULT_ULTRA_IMAGE_PRO.resolution,
    artStyleId: data.artStyleId ?? DEFAULT_ULTRA_IMAGE_PRO.artStyleId,
    lightingPreset: data.lightingPreset ?? DEFAULT_ULTRA_IMAGE_PRO.lightingPreset,
    lightingCustom: data.lightingCustom,
    backgroundPreset: data.backgroundPreset ?? DEFAULT_ULTRA_IMAGE_PRO.backgroundPreset,
    backgroundCustom: data.backgroundCustom,
  };
}

export function ImageNode({ id, data }: NodeProps & { data: ImageNodeData }) {
  const { runImageNode, updateNodeData, nodes, boardBusy, isNodeStale } = useProCanvasActions();
  const { m } = useLocale();
  const tokenCost = useMemo(() => estimateCanvasImageTokens(), []);
  const pro = imageProFromData(data);

  return (
    <ProNodeShell
      accent="sky"
      label={data.label}
      alias={data.alias}
      onAliasChange={(alias) => updateNodeData(id, { alias })}
      aliasPlaceholder={m.ultraCanvas.aliasPlaceholder}
    >
      <MentionInput
        nodeId={id}
        nodes={nodes}
        value={data.prompt}
        onChange={(prompt) => updateNodeData(id, { prompt })}
        placeholder={m.ultraCanvas.imagePromptPlaceholder}
        rows={4}
        className="h-20 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none"
      />
      <DirectorPromptChips
        labels={m.ultraCanvas.directorChips}
        prompt={data.prompt}
        disabled={boardBusy}
        onInsert={(prompt) => updateNodeData(id, { prompt })}
      />
      <ProControlFields
        value={pro}
        onChange={(patch) => updateNodeData(id, patch)}
      />
      <button
        type="button"
        disabled={data.busy || boardBusy}
        onClick={() => runImageNode(id)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(56,189,248,0.25)] disabled:opacity-40"
      >
        {data.busy ? m.ultraCanvas.running : m.ultraCanvas.runImage}
        {!data.busy ? (
          <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-medium">
            {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
          </span>
        ) : null}
      </button>
      {data.imageUrl ? (
        <>
          {isNodeStale(id) ? <StaleOutputBadge /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="" className="mt-2 max-h-36 w-full rounded-lg object-contain ring-1 ring-slate-700/80" />
          <ExportToLibraryButton
            url={data.imageUrl}
            kind="image"
            onExported={(libraryUrl) => updateNodeData(id, { imageUrl: libraryUrl })}
          />
        </>
      ) : null}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
