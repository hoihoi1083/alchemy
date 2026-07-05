"use client";

import { useLocale } from "@/components/LocaleProvider";
import { VIDEO_CREATIVITY_LEVELS } from "@/lib/video-creativity";
import {
  VIDEO_DURATIONS,
  VIDEO_MOTION_STYLES,
  VIDEO_RESOLUTIONS,
  type VideoSettings,
} from "@/lib/video-settings";

type Props = {
  value: VideoSettings;
  onChange: (next: VideoSettings) => void;
};

function pillClass(active: boolean) {
  return active
    ? "bg-emerald-600 text-white"
    : "border border-slate-300 text-slate-600";
}

export function VideoSettingsPanel({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{m.wizard.videoSettingsTitle}</h3>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">{m.wizard.videoSettingsResolution}</p>
        <div className="flex flex-wrap gap-2">
          {VIDEO_RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ ...value, resolution: r })}
              className={`rounded-full px-4 py-2 text-sm font-medium ${pillClass(value.resolution === r)}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">{m.wizard.videoSettingsDuration}</p>
        <div className="flex flex-wrap gap-2">
          {VIDEO_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ ...value, duration: d })}
              className={`rounded-full px-4 py-2 text-sm font-medium ${pillClass(value.duration === d)}`}
            >
              {d === "auto" ? m.wizard.videoDurationAuto : `${d}s`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">{m.wizard.videoSettingsCreativity}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VIDEO_CREATIVITY_LEVELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  creativity: c,
                  autoSecondFrame: c !== "subtle",
                })
              }
              className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                value.creativity === c
                  ? "border-emerald-400 bg-emerald-50 text-slate-900"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              {m.wizard.videoCreativityLevels[c]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.autoSecondFrame}
          onChange={(e) => onChange({ ...value, autoSecondFrame: e.target.checked })}
          className="mt-0.5 size-4 rounded border-slate-600"
        />
        <span>
          <span className="font-medium text-slate-900">{m.wizard.videoAutoSecondFrame}</span>
          <span className="mt-1 block text-xs text-slate-500">{m.wizard.videoAutoSecondFrameHint}</span>
        </span>
      </label>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">{m.wizard.videoSettingsMotion}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VIDEO_MOTION_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...value, motionStyle: s })}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                value.motionStyle === s
                  ? "border-emerald-400 bg-emerald-50 text-slate-900"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              {m.wizard.videoMotionStyles[s]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.fast}
          onChange={(e) => onChange({ ...value, fast: e.target.checked })}
          className="size-4 rounded border-slate-600"
        />
        {m.wizard.videoSettingsFast}
      </label>
    </div>
  );
}
