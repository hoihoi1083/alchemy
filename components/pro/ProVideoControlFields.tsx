"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { artStyleIdsForPicker, type ArtStyleId } from "@/lib/art-style";
import { videoResolutionsForPlan } from "@/lib/billing/entitlements";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  ULTRA_VIDEO_ASPECT_RATIOS,
  ULTRA_VIDEO_CAMERAS,
  type UltraVideoProControls,
} from "@/lib/ultra-pro-controls";

type Props = {
  value: UltraVideoProControls;
  onChange: (patch: Partial<UltraVideoProControls>) => void;
  /** Image-to-video shows camera + motion; text-to-video hides camera row. */
  showCamera?: boolean;
};

function pill(active: boolean) {
  return active
    ? "border-violet-400/80 bg-violet-600/30 text-violet-100 ring-1 ring-violet-400/40"
    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500";
}

export function ProVideoControlFields({ value, onChange, showCamera = true }: Props) {
  const { m } = useLocale();
  const pc = m.ultraCanvas.videoProControls;
  const { plan, maxVideoResolution, planReady } = useUserPlanEntitlements();
  const allowedResolutions = planReady
    ? videoResolutionsForPlan(plan)
    : videoResolutionsForPlan("master");
  const [open, setOpen] = useState(false);

  const resolution =
    allowedResolutions.includes(value.resolution) ? value.resolution : maxVideoResolution;

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
              {ULTRA_VIDEO_ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onChange({ aspectRatio: ratio })}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${pill(value.aspectRatio === ratio)}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {showCamera ? (
            <div>
              <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.camera}</p>
              <select
                value={value.camera}
                onChange={(e) => onChange({ camera: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
              >
                {ULTRA_VIDEO_CAMERAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.duration}</p>
              <select
                value={value.duration}
                onChange={(e) => onChange({ duration: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
              >
                {["4", "6", "8", "10"].map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.resolution}</p>
              <select
                value={resolution}
                onChange={(e) =>
                  onChange({
                    resolution: e.target.value as UltraVideoProControls["resolution"],
                  })
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
              >
                {allowedResolutions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.motionStrength}</p>
            <input
              type="range"
              min={0}
              max={100}
              value={value.motionStrength ?? 35}
              onChange={(e) => onChange({ motionStrength: Number(e.target.value) })}
              className="w-full accent-violet-500"
            />
            <p className="mt-0.5 text-[10px] text-slate-500">
              {value.motionStrength ?? 35}% — {pc.motionHint}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-400">{pc.artStyle}</p>
            <div className="flex flex-wrap gap-1">
              {artStyleIdsForPicker({ videoSafeOnly: true }).map((id) => {
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

          <label className="flex items-center gap-2 text-[10px] text-slate-400">
            <input
              type="checkbox"
              checked={value.fast}
              onChange={(e) => onChange({ fast: e.target.checked })}
              className="accent-violet-500"
            />
            {pc.fastTier}
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-400">
            <input
              type="checkbox"
              checked={value.generateAudio}
              onChange={(e) => onChange({ generateAudio: e.target.checked })}
              className="accent-violet-500"
            />
            {pc.generateAudio}
          </label>
        </div>
      ) : null}
    </div>
  );
}
