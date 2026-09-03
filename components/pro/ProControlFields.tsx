"use client";

import { useState } from "react";
import { ImageResolutionPanel } from "@/components/ImageResolutionPanel";
import { useLocale } from "@/components/LocaleProvider";
import { artStyleIdsForPicker, type ArtStyleId } from "@/lib/art-style";
import type { ImageResolutionCap } from "@/lib/billing/entitlements";
import { IMAGE_ASPECT_RATIOS, type ImageAspectRatio } from "@/lib/image-aspect-ratio";
import {
  ULTRA_BACKGROUND_PRESETS,
  ULTRA_LIGHTING_PRESETS,
  type UltraBackgroundPreset,
  type UltraImageProControls,
  type UltraLightingPreset,
} from "@/lib/ultra-pro-controls";

type Props = {
  value: UltraImageProControls;
  onChange: (patch: Partial<UltraImageProControls>) => void;
};

function pill(active: boolean) {
  return active
    ? "border-violet-400/80 bg-violet-600/30 text-violet-100 ring-1 ring-violet-400/40"
    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500";
}

export function ProControlFields({ value, onChange }: Props) {
  const { m } = useLocale();
  const pc = m.ultraCanvas.proControls;
  const [open, setOpen] = useState(false);

  return (
    <div className="nodrag nopan nowheel mt-2 rounded-lg border border-violet-500/20 bg-slate-950/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
          {pc.title}
        </span>
        <span className="text-[10px] text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-2.5 border-t border-violet-500/10 px-2.5 pb-2.5 pt-2">
          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.aspectRatio}</p>
            <div className="flex flex-wrap gap-1">
              {IMAGE_ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onChange({ aspectRatio: ratio as ImageAspectRatio })}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${pill(value.aspectRatio === ratio)}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <ImageResolutionPanel
            value={value.resolution}
            onChange={(resolution: ImageResolutionCap) => onChange({ resolution })}
            accent="violet"
            variant="dark"
          />

          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-400">{m.wizard.artStyleLabel}</p>
            <div className="flex flex-wrap gap-1">
              {artStyleIdsForPicker().map((id) => {
                const copy = m.wizard.artStyles[id as ArtStyleId];
                const selected = value.artStyleId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange({ artStyleId: id })}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${pill(selected)}`}
                    title={copy?.description}
                  >
                    {copy?.title ?? id}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.lighting}</p>
            <select
              value={value.lightingPreset}
              onChange={(e) =>
                onChange({ lightingPreset: e.target.value as UltraLightingPreset })
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
            >
              {ULTRA_LIGHTING_PRESETS.map((id) => (
                <option key={id} value={id}>
                  {pc.lightingPresets[id]}
                </option>
              ))}
            </select>
            {value.lightingPreset === "custom" ? (
              <input
                value={value.lightingCustom ?? ""}
                onChange={(e) => onChange({ lightingCustom: e.target.value })}
                placeholder={pc.customPlaceholder}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 placeholder:text-slate-600"
              />
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.background}</p>
            <select
              value={value.backgroundPreset}
              onChange={(e) =>
                onChange({ backgroundPreset: e.target.value as UltraBackgroundPreset })
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
            >
              {ULTRA_BACKGROUND_PRESETS.map((id) => (
                <option key={id} value={id}>
                  {pc.backgroundPresets[id]}
                </option>
              ))}
            </select>
            {value.backgroundPreset === "custom" ? (
              <input
                value={value.backgroundCustom ?? ""}
                onChange={(e) => onChange({ backgroundCustom: e.target.value })}
                placeholder={pc.customPlaceholder}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 placeholder:text-slate-600"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
