"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { downloadMediaUrl, downloadMediaUrls } from "@/lib/download-media";
import { writeImageCanvasHandoff } from "@/lib/image-canvas-handoff";
import { ImageReviewStepper } from "@/components/studio/ImageReviewStepper";
import {
  resolveGeneratedImageResultView,
  type GeneratedImageResultViewKind,
} from "@/lib/generated-image-result-view";
import { storyboardSceneDisplayCopy } from "@/lib/storyboard-scene-copy";
import { localizeTvcShotRole, tvcShotJobLine } from "@/lib/shot-recipes";

type ReviewItem = {
  url: string;
  label: string;
  /** Primary consumer script / caption under the still. */
  sublabel?: string;
  /** Optional beat description when different from caption. */
  beat?: string;
  /** 4-beat job line (establish / macro / orbit / payoff). */
  job?: string;
  index: number;
};

type Props = {
  /** When true, render Back / Download all / Generate one more + data-secure (preview page). */
  showStandaloneFooter?: boolean;
  onBack?: () => void;
};

/** Image grid column counts — use custom CSS (Tailwind lg: utilities are missing in this build). */
function gridClass(count: number): string {
  if (count <= 1) return "image-review-grid image-review-grid--1";
  if (count === 2) return "image-review-grid image-review-grid--2";
  if (count === 3) return "image-review-grid image-review-grid--3";
  if (count === 4) return "image-review-grid image-review-grid--4";
  return "image-review-grid image-review-grid--6";
}

const IMAGE_REVIEW_LAYOUT_CSS = `
.image-review-header {
  display: grid;
  grid-template-columns: 1fr;
  align-items: stretch;
  gap: 1rem;
}
.image-review-header-cards {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}
/* Phone landscape / small tablet: success + meta side by side under title */
@media (min-width: 640px) and (max-width: 1023px) {
  .image-review-header-cards {
    flex-direction: row;
    align-items: stretch;
  }
}
/* Laptop+: title left, both cards right on one row */
@media (min-width: 1024px) {
  .image-review-header {
    grid-template-columns: minmax(15rem, 20rem) minmax(0, 1fr);
    align-items: center;
    gap: 1.25rem;
  }
  .image-review-header-cards {
    flex-direction: row;
    align-items: stretch;
  }
}
.image-review-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}
.image-review-grid--1 {
  max-width: 20rem;
  margin-left: auto;
  margin-right: auto;
}
@media (min-width: 640px) {
  .image-review-grid--2,
  .image-review-grid--3,
  .image-review-grid--4,
  .image-review-grid--6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .image-review-grid--2 {
    max-width: 42rem;
    margin-left: auto;
    margin-right: auto;
  }
}
@media (min-width: 1024px) {
  .image-review-grid--3,
  .image-review-grid--6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .image-review-grid--4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .image-review-meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .image-review-meta .image-review-meta-value {
    font-size: 11px;
  }
}
`;


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

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 13.5V16h2.5L14.2 8.3a1.2 1.2 0 0 0 0-1.7L12.4 4.8a1.2 1.2 0 0 0-1.7 0L4 13.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function IconEye({ className }: { className?: string }) {
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
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.2 13.4 8.6 18.8 10 13.4 11.4 12 16.8 10.6 11.4 5.2 10 10.6 8.6 12 3.2Z" />
      <path d="m18.2 14.2.7 2.6 2.6.7-2.6.7-.7 2.6-.7-2.6-2.6-.7 2.6-.7.7-2.6Z" opacity="0.85" />
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

function ReviewImageFrame({
  item,
  selected,
  selectable,
  reviewable,
  reviewed,
  reviewHint,
  reviewedHint,
  imageGenKey,
  onSelect,
}: {
  item: ReviewItem;
  selected: boolean;
  selectable: boolean;
  reviewable?: boolean;
  reviewed?: boolean;
  reviewHint?: string;
  reviewedHint?: string;
  imageGenKey: number;
  onSelect: () => void;
}) {
  const media = (
    <>
      <span
        className="image-review-num absolute left-3 top-3 z-10 flex items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-md ring-2 ring-white/90"
        style={{ width: 28, height: 28, minWidth: 28, flexShrink: 0 }}
      >
        {item.index + 1}
      </span>
      {/* Fixed frame keeps cards even; object-contain shows the full image without crop */}
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-stone-100">
        <img
          src={`${item.url}${item.url.includes("?") ? "&" : "?"}v=${imageGenKey}-${item.index}`}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      {reviewable ? (
        <span
          className={`absolute bottom-2 left-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            reviewed
              ? "bg-violet-600 text-white"
              : "bg-amber-400 text-amber-950"
          }`}
        >
          {reviewed ? reviewedHint : reviewHint}
        </span>
      ) : null}
    </>
  );

  if (selectable || reviewable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`relative block w-full overflow-hidden text-left ${
          reviewable && !reviewed ? "ring-2 ring-inset ring-amber-300" : ""
        } ${selected ? "" : ""}`}
      >
        {media}
      </button>
    );
  }

  return <div className="relative overflow-hidden">{media}</div>;
}

/**
 * Reference-style review gallery for micro-wizard image.review.
 */
export function ImageReviewGallery({
  showStandaloneFooter = false,
  onBack,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const router = useRouter();
  const [downloadBusyIndex, setDownloadBusyIndex] = useState<number | null>(null);
  const [downloadAllBusy, setDownloadAllBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const view = resolveGeneratedImageResultView({
    imageUrl: wizard.imageUrl,
    useOriginalImage: wizard.useOriginalImage,
    imageVariantUrls: wizard.imageVariantUrls,
    campaignSlides: wizard.campaignSlides,
    storyboardScenes: wizard.storyboardScenes,
    cinematicScenes: wizard.cinematicScenes,
    effectiveImageOutputMode: wizard.effectiveImageOutputMode,
    isStoryboardOutput: wizard.isStoryboardOutput,
    isCinematicStitchOutput: wizard.isCinematicStitchOutput,
  });

  if (view.kind === "empty" || view.kind === "original") return null;

  const items = collectReviewItems(wizard, view.kind, m);
  if (items.length === 0) return null;

  const modeCopy = m.wizard.imageOutputModes[wizard.effectiveImageOutputMode];
  const aspect = wizard.imageAspectRatio || "4:5";
  const isStoryboardReview =
    wizard.workflowMode === "combined" &&
    (view.kind === "storyboard" || wizard.isStoryboardOutput);
  const hasError = Boolean(wizard.error) && items.length === 0;
  const completeBody = isStoryboardReview
    ? m.wizard.imageReviewStoryboardReadyBody
    : items.length === 1
      ? m.wizard.imageReviewCompleteBodySingle
      : m.wizard.imageReviewCompleteBodyMany.replace("{n}", String(items.length));
  const statusTitle = hasError
    ? m.wizard.imageReviewFailedTitle
    : isStoryboardReview
      ? m.wizard.imageReviewStoryboardReadyTitle
      : m.wizard.imageReviewCompleteTitle;
  const statusBody = hasError ? m.wizard.imageReviewFailedBody : completeBody;
  const heroBefore = isStoryboardReview
    ? m.wizard.imageReviewStoryboardHeroBefore
    : m.wizard.imageReviewHeroBefore;
  const heroAccent = isStoryboardReview
    ? m.wizard.imageReviewStoryboardHeroAccent
    : m.wizard.imageReviewHeroAccent;
  const heroHint = isStoryboardReview
    ? m.wizard.imageReviewStoryboardHeroHint
    : m.wizard.imageReviewHeroHint;

  const selectable = view.kind === "ab" || view.kind === "carousel";
  const canRegenerate = wizard.canGenerateImage() && !wizard.imageBusy;

  function selectItem(index: number, url: string) {
    if (!selectable) return;
    wizard.setSelectedVariantIndex(index);
    wizard.setImageUrl(url);
    wizard.setImageGenKey((k: number) => k + 1);
  }

  async function handleDownload(item: ReviewItem) {
    setDownloadError(null);
    setActionNote(null);
    setDownloadBusyIndex(item.index);
    try {
      const filename =
        items.length === 1 ? "marketing-image.png" : `slide-${item.index + 1}.png`;
      await downloadMediaUrl(item.url, filename);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : m.imageCanvas.downloadFailed);
    } finally {
      setDownloadBusyIndex(null);
    }
  }

  function handleEditCanvas(item: ReviewItem) {
    setActionNote(null);
    writeImageCanvasHandoff({
      imageUrl: item.url,
      label: item.label,
      returnTo: "/studio",
    });
    // Same-tab navigation — avoids duplicate windows (noopener makes window.open return null).
    router.push("/edit-image");
  }

  function handleRegenerateAll() {
    setActionNote(null);
    if (!wizard.canGenerateImage()) {
      setActionNote(
        wizard.imageGenerateDisabledReason || m.wizard.imageGenerateNotReady,
      );
      return;
    }
    void wizard.generateImage();
  }

  function handleRegenerateOne(item: ReviewItem) {
    setActionNote(null);
    if (view.kind === "storyboard") {
      if (wizard.storyboardSceneRegenerateBusy !== null) return;
      void wizard.regenerateStoryboardSceneWithAi(item.index);
      return;
    }
    if (!wizard.canGenerateImage()) {
      setActionNote(
        wizard.imageGenerateDisabledReason || m.wizard.imageGenerateNotReady,
      );
      return;
    }
    // Multi-slide carousel/campaign: per-card regenerates that slide only.
    if (wizard.campaignSlides.length > 1 && typeof wizard.regenerateCarouselSlide === "function") {
      void wizard.regenerateCarouselSlide(item.index);
      return;
    }
    // A/B: regenerate only the clicked variant.
    if (
      wizard.imageVariantUrls.length > 1 &&
      typeof wizard.regenerateAbVariant === "function"
    ) {
      void wizard.regenerateAbVariant(item.index);
      return;
    }
    void wizard.generateImage();
  }

  async function handleDownloadAll() {
    setDownloadError(null);
    setActionNote(null);
    setDownloadAllBusy(true);
    try {
      const slides = wizard.listExportableSlides();
      if (slides.length === 0) {
        // Fallback to current gallery items (preview page)
        await downloadMediaUrls(
          items.map((item) => ({
            url: item.url,
            filename: items.length === 1 ? "marketing-image.png" : `slide-${item.index + 1}.png`,
          })),
        );
        return;
      }
      await downloadMediaUrls(
        slides.map((s) => ({
          url: s.url,
          filename: slides.length === 1 ? "marketing-image.png" : `slide-${s.index + 1}.png`,
        })),
      );
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : m.imageCanvas.downloadFailed);
    } finally {
      setDownloadAllBusy(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <style dangerouslySetInnerHTML={{ __html: IMAGE_REVIEW_LAYOUT_CSS }} />
      <ImageReviewStepper
        workflowMode={wizard.workflowMode}
        kind={isStoryboardReview ? "storyboard" : "image"}
      />

      {/* Mobile: stack. Tablet: full-width cards under title. Laptop+: title | cards row. */}
      <div className="image-review-header">
        <div className="min-w-0 shrink-0">
          <div className="mb-2 text-violet-600">
            <IconSparkles className="h-6 w-6" />
          </div>
          <h2 className="text-balance text-[1.375rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {heroBefore}{" "}
            <span className="text-violet-600">{heroAccent}</span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {heroHint}
          </p>
        </div>

        <div className="image-review-header-cards">
          <div className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span
              className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${
                hasError
                  ? "bg-red-500"
                  : isStoryboardReview
                    ? "bg-violet-600"
                    : "bg-emerald-500"
              }`}
              style={{ width: 36, height: 36, minWidth: 36 }}
            >
              {hasError ? "!" : isStoryboardReview ? "→" : "✓"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {statusTitle}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{statusBody}</p>
            </div>
          </div>

          <div className="image-review-meta grid min-w-0 flex-[1.15] grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <MetaCell
              label={
                isStoryboardReview
                  ? m.wizard.imageReviewPathLabel
                  : m.wizard.imageReviewMetaOutput
              }
              value={
                isStoryboardReview
                  ? m.wizard.imageReviewPathImagesVideo
                  : (modeCopy?.title ?? "—")
              }
              icon={
                <OutputModeIcon
                  mode={wizard.effectiveImageOutputMode}
                  className="h-4 w-4 shrink-0 text-violet-600"
                />
              }
            />
            <MetaCell
              label={
                isStoryboardReview
                  ? m.wizard.imageReviewVisualSetLabel
                  : m.wizard.imageReviewMetaAspect
              }
              value={
                isStoryboardReview
                  ? m.wizard.imageReviewVisualSetStoryboard
                  : aspect
              }
              icon={<IconAspectPhone className="h-4 w-4 shrink-0 text-violet-600" />}
            />
            <MetaCell
              label={m.wizard.imageReviewMetaCount}
              value={String(items.length)}
              icon={<IconCardsStack className="h-4 w-4 shrink-0 text-violet-600" />}
            />
          </div>
        </div>
      </div>

      {/* Generated content grid */}
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {m.wizard.imageReviewGeneratedHeading.replace("{n}", String(items.length))}
            </h3>
            {modeCopy ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {m.wizard.imageReviewGeneratedSub
                  .replace("{mode}", modeCopy.title)
                  .replace("{product}", wizard.product.trim() || wizard.headline.trim() || "—")}
              </p>
            ) : null}
          </div>
          {view.kind === "carousel" ? (
            <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700">
              <IconEye className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{m.wizard.imageReviewPreviewCarousel}</span>
            </span>
          ) : modeCopy ? (
            <span className="inline-flex w-fit max-w-full items-center rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700">
              <span className="truncate">{modeCopy.title}</span>
            </span>
          ) : null}
        </div>

        <div className={gridClass(items.length)}>
          {items.map((item) => {
            const selected = selectable && wizard.selectedVariantIndex === item.index;
            return (
              <div
                key={`${item.url}-${item.index}`}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                  selected ? "border-violet-400 ring-2 ring-violet-400/25" : "border-slate-200"
                }`}
              >
                <ReviewImageFrame
                  item={item}
                  selected={selected}
                  selectable={selectable}
                  reviewable={false}
                  reviewed={wizard.storyboardCellsViewed.includes(item.index)}
                  reviewHint={m.wizard.storyboardTapToReview}
                  reviewedHint={m.wizard.storyboardCellReviewed}
                  imageGenKey={wizard.imageGenKey}
                  onSelect={() => {
                    selectItem(item.index, item.url);
                  }}
                />

                {item.job || item.sublabel || item.beat ? (
                  <div className="space-y-1 border-t border-slate-100 px-2.5 py-2.5 sm:px-3">
                    {item.job ? (
                      <p className="text-[11px] font-medium leading-snug text-violet-800">
                        {item.job}
                      </p>
                    ) : null}
                    {item.sublabel ? (
                      <p className="text-[12px] font-medium leading-snug text-slate-800 sm:text-[13px]">
                        {item.sublabel}
                      </p>
                    ) : null}
                    {item.beat ? (
                      <p className="text-[11px] leading-snug text-slate-500 line-clamp-3">
                        {item.beat}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-auto border-t border-slate-100 p-2.5 sm:p-3">
                  <div className="grid grid-cols-1 gap-1.5">
                    <CompactAction
                      className="!border-violet-600 !bg-violet-600 !text-white hover:!bg-violet-700 hover:!border-violet-700"
                      icon={<IconEdit className="h-3.5 w-3.5 shrink-0" />}
                      label={m.wizard.imageReviewEditCanvasBtn}
                      onClick={() => handleEditCanvas(item)}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <CompactAction
                        icon={<IconDownload className="h-3.5 w-3.5 shrink-0" />}
                        label={
                          downloadBusyIndex === item.index
                            ? m.imageCanvas.downloading
                            : m.wizard.downloadSlide
                        }
                        busy={downloadBusyIndex === item.index}
                        onClick={() => void handleDownload(item)}
                      />
                      <CompactAction
                        icon={<IconRefresh className="h-3.5 w-3.5 shrink-0" />}
                        label={
                          view.kind === "storyboard" &&
                          wizard.storyboardSceneRegenerateBusy === item.index
                            ? m.wizard.storyboardRegeneratingImage
                            : m.wizard.imageReviewRegenerateOneBtn
                        }
                        disabled={
                          view.kind === "storyboard"
                            ? wizard.storyboardSceneRegenerateBusy !== null
                            : !canRegenerate
                        }
                        onClick={() => handleRegenerateOne(item)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isStoryboardReview && items.length > 0 ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-300 bg-violet-50/80 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-violet-400 text-violet-600"
            checked={wizard.storyboardGridApproved}
            onChange={(e) => wizard.setStoryboardGridApproved(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-violet-950">
              {m.wizard.storyboardApproveCheckbox}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-violet-800/80">
              {m.wizard.storyboardApproveHint}
            </span>
          </span>
        </label>
      ) : null}

      {downloadError ? (
        <p className="text-center text-xs text-amber-700">{downloadError}</p>
      ) : null}
      {actionNote ? (
        <p className="text-center text-xs text-amber-700">{actionNote}</p>
      ) : null}

      {view.kind !== "storyboard" && view.kind !== "cinematic" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-[#F5F3FF] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
              <IconRefresh className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {m.wizard.imageReviewRegenerateBannerTitle}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {m.wizard.imageReviewRegenerateBannerBody}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!canRegenerate}
            onClick={handleRegenerateAll}
            className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-500 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            <IconRefresh className="h-4 w-4" />
            {m.wizard.imageReviewRegenerateBannerBtn}
          </button>
        </div>
      ) : null}

      {showStandaloneFooter ? (
        <ImageReviewFooterBar
          onBack={onBack ?? (() => router.push("/studio"))}
          onDownloadAll={() => void handleDownloadAll()}
          onGenerateOneMore={isStoryboardReview ? undefined : handleRegenerateAll}
          downloadAllBusy={downloadAllBusy}
          generateBusy={!canRegenerate}
        />
      ) : null}
    </div>
  );
}

export function ImageReviewFooterBar({
  onBack,
  onDownloadAll,
  onGenerateOneMore,
  onContinue,
  downloadAllBusy,
  generateBusy,
  continueDisabled,
  continueDisabledReason,
  backLabel,
  continueLabel,
}: {
  onBack: () => void;
  onDownloadAll: () => void;
  /** Omit on storyboard — per-cell regen only; regen-all fights the approve gate. */
  onGenerateOneMore?: () => void;
  /** Combined 圖+片: continue from scene review to video setup. */
  onContinue?: () => void;
  downloadAllBusy?: boolean;
  generateBusy?: boolean;
  continueDisabled?: boolean;
  continueDisabledReason?: string | null;
  backLabel?: string;
  continueLabel?: string;
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
          {backLabel ?? m.wizard.back}
        </button>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            disabled={downloadAllBusy}
            onClick={onDownloadAll}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40 sm:w-auto"
          >
            <IconDownload className="h-4 w-4" />
            {downloadAllBusy ? m.imageCanvas.downloading : m.wizard.downloadAllSlides}
          </button>
          {onGenerateOneMore ? (
            <button
              type="button"
              disabled={generateBusy}
              onClick={onGenerateOneMore}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-600 bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:border-violet-700 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <IconRefresh className="h-4 w-4" />
              {m.wizard.imageReviewGenerateOneMore}
            </button>
          ) : null}
          {onContinue ? (
            <button
              type="button"
              disabled={continueDisabled}
              title={continueDisabled ? continueDisabledReason ?? undefined : undefined}
              onClick={onContinue}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-600 bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:border-violet-700 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {continueLabel ?? m.wizard.continueToVideo}
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
                <path d="M7.5 4.5 13 10l-5.5 5.5" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
        <IconShield className="h-4 w-4 shrink-0 text-slate-400" />
        <span>{m.start.secureNote}</span>
      </p>
    </div>
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
        <p className="image-review-meta-value truncate text-[11px] font-bold text-slate-900 sm:text-sm">
          {value}
        </p>
      </div>
    </div>
  );
}

function OutputModeIcon({
  mode,
  className,
}: {
  mode: "single" | "ab" | "campaign" | "teaching-carousel";
  className?: string;
}) {
  if (mode === "ab") return <IconModeAb className={className} />;
  if (mode === "campaign") return <IconModeCarousel className={className} />;
  if (mode === "teaching-carousel") return <IconModeEducational className={className} />;
  return <IconModeSingle className={className} />;
}

function IconModeSingle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4.5" y="3" width="11" height="14" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

function IconModeAb({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="4" width="7" height="12" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="4" width="7" height="12" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.8 8.2h2.4M6 8.2v4.2M12.4 12.4h3.2M12.4 8.2h2.2c.7 0 1.2.5 1.2 1.15S15.3 10.5 14.6 10.5H12.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconModeCarousel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="5" y="3.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 6.5v7M16.5 6.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.2" cy="14.2" r="0.7" fill="currentColor" />
      <circle cx="10" cy="14.2" r="0.7" fill="currentColor" />
      <circle cx="11.8" cy="14.2" r="0.7" fill="currentColor" />
    </svg>
  );
}

function IconModeEducational({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="4" width="7" height="12" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="4" width="7" height="12" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="10" r="1.35" fill="currentColor" />
      <circle cx="14" cy="10" r="1.35" fill="currentColor" />
    </svg>
  );
}

function IconAspectPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="6" y="2.5" width="8" height="15" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 15.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCardsStack({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 13.5 10 16.2 16 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 10.2 10 12.9 16 10.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 7 10 4 16 7 10 10 4 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function collectReviewItems(
  wizard: ReturnType<typeof useWizard>,
  kind: GeneratedImageResultViewKind,
  m: ReturnType<typeof useLocale>["m"],
): ReviewItem[] {
  if (kind === "storyboard") {
    return wizard.storyboardScenes.map((scene, i) => {
      const copy = storyboardSceneDisplayCopy(scene);
      const roleLabel = localizeTvcShotRole(scene.role, m.wizard.tvcShotRoles);
      const beat =
        copy.caption && copy.beat
          ? localizeTvcShotRole(copy.beat, m.wizard.tvcShotRoles) || copy.beat
          : undefined;
      return {
        index: i,
        url: scene.imageUrl,
        label: `${m.wizard.storyboardSceneLabel} ${scene.imageIndex}${
          roleLabel ? ` · ${roleLabel}` : ""
        }`,
        job: tvcShotJobLine(scene.role, m.wizard.tvcShotJobs),
        sublabel: copy.caption || beat || roleLabel || undefined,
        beat,
      };
    });
  }
  if (kind === "cinematic") {
    return wizard.cinematicScenes.map((scene, i) => {
      const copy = storyboardSceneDisplayCopy(scene);
      return {
        index: i,
        url: scene.imageUrl,
        label: `${m.wizard.storyboardSceneLabel} ${scene.sceneIndex}`,
        sublabel: copy.caption || copy.beat || undefined,
        beat: copy.caption && copy.beat ? copy.beat : undefined,
      };
    });
  }
  if (kind === "carousel") {
    return wizard.campaignSlides.map((slide, i) => ({
      index: i,
      url: slide.imageUrl,
      label: wizard.campaignSlideLabel(slide.role, slide.title),
      sublabel: slide.headline || undefined,
    }));
  }
  if (kind === "ab") {
    return wizard.imageVariantUrls.map((url, i) => ({
      index: i,
      url,
      label: i === 0 ? m.wizard.variantA : m.wizard.variantB,
    }));
  }
  if (kind === "single" && wizard.imageUrl) {
    return [
      {
        index: 0,
        url: wizard.imageUrl,
        label: m.wizard.aiImageResultLabel,
      },
    ];
  }
  return [];
}
