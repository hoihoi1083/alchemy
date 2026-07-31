"use client";

import type { ImagePostflight } from "@/lib/image-postflight";
import type { ImageVisionReview } from "@/lib/image-vision-gate";
import { visionReviewNeedsAttention } from "@/lib/image-vision-gate";

type Props = {
  postflight: ImagePostflight;
  visionReview?: ImageVisionReview | null;
  busy?: boolean;
  visionBusy?: boolean;
  /** light = micro-wizard white steps; dark = classic / DoneStep. */
  variant?: "light" | "dark";
  labels: {
    title: string;
    resolution: string;
    aspect: string;
    safeForVideo: string;
    notSafeForVideo: string;
    lowResolution: string;
    verySmall: string;
    analyzing: string;
    visionTitle: string;
    visionAnalyzing: string;
    visionScore: string;
    visionSummary: string;
    visionIssues: string;
    visionPass: string;
  };
};

export function ImagePostflightPanel({
  postflight,
  visionReview,
  busy,
  visionBusy,
  variant = "dark",
  labels,
}: Props) {
  const visionAttention = visionReviewNeedsAttention(visionReview);
  const light = variant === "light";

  return (
    <div
      className={
        light
          ? "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
          : "rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-100"
      }
    >
      <p className={light ? "font-semibold text-slate-900" : "font-semibold text-emerald-50"}>
        {labels.title}
      </p>
      {busy ? (
        <p className={light ? "mt-2 text-slate-500" : "mt-2 text-emerald-200/80"}>
          {labels.analyzing}
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          <li>
            {labels.resolution
              .replace("{width}", String(postflight.width))
              .replace("{height}", String(postflight.height))}
          </li>
          <li>{labels.aspect.replace("{ratio}", postflight.aspectRatio)}</li>
          {postflight.warnings.includes("very-small") && (
            <li className={light ? "text-amber-700" : "text-amber-200"}>{labels.verySmall}</li>
          )}
          {postflight.warnings.includes("low-resolution") && (
            <li className={light ? "text-amber-700" : "text-amber-200"}>
              {labels.lowResolution}
            </li>
          )}
          <li
            className={
              postflight.safeForVideo
                ? light
                  ? "text-emerald-700"
                  : "text-emerald-300"
                : light
                  ? "text-amber-700"
                  : "text-amber-200"
            }
          >
            {postflight.safeForVideo ? labels.safeForVideo : labels.notSafeForVideo}
          </li>
        </ul>
      )}

      <div
        className={
          light
            ? "mt-3 border-t border-slate-200 pt-3"
            : "mt-3 border-t border-emerald-800/40 pt-3"
        }
      >
        <p className={light ? "font-semibold text-slate-900" : "font-semibold text-emerald-50"}>
          {labels.visionTitle}
        </p>
        {visionBusy ? (
          <p className={light ? "mt-2 text-slate-500" : "mt-2 text-emerald-200/80"}>
            {labels.visionAnalyzing}
          </p>
        ) : visionReview && !visionReview.skipped ? (
          <div className="mt-2 space-y-1.5">
            <p
              className={
                visionAttention
                  ? light
                    ? "text-amber-700"
                    : "text-amber-200"
                  : light
                    ? "text-emerald-700"
                    : "text-emerald-300"
              }
            >
              {labels.visionScore.replace("{score}", String(visionReview.score))}
            </p>
            <p className={light ? "text-slate-600" : "text-emerald-100/90"}>
              {labels.visionSummary.replace("{summary}", visionReview.summary)}
            </p>
            {visionReview.issues.length > 0 ? (
              <p className={light ? "text-amber-700" : "text-amber-200"}>
                {labels.visionIssues.replace("{issues}", visionReview.issues.join("; "))}
              </p>
            ) : (
              <p className={light ? "text-emerald-700" : "text-emerald-300"}>
                {labels.visionPass}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
