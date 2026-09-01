"use client";

import { useState } from "react";
import type { ContentResearchApplyRef } from "@/lib/content-research-apply";
import { applyResearchPostReferences } from "@/lib/content-research-apply-refs";
import { wantsResearchVideoReference } from "@/lib/content-research-infer";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";

type ResearchRefStrings = {
  researchRefTitle: string;
  researchRefHint: string;
  researchRefOpenPost: string;
  researchRefRedownload: string;
  researchRefRedownloadAgain: string;
  researchRefRedownloading: string;
  researchRefRedownloadFailed: string;
  researchRefMissingNote: string;
  researchRefManualUpload?: string;
};

type WizardResearchApi = Pick<
  StudioWizardValue,
  | "promotionMode"
  | "imageRefPhoto"
  | "imageRefPreviewUrl"
  | "referenceAd"
  | "referencePreviewUrl"
  | "referenceIsVideo"
  | "setImageCreativeMode"
  | "setImageRefPhoto"
  | "onImageInputModeChange"
  | "onVideoCreativeModeChange"
  | "onReferenceAdFile"
>;

export function ResearchReferencePostCard({
  researchApply,
  wizard,
  strings,
  cardClassName = "pv-card",
  titleClassName = "pv-card-title",
  manualUploadLabel,
  onManualUpload,
}: {
  researchApply: ContentResearchApplyRef;
  wizard: WizardResearchApi;
  strings: ResearchRefStrings;
  cardClassName?: string;
  titleClassName?: string;
  manualUploadLabel?: string;
  onManualUpload?: (file: File) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const angle = researchApply.angle;
  const postUrl = angle.sourceUrl?.trim() || "";
  const coverUrl =
    angle.sourceCoverImageUrl || angle.sourceImageUrls?.[0] || "";
  const imageUrls =
    angle.sourceImageUrls ??
    (angle.sourceCoverImageUrl ? [angle.sourceCoverImageUrl] : undefined);
  const loadVideo = wantsResearchVideoReference(
    angle.format,
    imageUrls?.length ?? 0,
    angle.sourceVideoUrl,
  );
  const hasLocalRef = loadVideo
    ? Boolean(wizard.referenceAd && wizard.referenceIsVideo)
    : Boolean(wizard.imageRefPhoto);
  const canRedownload = Boolean(coverUrl || postUrl || angle.sourceVideoUrl);
  const refMissing = !hasLocalRef;

  async function redownload() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await applyResearchPostReferences(
        {
          platform: researchApply.plan.platform,
          promotionMode: wizard.promotionMode,
          imageUrls,
          coverUrl: angle.sourceCoverImageUrl,
          videoUrl: angle.sourceVideoUrl,
          postUrl: angle.sourceUrl,
          postId: angle.id,
          loadVideo,
        },
        {
          setImageCreativeMode: wizard.setImageCreativeMode,
          setImageRefPhoto: wizard.setImageRefPhoto,
          onImageInputModeChange: wizard.onImageInputModeChange,
          onVideoCreativeModeChange: wizard.onVideoCreativeModeChange,
          onReferenceAdFile: wizard.onReferenceAdFile,
        },
      );
      const ok = loadVideo ? result.videoAttached || result.coverAttached : result.coverAttached;
      if (!ok) setError(strings.researchRefRedownloadFailed);
    } catch {
      setError(strings.researchRefRedownloadFailed);
    } finally {
      setBusy(false);
    }
  }

  const previewVideoUrl =
    wizard.referenceIsVideo && wizard.referencePreviewUrl
      ? wizard.referencePreviewUrl
      : null;
  const previewImageUrl =
    !loadVideo && wizard.imageRefPreviewUrl
      ? wizard.imageRefPreviewUrl
      : coverUrl || null;

  return (
    <section className={cardClassName}>
      <div className="mb-2">
        <h3 className={titleClassName}>{strings.researchRefTitle}</h3>
      </div>
      <p className="text-sm text-slate-600">{strings.researchRefHint}</p>
      {angle.sourceTitle || angle.title ? (
        <p className="mt-2 text-sm font-medium text-slate-800">
          {angle.sourceTitle || angle.title}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        {previewImageUrl ? (
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-violet-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        {previewVideoUrl ? (
          <video
            src={previewVideoUrl}
            className="max-h-28 max-w-[10rem] rounded-lg border border-violet-300 bg-slate-950/5 object-contain"
            muted
            playsInline
            controls
            preload="metadata"
          />
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {postUrl ? (
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100"
          >
            {strings.researchRefOpenPost}
          </a>
        ) : null}
        {canRedownload ? (
          <button
            type="button"
            onClick={() => void redownload()}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? strings.researchRefRedownloading
              : refMissing
                ? strings.researchRefRedownload
                : strings.researchRefRedownloadAgain}
          </button>
        ) : null}
      </div>
      {refMissing ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          {strings.researchRefMissingNote}
        </p>
      ) : null}
      {refMissing && manualUploadLabel && onManualUpload ? (
        <div className="mt-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            {manualUploadLabel}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (file) onManualUpload(file);
              }}
            />
          </label>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
