"use client";

import type { VideoStoryboardPlan } from "@/lib/video-storyboard-types";
import type { StoryboardLookBible, TvcShotRole } from "@/lib/shot-recipes";
import {
  emptyLookBible,
  localizeTvcShotRole,
  lookBibleSummaryLine,
} from "@/lib/shot-recipes";

type Props = {
  plan: VideoStoryboardPlan;
  /** Optional still URLs keyed by imageIndex (1-based) after generate. */
  stillUrls?: Partial<Record<number, string>>;
  title: string;
  bibleLabel: string;
  emptyStillLabel: string;
  cameraLabel: string;
  lightingLabel: string;
  variant?: "light" | "dark";
  /** When set, look bible fields are editable. */
  onLookBibleChange?: (bible: StoryboardLookBible) => void;
  lookBibleFieldLabels?: {
    palette: string;
    lighting: string;
    materials: string;
    negatives: string;
  };
  roleLabels?: Partial<Record<TvcShotRole, string>>;
  onRegenerateScene?: (index0: number) => void;
  regenerateBusyIndex?: number | null;
  regenerateLabel?: string;
  regeneratingLabel?: string;
};

/**
 * 九宫格-style shot map — numbered cells for plan review (not always 9 generates).
 * Default product TVC uses 4 scenes in a 2×2 grid.
 */
export function StoryboardShotMap({
  plan,
  stillUrls,
  title,
  bibleLabel,
  emptyStillLabel,
  cameraLabel,
  lightingLabel,
  variant = "dark",
  onLookBibleChange,
  lookBibleFieldLabels,
  roleLabels,
  onRegenerateScene,
  regenerateBusyIndex,
  regenerateLabel,
  regeneratingLabel,
}: Props) {
  const isDark = variant === "dark";
  const bible = plan.lookBible ?? emptyLookBible();
  const bibleSummary = lookBibleSummaryLine(bible) || plan.visualDirection?.trim() || "";
  const editable = Boolean(onLookBibleChange && lookBibleFieldLabels);

  function patchBible(partial: Partial<StoryboardLookBible>) {
    onLookBibleChange?.({ ...bible, ...partial });
  }

  return (
    <div
      className={`space-y-3 rounded-xl border px-3 py-3 ${
        isDark
          ? "border-teal-800/60 bg-teal-950/25"
          : "border-teal-200 bg-teal-50/80"
      }`}
    >
      <div>
        <p
          className={`text-sm font-semibold ${isDark ? "text-teal-50" : "text-teal-950"}`}
        >
          {title}
        </p>
        {!editable && bibleSummary ? (
          <p
            className={`mt-1 text-[11px] leading-relaxed ${
              isDark ? "text-teal-200/85" : "text-teal-800/90"
            }`}
          >
            <span className="font-medium">{bibleLabel}</span> {bibleSummary}
          </p>
        ) : null}
      </div>

      {editable && lookBibleFieldLabels ? (
        <div
          className={`grid gap-2 rounded-lg border p-2.5 sm:grid-cols-2 ${
            isDark
              ? "border-teal-800/40 bg-slate-950/40"
              : "border-teal-200 bg-white"
          }`}
        >
          <p
            className={`sm:col-span-2 text-[11px] font-semibold ${
              isDark ? "text-teal-100" : "text-teal-900"
            }`}
          >
            {bibleLabel}
          </p>
          {(
            [
              ["palette", lookBibleFieldLabels.palette],
              ["lighting", lookBibleFieldLabels.lighting],
              ["materials", lookBibleFieldLabels.materials],
              ["negatives", lookBibleFieldLabels.negatives],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className={`block text-[10px] ${isDark ? "text-teal-200/80" : "text-slate-600"}`}
            >
              {label}
              <input
                value={bible[key]}
                onChange={(e) => patchBible({ [key]: e.target.value })}
                className={`mt-0.5 w-full rounded-md border px-2 py-1 text-[11px] ${
                  isDark
                    ? "border-teal-800/60 bg-slate-900 text-teal-50"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div
        className={`grid gap-2 ${
          plan.scenes.length === 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {plan.scenes.map((scene, index0) => {
          const url = stillUrls?.[scene.imageIndex];
          const roleLabel = localizeTvcShotRole(scene.role, roleLabels ?? {});
          return (
            <div
              key={scene.imageIndex}
              className={`overflow-hidden rounded-lg border ${
                isDark
                  ? "border-teal-800/50 bg-slate-950/40"
                  : "border-teal-200 bg-white"
              }`}
            >
              <div
                className={`relative aspect-[3/4] ${
                  isDark ? "bg-slate-900" : "bg-slate-100"
                }`}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-full items-center justify-center p-2 text-center text-[10px] ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {emptyStillLabel}
                  </div>
                )}
                <span
                  className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isDark
                      ? "bg-teal-500 text-teal-950"
                      : "bg-teal-600 text-white"
                  }`}
                >
                  {scene.imageIndex}
                </span>
              </div>
              <div className="space-y-0.5 p-2">
                <p
                  className={`truncate text-[11px] font-semibold tracking-wide ${
                    isDark ? "text-teal-200" : "text-teal-800"
                  }`}
                >
                  {roleLabel || scene.role}
                </p>
                <p
                  className={`line-clamp-2 text-[11px] leading-snug ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  {scene.sceneDescriptionZh || scene.onImageCopyZh || "—"}
                </p>
                {scene.cameraMotionEn ? (
                  <p
                    className={`line-clamp-1 text-[10px] ${
                      isDark ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {cameraLabel}: {scene.cameraMotionEn}
                  </p>
                ) : null}
                {scene.lightingEn ? (
                  <p
                    className={`line-clamp-1 text-[10px] ${
                      isDark ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {lightingLabel}: {scene.lightingEn}
                  </p>
                ) : null}
                {url && onRegenerateScene ? (
                  <button
                    type="button"
                    disabled={regenerateBusyIndex != null}
                    onClick={() => onRegenerateScene(index0)}
                    className={`mt-1.5 w-full rounded-md border px-2 py-1.5 text-[10px] font-semibold disabled:opacity-40 ${
                      isDark
                        ? "border-amber-500/60 bg-amber-950/40 text-amber-100"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {regenerateBusyIndex === index0
                      ? regeneratingLabel ?? "…"
                      : regenerateLabel ?? "Regenerate"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
