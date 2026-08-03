"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { useOptionalWizard } from "@/components/studio/WizardContext";
import { ImageReviewStepper } from "@/components/studio/ImageReviewStepper";
import { downloadMediaUrl } from "@/lib/download-media";
import { writeCaptionHandoff } from "@/lib/caption-studio-draft";
import { isFalCdnUrl } from "@/lib/pipeline/safe-url";

/** Same header layout grid as ImageReviewGallery. */
const VIDEO_REVIEW_LAYOUT_CSS = `
.video-review-header {
  display: grid;
  grid-template-columns: 1fr;
  align-items: stretch;
  gap: 1rem;
}
.video-review-header-cards {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .video-review-header-cards {
    flex-direction: row;
    align-items: stretch;
  }
}
@media (min-width: 1024px) {
  .video-review-header {
    grid-template-columns: minmax(15rem, 20rem) minmax(0, 1fr);
    align-items: center;
    gap: 1.25rem;
  }
  .video-review-header-cards {
    flex-direction: row;
    align-items: stretch;
  }
}
.video-review-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 639px) {
  .video-review-meta .video-review-meta-value {
    font-size: 11px;
  }
}
`;

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.2 13.4 8.6 18.8 10 13.4 11.4 12 16.8 10.6 11.4 5.2 10 10.6 8.6 12 3.2Z" />
      <path d="m18.2 14.2.7 2.6 2.6.7-2.6.7-.7 2.6-.7-2.6-2.6-.7 2.6-.7.7-2.6Z" opacity="0.85" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M16 10a6 6 0 1 1-1.4-3.8M16 4v4h-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCaptions({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 11.5h4M5.5 8.5h9M12 11.5h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.2 19 6.4v5.1c0 4.35-2.95 8.15-7 9.2-4.05-1.05-7-4.85-7-9.2V6.4L12 3.2Z" />
      <path d="m9.2 12 1.9 1.9 3.7-3.8" />
    </svg>
  );
}

function IconDuration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconResolution({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="5" width="14" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 15.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconReel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="5" y="2.5" width="10" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 8.5v4l3.5-2-3.5-2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CompactAction({
  label,
  onClick,
  disabled,
  busy,
  icon,
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium leading-tight text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function MetaCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-1.5 py-3 text-center sm:px-3">
      <p className="truncate text-[10px] font-medium tracking-wide text-slate-500">{label}</p>
      <div className="mt-1.5 flex min-w-0 items-center justify-center gap-1 sm:gap-1.5">
        {icon}
        <p className="video-review-meta-value truncate text-[11px] font-bold text-slate-900 sm:text-sm">
          {value}
        </p>
      </div>
    </div>
  );
}

function durationLabel(duration: string | number, autoLabel: string): string {
  if (duration === "auto") return autoLabel;
  return `${duration}s`;
}

/** Standalone / design-preview payload — no generation required. */
export type VideoResultPreviewModel = {
  videoUrl: string;
  productLabel?: string;
  durationLabel?: string;
  resolution?: string;
  styleLabel?: string;
  bgmNote?: string | null;
  videoNote?: string | null;
};

/**
 * Video output screen — same layout language as ImageReviewGallery
 * (phase rail, hero + status/meta cards, media card + compact actions, regenerate banner).
 */
export function VideoResultPanel({
  onRegenerate,
  preview,
}: {
  onRegenerate?: () => void;
  /** When set, renders without requiring live wizard generation state. */
  preview?: VideoResultPreviewModel;
} = {}) {
  const { m } = useLocale();
  const router = useRouter();
  const wizard = useOptionalWizard();
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  if (!preview && !wizard) {
    throw new Error("VideoResultPanel requires WizardProvider or a preview model");
  }

  const videoUrl = preview?.videoUrl ?? wizard?.videoUrl ?? null;
  const resolvedProductLabel = preview?.productLabel
    ? preview.productLabel
    : wizard
      ? wizard.product.trim() || wizard.conceptIdea.trim() || wizard.headline.trim() || "—"
      : "—";
  const duration =
    preview?.durationLabel ??
    (wizard?.videoTimingManifest?.outputDurationSec
      ? `${Math.round(wizard.videoTimingManifest.outputDurationSec * 10) / 10}s`
      : wizard
        ? durationLabel(wizard.videoSettings.duration, m.wizard.videoDurationAuto)
        : "8s");
  const clipCount = wizard?.videoTimingManifest?.clipBoundaries?.length ?? 0;
  const resolution = preview?.resolution ?? wizard?.videoSettings.resolution ?? "720p";
  const styleLabel =
    preview?.styleLabel ??
    (wizard?.visualStyleId === "ugc-presenter"
      ? m.wizard.pathUgcPresenterTitle
      : wizard?.videoCreativeMode === "reference-concept"
        ? m.wizard.pathReferenceVideoTitle
        : m.wizard.pathQuickTitle);
  const bgmNote = preview ? preview.bgmNote : wizard?.bgmNote;
  const videoNote = preview ? preview.videoNote : wizard?.videoNote;
  const regenerateDisabled = preview
    ? false
    : Boolean(wizard?.videoBusy || wizard?.videoGenerateDisabledReason);

  async function handleDownload() {
    if (!videoUrl) return;
    setDownloadError(null);
    setActionNote(null);
    setDownloadBusy(true);
    try {
      await downloadMediaUrl(videoUrl, "marketing-reel.mp4");
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : m.errors.videoFailed);
    } finally {
      setDownloadBusy(false);
    }
  }

  function handleCaptions() {
    if (!videoUrl) return;
    if (preview) {
      setActionNote("Preview mode — captions studio skipped.");
      return;
    }
    setActionNote(null);
    writeCaptionHandoff({
      videoUrl: wizard!.captionHandoffVideoUrl ?? videoUrl,
      captionLines: wizard!.captionLines,
      label: wizard!.headline?.trim() || wizard!.product?.trim() || undefined,
      timingManifest: wizard!.videoTimingManifest ?? undefined,
    });
    router.push("/captions");
  }

  function handleRegenerate() {
    setActionNote(null);
    if (preview) {
      setActionNote("Preview mode — regenerate is disabled.");
      return;
    }
    if (wizard?.videoGenerateDisabledReason) {
      setActionNote(wizard.videoGenerateDisabledReason);
      return;
    }
    onRegenerate?.();
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <style dangerouslySetInnerHTML={{ __html: VIDEO_REVIEW_LAYOUT_CSS }} />
      <ImageReviewStepper activeIndex={4} />

      <div className="video-review-header">
        <div className="min-w-0 shrink-0">
          <div className="mb-2 text-violet-600">
            <IconSparkles className="h-6 w-6" />
          </div>
          <h2 className="text-balance text-[1.375rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {m.wizard.videoReviewHeroBefore}{" "}
            <span className="text-violet-600">{m.wizard.videoReviewHeroAccent}</span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {m.wizard.videoReviewHeroHint}
          </p>
        </div>

        <div className="video-review-header-cards">
          <div className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span
              className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-bold text-white"
              style={{ width: 36, height: 36, minWidth: 36 }}
            >
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {m.wizard.videoReviewCompleteTitle}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {videoUrl
                  ? m.wizard.videoReviewCompleteBody
                  : m.wizard.videoReviewCompleteEmpty}
              </p>
            </div>
          </div>

          <div className="video-review-meta grid min-w-0 flex-[1.15] divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <MetaCell
              label={m.wizard.videoReviewMetaDuration}
              value={
                clipCount > 1
                  ? `${duration} · ${clipCount}`
                  : duration
              }
              icon={<IconDuration className="h-4 w-4 shrink-0 text-violet-600" />}
            />
            <MetaCell
              label={m.wizard.videoReviewMetaResolution}
              value={resolution}
              icon={<IconResolution className="h-4 w-4 shrink-0 text-violet-600" />}
            />
            <MetaCell
              label={m.wizard.videoReviewMetaStyle}
              value={styleLabel}
              icon={<IconReel className="h-4 w-4 shrink-0 text-violet-600" />}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {m.wizard.videoReviewGeneratedHeading}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {m.wizard.videoReviewGeneratedSub
                .replace("{style}", styleLabel)
                .replace("{product}", resolvedProductLabel)}
            </p>
          </div>
          <span className="inline-flex w-fit max-w-full items-center rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700">
            <span className="truncate">{styleLabel}</span>
          </span>
        </div>

        {!videoUrl ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {m.wizard.videoReviewCompleteEmpty}
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {bgmNote ? (
              <p className="border-b border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-900">
                {bgmNote}
              </p>
            ) : null}
            {videoNote ? (
              <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {videoNote}
              </p>
            ) : null}
            {isFalCdnUrl(videoUrl) ? (
              <p className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                {m.errors.postProcessIncomplete}
              </p>
            ) : null}

            <div className="flex aspect-9/16 max-h-[min(70vh,36rem)] w-full items-center justify-center bg-stone-950">
              <video
                src={videoUrl}
                controls
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="mt-auto border-t border-slate-100 p-2.5 sm:p-3">
              <div className="grid grid-cols-2 gap-1.5">
                <CompactAction
                  icon={<IconDownload className="h-3.5 w-3.5 shrink-0" />}
                  label={downloadBusy ? m.imageCanvas.downloading : m.wizard.download}
                  busy={downloadBusy}
                  onClick={() => void handleDownload()}
                />
                <CompactAction
                  icon={<IconCaptions className="h-3.5 w-3.5 shrink-0" />}
                  label={m.captions.openFromDone}
                  onClick={handleCaptions}
                />
                <CompactAction
                  className="col-span-2"
                  icon={<IconRefresh className="h-3.5 w-3.5 shrink-0" />}
                  label={m.wizard.videoReviewRegenerateOneBtn}
                  disabled={regenerateDisabled}
                  onClick={handleRegenerate}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {downloadError ? (
        <p className="text-center text-xs text-amber-700">{downloadError}</p>
      ) : null}
      {actionNote ? (
        <p className="text-center text-xs text-amber-700">{actionNote}</p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-[#F5F3FF] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
            <IconRefresh className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {m.wizard.videoReviewRegenerateBannerTitle}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {m.wizard.videoReviewRegenerateBannerBody}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={regenerateDisabled}
          onClick={handleRegenerate}
          className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-500 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <IconRefresh className="h-4 w-4" />
          {m.wizard.videoReviewRegenerateBannerBtn}
        </button>
      </div>
    </div>
  );
}

/** Footer bar for video result — same structure as ImageReviewFooterBar. */
export function VideoReviewFooterBar({
  onBack,
  onDownload,
  onGenerateOneMore,
  downloadBusy,
  generateBusy,
}: {
  onBack: () => void;
  onDownload: () => void;
  onGenerateOneMore: () => void;
  downloadBusy?: boolean;
  generateBusy?: boolean;
}) {
  const { m } = useLocale();

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50 sm:w-auto"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
          {m.wizard.back}
        </button>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            disabled={downloadBusy}
            onClick={onDownload}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40 sm:w-auto"
          >
            <IconDownload className="h-4 w-4" />
            {downloadBusy ? m.imageCanvas.downloading : m.wizard.download}
          </button>
          <button
            type="button"
            disabled={generateBusy}
            onClick={onGenerateOneMore}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-600 bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:border-violet-700 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            <IconRefresh className="h-4 w-4" />
            {m.wizard.videoReviewGenerateOneMore}
          </button>
        </div>
      </div>

      <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
        <IconShield className="h-4 w-4 shrink-0 text-slate-400" />
        <span>{m.start.secureNote}</span>
      </p>
    </div>
  );
}
