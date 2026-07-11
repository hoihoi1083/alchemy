"use client";

import type { CaptionLine, CaptionPosition } from "@/lib/ad-pack-types";
import {
  CAPTION_STYLE_PRESET_IDS,
  CAPTION_STYLE_PRESETS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";

export const CAPTION_POSITIONS: CaptionPosition[] = [
  "top",
  "center",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export function CaptionLineEditor(props: {
  line: CaptionLine;
  index: number;
  timingLabel: string;
  positionLabel: string;
  positionOptions: Record<CaptionPosition, string>;
  multilineHint: string;
  removeLabel: string;
  styleLabel?: string;
  styleOptions?: { id: CaptionStylePresetId; label: string }[];
  defaultStylePreset?: CaptionStylePresetId;
  locale?: string;
  onChange: (patch: Partial<CaptionLine>) => void;
  onRemove: () => void;
}) {
  const activeStyle =
    props.line.stylePreset && props.line.stylePreset in CAPTION_STYLE_PRESETS
      ? (props.line.stylePreset as CaptionStylePresetId)
      : props.defaultStylePreset ?? "classic";

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 text-[11px] text-slate-400">
          <input
            type="number"
            min={0}
            step={0.5}
            value={props.line.startSec}
            onChange={(e) => props.onChange({ startSec: Number(e.target.value) })}
            className="w-12 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-white"
            aria-label={`${props.timingLabel} start`}
          />
          <span className="self-center">–</span>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={props.line.endSec}
            onChange={(e) => props.onChange({ endSec: Number(e.target.value) })}
            className="w-12 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-white"
            aria-label={`${props.timingLabel} end`}
          />
        </div>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>{props.positionLabel}</span>
          <select
            value={props.line.position ?? "bottom"}
            onChange={(e) => props.onChange({ position: e.target.value as CaptionPosition })}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
          >
            {CAPTION_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {props.positionOptions[pos]}
              </option>
            ))}
          </select>
        </label>
        {props.styleOptions && props.styleLabel && (
          <label className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>{props.styleLabel}</span>
            <select
              value={activeStyle}
              onChange={(e) =>
                props.onChange({ stylePreset: e.target.value as CaptionStylePresetId })
              }
              className="max-w-[8.5rem] rounded border border-slate-700 bg-slate-950 px-1 py-1 text-xs text-white"
            >
              {props.styleOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={props.onRemove}
          className="ml-auto text-[11px] text-rose-300 hover:text-rose-200"
          aria-label={props.removeLabel}
        >
          ×
        </button>
      </div>
      <textarea
        value={props.line.text}
        onChange={(e) => props.onChange({ text: e.target.value })}
        rows={2}
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
        placeholder={`Line ${props.index + 1}`}
      />
      <p className="text-[10px] text-slate-500">{props.multilineHint}</p>
    </div>
  );
}
