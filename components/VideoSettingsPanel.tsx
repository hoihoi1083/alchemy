"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  canUseVideoResolution,
  minPlanForVideoResolution,
} from "@/lib/billing/plan-gates";
import {
  VIDEO_RESOLUTION_CAPS,
  videoResolutionsForPlan,
  type VideoResolutionCap,
} from "@/lib/billing/entitlements";
import { VIDEO_CREATIVITY_LEVELS } from "@/lib/video-creativity";
import {
  VIDEO_DURATIONS,
  VIDEO_MOTION_STYLES,
  type VideoResolution,
  type VideoSettings,
} from "@/lib/video-settings";

type Props = {
  value: VideoSettings;
  onChange: (next: VideoSettings) => void;
  /** Reference R2V: only resolution, duration, fast (motion/creativity ignored by API). */
  compact?: boolean;
  /** Setup step — billing-forward title; hides compact hint (caller shows setup hint). */
  setup?: boolean;
  /** Reference-reel paths: require explicit seconds before analyze (hide auto). */
  hideAutoDuration?: boolean;
  /** Storyboard confirm: only resolution (duration locked to trim picker). */
  resolutionOnly?: boolean;
  /**
   * Motion poster: only short durations (4/6/8). Hides auto + long TVC lengths.
   * Implies compact (no creativity / motion-style chrome).
   */
  motionPoster?: boolean;
  /** /ultra only — simple /studio hides Seedance vs H3; router picks the engine. */
  showEnginePicker?: boolean;
  variant?: "light" | "dark";
  /** Fused violet setup uses violet; classic video step keeps emerald. */
  accent?: "emerald" | "violet";
};

function pillClass(active: boolean, dark: boolean, accent: "emerald" | "violet") {
  if (active) {
    return accent === "violet" ? "bg-violet-600 text-white" : "bg-emerald-600 text-white";
  }
  return dark
    ? "border border-slate-600 text-slate-200"
    : "border border-slate-300 text-slate-600";
}

function asVideoResolution(r: VideoResolutionCap): VideoResolution {
  return r;
}

export function VideoSettingsPanel({
  value,
  onChange,
  compact = false,
  setup = false,
  hideAutoDuration = false,
  resolutionOnly = false,
  motionPoster = false,
  showEnginePicker = false,
  variant = "light",
  accent,
}: Props) {
  const { m } = useLocale();
  const { plan, maxVideoResolution } = useUserPlanEntitlements();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateRes, setGateRes] = useState<VideoResolutionCap>("720p");
  const dark = variant === "dark";
  const tone = accent ?? (setup ? "violet" : "emerald");
  const compactMode = compact || setup || motionPoster;
  const durationOptions = (
    motionPoster
      ? VIDEO_DURATIONS.filter((d) => d === "4" || d === "6" || d === "8")
      : hideAutoDuration
        ? VIDEO_DURATIONS.filter((d) => d !== "auto")
        : VIDEO_DURATIONS
  );
  const allowedResolutions = videoResolutionsForPlan(plan).map(asVideoResolution);
  const linkClass =
    tone === "violet"
      ? dark
        ? "font-medium text-violet-300 underline-offset-2 hover:underline"
        : "font-medium text-violet-700 underline-offset-2 hover:underline"
      : dark
        ? "font-medium text-emerald-400 underline-offset-2 hover:underline"
        : "font-medium text-emerald-700 underline-offset-2 hover:underline";
  const selectedCardClass =
    tone === "violet"
      ? "border-violet-400 bg-violet-50 text-slate-900"
      : "border-violet-400 bg-violet-50 text-slate-900";
  const checkboxClass =
    tone === "violet"
      ? "size-4 rounded border-slate-300 text-violet-600 accent-violet-600"
      : "size-4 rounded border-slate-600";

  useEffect(() => {
    if (!allowedResolutions.includes(value.resolution)) {
      onChange({ ...value, resolution: asVideoResolution(maxVideoResolution) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp only when plan/selection drifts
  }, [maxVideoResolution, value.resolution]);

  useEffect(() => {
    if (!motionPoster) return;
    const allowed = new Set(["4", "6", "8"]);
    if (!allowed.has(String(value.duration))) {
      onChange({ ...value, duration: "6", autoSecondFrame: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp poster duration once when mode engages
  }, [motionPoster, value.duration]);

  return (
    <div
      className={
        dark
          ? "space-y-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4"
          : setup
            ? "space-y-4"
            : "space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
      }
    >
      {!setup ? (
        <h3
          className={
            dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-900"
          }
        >
          {compact
            ? m.wizard.videoReferenceOutputSettingsTitle
            : m.wizard.videoSettingsTitle}
        </h3>
      ) : null}
      {compact && !setup && (
        <p className="text-xs text-slate-400">{m.wizard.videoReferenceOutputSettingsHint}</p>
      )}

      <div>
        <p
          className={
            dark ? "mb-2 text-xs font-medium text-slate-400" : "mb-2 text-xs font-medium text-slate-600"
          }
        >
          {m.wizard.videoSettingsResolution}
        </p>
        <div className="flex flex-wrap gap-2">
          {VIDEO_RESOLUTION_CAPS.map((r) => {
            const allowed = canUseVideoResolution(plan, r);
            const selected = value.resolution === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (!allowed) {
                    setGateRes(r);
                    setGateOpen(true);
                    return;
                  }
                  onChange({ ...value, resolution: r });
                }}
                aria-disabled={!allowed}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  !allowed
                    ? dark
                      ? "cursor-not-allowed border border-dashed border-slate-600 text-slate-500 opacity-70"
                      : "cursor-not-allowed border border-dashed border-slate-300 text-slate-400 opacity-80"
                    : pillClass(selected, dark, tone)
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        {maxVideoResolution !== "1080p" ? (
          <p className={dark ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-slate-500"}>
            {m.wizard.videoResolutionPlanHint.replace("{max}", maxVideoResolution)}{" "}
            <Link href="/pricing" className={linkClass}>
              {m.wizard.videoResolutionUpgradeLink}
            </Link>
          </p>
        ) : null}
      </div>

      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan={minPlanForVideoResolution(gateRes)}
        featureLabel={gateRes}
      />

      {!resolutionOnly ? (
      <div>
        <p
          className={
            dark ? "mb-2 text-xs font-medium text-slate-400" : "mb-2 text-xs font-medium text-slate-600"
          }
        >
          {m.wizard.videoSettingsDuration}
        </p>
        <div className="flex flex-wrap gap-2">
          {durationOptions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ ...value, duration: d })}
              className={`rounded-full px-4 py-2 text-sm font-medium ${pillClass(value.duration === d, dark, tone)}`}
            >
              {d === "auto" ? m.wizard.videoDurationAuto : `${d}s`}
            </button>
          ))}
        </div>
      </div>
      ) : null}

      {!compactMode && !resolutionOnly && (
        <>
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
                  ? selectedCardClass
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
          className={`mt-0.5 ${checkboxClass}`}
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
                  ? selectedCardClass
                  : "border-slate-300 text-slate-600"
              }`}
            >
              {m.wizard.videoMotionStyles[s]}
            </button>
          ))}
        </div>
      </div>
        </>
      )}

      {showEnginePicker && !resolutionOnly ? (
      <div>
        <p className={`mb-2 text-xs font-medium ${dark ? "text-slate-400" : "text-slate-600"}`}>
          {m.wizard.videoEngineLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["seedance", m.wizard.videoEngineSeedance],
              ["minimax-h3", m.wizard.videoEngineMinimaxH3],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...value, videoEngine: id })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${pillClass(
                (value.videoEngine ?? "minimax-h3") === id,
                dark,
                tone,
              )}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={`mt-1.5 text-[11px] ${dark ? "text-slate-500" : "text-slate-500"}`}>
          {m.wizard.videoEngineHint}
        </p>
      </div>
      ) : null}

      {!resolutionOnly ? (
      <label
        className={`flex cursor-pointer items-center gap-3 text-sm ${
          dark ? "text-slate-300" : "text-slate-700"
        }`}
      >
        <input
          type="checkbox"
          checked={value.fast}
          onChange={(e) => onChange({ ...value, fast: e.target.checked })}
          className={checkboxClass}
        />
        {m.wizard.videoSettingsFast}
      </label>
      ) : null}
    </div>
  );
}
