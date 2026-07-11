"use client";

import type { ImagePostflight } from "@/lib/image-postflight";
import type { ImageVisionReview } from "@/lib/image-vision-gate";
import { visionReviewNeedsAttention } from "@/lib/image-vision-gate";

type Props = {
  postflight: ImagePostflight;
  visionReview?: ImageVisionReview | null;
  busy?: boolean;
  visionBusy?: boolean;
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
  labels,
}: Props) {
  const visionAttention = visionReviewNeedsAttention(visionReview);

  return (
    <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-100">
      <p className="font-semibold text-emerald-50">{labels.title}</p>
      {busy ? (
        <p className="mt-2 text-emerald-200/80">{labels.analyzing}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          <li>
            {labels.resolution
              .replace("{width}", String(postflight.width))
              .replace("{height}", String(postflight.height))}
          </li>
          <li>{labels.aspect.replace("{ratio}", postflight.aspectRatio)}</li>
          {postflight.warnings.includes("very-small") && (
            <li className="text-amber-200">{labels.verySmall}</li>
          )}
          {postflight.warnings.includes("low-resolution") && (
            <li className="text-amber-200">{labels.lowResolution}</li>
          )}
          <li className={postflight.safeForVideo ? "text-emerald-300" : "text-amber-200"}>
            {postflight.safeForVideo ? labels.safeForVideo : labels.notSafeForVideo}
          </li>
        </ul>
      )}

      <div className="mt-3 border-t border-emerald-800/40 pt-3">
        <p className="font-semibold text-emerald-50">{labels.visionTitle}</p>
        {visionBusy ? (
          <p className="mt-2 text-emerald-200/80">{labels.visionAnalyzing}</p>
        ) : visionReview && !visionReview.skipped ? (
          <div className="mt-2 space-y-1.5">
            <p className={visionAttention ? "text-amber-200" : "text-emerald-300"}>
              {labels.visionScore.replace("{score}", String(visionReview.score))}
            </p>
            <p className="text-emerald-100/90">
              {labels.visionSummary.replace("{summary}", visionReview.summary)}
            </p>
            {visionReview.issues.length > 0 ? (
              <p className="text-amber-200">
                {labels.visionIssues.replace("{issues}", visionReview.issues.join("; "))}
              </p>
            ) : (
              <p className="text-emerald-300">{labels.visionPass}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
