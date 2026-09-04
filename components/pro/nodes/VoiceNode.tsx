"use client";

import { CanvasTextarea } from "@/components/pro/CanvasTextField";
import type { NodeProps } from "@xyflow/react";
import { ProNodeShell } from "@/components/pro/ProNodeShell";
import { StaleOutputBadge } from "@/components/pro/StaleOutputBadge";
import { useProCanvasActions } from "@/components/pro/ProCanvasActions";
import { useLocale } from "@/components/LocaleProvider";
import {
  VOICE_PRESET_IDS,
  voicePresetsForLocale,
  type VoiceoverLocale,
  type VoicePresetId,
  isVoicePresetId,
} from "@/lib/ad-pack-preferences";
import { estimateCanvasVoiceTokens } from "@/lib/ultra-pro-controls";
import type { VoiceNodeData } from "@/lib/pro-canvas-types";

const LOCALES: VoiceoverLocale[] = ["en", "hk", "cn"];

export function VoiceNode({ id, data }: NodeProps & { data: VoiceNodeData }) {
  const {
    runVoiceNode,
    pullVoiceDialogueFromScript,
    updateNodeData,
    boardBusy,
    isNodeStale,
  } = useProCanvasActions();
  const { m } = useLocale();
  const vn = m.ultraCanvas.voiceNode;
  const tokenCost = estimateCanvasVoiceTokens();
  const locale = (LOCALES.includes(data.locale as VoiceoverLocale)
    ? data.locale
    : "en") as VoiceoverLocale;
  const presets = voicePresetsForLocale(locale);
  const presetId = isVoicePresetId(data.voicePresetId)
    ? data.voicePresetId
    : presets[0] ?? ("en-male" as VoicePresetId);
  const lines = data.lines ?? [];

  return (
    <ProNodeShell accent="amber" label={data.label} sourceHandle targetHandle widthClass="w-80">
      <p className="mb-2 text-[10px] text-slate-400">{vn.hint}</p>
      <p className="mb-2 text-[9px] leading-snug text-slate-500">{vn.stepsHint}</p>
      <p className="mb-2 rounded-md border border-amber-500/25 bg-amber-950/30 px-2 py-1.5 text-[9px] leading-snug text-amber-100/90">
        {vn.sourceHint}
      </p>
      <CanvasTextarea
        value={data.script}
        onChange={(script) => updateNodeData(id, { script, lines: undefined })}
        placeholder={vn.scriptPlaceholder}
        className="h-16 w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none"
      />
      <div className="mt-2 flex gap-1.5">
        <select
          value={locale}
          onChange={(e) => {
            const next = e.target.value as VoiceoverLocale;
            const nextPresets = voicePresetsForLocale(next);
            updateNodeData(id, {
              locale: next,
              voicePresetId: nextPresets[0] ?? data.voicePresetId,
            });
          }}
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
        >
          {LOCALES.map((loc) => (
            <option key={loc} value={loc}>
              {loc.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          value={presetId}
          onChange={(e) => updateNodeData(id, { voicePresetId: e.target.value })}
          className="flex-[1.4] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
        >
          {(presets.length ? presets : VOICE_PRESET_IDS).map((pid) => (
            <option key={pid} value={pid}>
              {pid}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={boardBusy}
        onClick={() => pullVoiceDialogueFromScript(id)}
        className="mt-2 w-full rounded-lg border border-amber-500/35 px-3 py-1.5 text-[10px] font-medium text-amber-100 hover:bg-amber-950/40 disabled:opacity-40"
      >
        {vn.pullDialogue}
      </button>
      {lines.length > 0 ? (
        <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-md border border-amber-500/20 bg-amber-950/20 px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-200/80">
            {vn.timedLinesTitle}
          </p>
          {lines.map((line, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[9px] text-slate-300">
              <span className="shrink-0 rounded bg-black/30 px-1 py-0.5 font-mono text-amber-200/90">
                {line.startSec.toFixed(1)}–{line.endSec.toFixed(1)}s
              </span>
              <span className="min-w-0 flex-1 leading-snug">
                {line.sceneLabel ? (
                  <span className="text-amber-200/70">{line.sceneLabel} · </span>
                ) : null}
                {line.text}
              </span>
            </div>
          ))}
          <p className="text-[9px] text-slate-500">{vn.timedLinesHint}</p>
        </div>
      ) : null}
      <button
        type="button"
        disabled={boardBusy || data.busy || !data.script.trim()}
        onClick={() => void runVoiceNode(id)}
        className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {data.busy ? vn.generating : vn.generate}
        <span className="rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-medium">
          {m.ultraCanvas.tokenBadge.replace("{n}", String(tokenCost))}
        </span>
      </button>
      {isNodeStale(id) ? <StaleOutputBadge /> : null}
      {data.audioUrl ? (
        <audio src={data.audioUrl} controls className="mt-2 w-full" />
      ) : null}
      {data.error ? <p className="mt-2 text-xs text-red-400">{data.error}</p> : null}
    </ProNodeShell>
  );
}
