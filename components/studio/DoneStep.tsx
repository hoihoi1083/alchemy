"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/components/studio/WizardContext";
import { QuickFixImagePanel } from "@/components/studio/QuickFixImagePanel";
import {
  GenerationWaitPlaceholder,
  waitAspectFromString,
} from "@/components/studio/GenerationWaitPlaceholder";
import { writeCaptionHandoff } from "@/lib/caption-studio-draft";
import { writeImageCanvasHandoff } from "@/lib/image-canvas-handoff";
import { writeStudioDoneResume } from "@/lib/studio-done-resume";
import { downloadMediaUrl, downloadMediaUrls } from "@/lib/download-media";
import { isFalCdnUrl } from "@/lib/pipeline/safe-url";
import { readStoredPromotionMode } from "@/lib/promotion-mode";

function safeFilenamePart(input: string): string {
  return input
    .trim()
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "slide";
}

function openEditImageForSlide(opts: {
  imageUrl: string;
  label?: string;
  slides: Array<{ index: number; label: string; url: string }>;
  finalImageSrc: string | null;
  headline: string;
  product: string;
  imageGenKey: number;
  workflowMode: "image-only" | "combined" | "video-only";
  routerPush: (href: string) => void;
}) {
  const promotionMode = readStoredPromotionMode() ?? "physical";
  writeStudioDoneResume({
    promotionMode,
    workflowMode: opts.workflowMode,
    slides: opts.slides,
    finalImageSrc: opts.finalImageSrc,
    headline: opts.headline,
    product: opts.product,
    imageGenKey: opts.imageGenKey,
  });
  writeImageCanvasHandoff({
    imageUrl: opts.imageUrl,
    label: opts.label,
    returnTo: "/studio?resumeDone=1",
  });
  // Same-tab only. Do NOT window.open with "noopener" — modern browsers return
  // null from open(..., "noopener"), which incorrectly also triggered router.push
  // and opened edit-image twice.
  opts.routerPush("/edit-image");
}

export function DoneStep() {
  const router = useRouter();
  const {
    bgmNote,
    canGenerateImage,
    captionHandoffVideoUrl,
    captionLines,
    videoTimingManifest,
    finalImageSrc,
    generateImage,
    headline,
    imageAspectRatio,
    imageBusy,
    imageGenerateDisabledReason,
    imageGenKey,
    imageProgressInfo,
    imageRefPreviewUrl,
    listExportableSlides,
    m,
    product,
    quickFixCredits,
    quickFixVideo,
    resetProject,
    setStepKey,
    uploadPreviewUrl,
    videoNote,
    videoUrl,
    workflowMode,
  } = useWizard();
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const slides = listExportableSlides();

  if (workflowMode === "image-only" && finalImageSrc) {
    return (
      <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-900/40 backdrop-blur">
        <div className="h-1 w-full rounded-full bg-linear-to-r from-violet-400 via-violet-500 to-violet-600" />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {m.wizard.imageDoneTitle}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{m.wizard.imageDoneHint}</p>
          {slides.length > 1 ? (
            <p className="mt-2 text-xs text-cyan-200/90">{m.imageCanvas.editAnotherHint}</p>
          ) : null}
        </div>

        {imageBusy ? (
          <GenerationWaitPlaceholder
            message={imageProgressInfo?.label ?? m.wizard.imageGenerating}
            hint={m.wizard.generationWaitHint}
            progress={imageProgressInfo}
            aspectRatio={waitAspectFromString(imageAspectRatio)}
            previewUrl={imageRefPreviewUrl || uploadPreviewUrl || finalImageSrc || null}
          />
        ) : null}

        {!imageBusy && slides.length > 1 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-emerald-200">{m.wizard.doneAllSlidesTitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {slides.map((slide) => (
                <div
                  key={`${slide.url}-${slide.index}`}
                  className="rounded-xl border border-slate-700 bg-slate-900/50 p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${slide.url}${slide.url.includes("?") ? "&" : "?"}v=${imageGenKey}-${slide.index}`}
                    alt=""
                    className="w-full rounded-lg border border-slate-800 object-contain"
                  />
                  <p className="mt-2 text-xs font-medium text-slate-200">{slide.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={downloadBusy}
                      onClick={async () => {
                        setDownloadError(null);
                        setDownloadBusy(true);
                        try {
                          await downloadMediaUrl(
                            slide.url,
                            `slide-${slide.index + 1}-${safeFilenamePart(slide.label)}.png`,
                          );
                        } catch (e: unknown) {
                          setDownloadError(
                            e instanceof Error ? e.message : m.imageCanvas.downloadFailed,
                          );
                        } finally {
                          setDownloadBusy(false);
                        }
                      }}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {downloadBusy ? m.imageCanvas.downloading : m.wizard.downloadSlide}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openEditImageForSlide({
                          imageUrl: slide.url,
                          label: slide.label,
                          slides,
                          finalImageSrc,
                          headline: headline ?? "",
                          product: product ?? "",
                          imageGenKey,
                          workflowMode,
                          routerPush: (href) => router.push(href),
                        })
                      }
                      className="rounded-lg border border-cyan-600 px-3 py-1.5 text-xs text-cyan-100"
                    >
                      {m.imageCanvas.openFromDone}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={downloadBusy}
              onClick={async () => {
                setDownloadError(null);
                setDownloadBusy(true);
                try {
                  await downloadMediaUrls(
                    slides.map((slide) => ({
                      url: slide.url,
                      filename: `slide-${slide.index + 1}-${safeFilenamePart(slide.label)}.png`,
                    })),
                  );
                } catch (e: unknown) {
                  setDownloadError(
                    e instanceof Error ? e.message : m.imageCanvas.downloadFailed,
                  );
                } finally {
                  setDownloadBusy(false);
                }
              }}
              className="w-full rounded-xl border border-violet-500/60 px-4 py-2.5 text-sm font-medium text-violet-100 disabled:opacity-50"
            >
              {downloadBusy ? m.imageCanvas.downloading : m.wizard.downloadAllSlides}
            </button>
          </div>
        ) : null}

        {!imageBusy && slides.length <= 1 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${finalImageSrc}${finalImageSrc.includes("?") ? "&" : "?"}v=${imageGenKey}`}
              alt=""
              className="w-full rounded-2xl border border-slate-800 object-contain"
            />
            <button
              type="button"
              disabled={downloadBusy}
              onClick={async () => {
                setDownloadError(null);
                setDownloadBusy(true);
                try {
                  await downloadMediaUrl(finalImageSrc, "marketing-image.png");
                } catch (e: unknown) {
                  setDownloadError(e instanceof Error ? e.message : m.imageCanvas.downloadFailed);
                } finally {
                  setDownloadBusy(false);
                }
              }}
              className="block w-full rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white disabled:opacity-50"
            >
              {downloadBusy ? m.imageCanvas.downloading : m.wizard.downloadImage}
            </button>
            <button
              type="button"
              onClick={() =>
                openEditImageForSlide({
                  imageUrl: finalImageSrc,
                  label: headline?.trim() || product?.trim() || undefined,
                  slides,
                  finalImageSrc,
                  headline: headline ?? "",
                  product: product ?? "",
                  imageGenKey,
                  workflowMode,
                  routerPush: (href) => router.push(href),
                })
              }
              className="w-full rounded-xl border border-cyan-500/60 bg-cyan-950/40 py-3 text-center text-sm font-medium text-cyan-100"
            >
              {m.imageCanvas.openFromDone}
            </button>
            <p className="text-center text-xs text-slate-500">{m.imageCanvas.doneHint}</p>
          </>
        ) : null}

        {!imageBusy ? (
          <div className="space-y-2">
            {imageGenerateDisabledReason && !canGenerateImage() ? (
              <p className="text-xs text-amber-200/90">{imageGenerateDisabledReason}</p>
            ) : null}
            <button
              type="button"
              disabled={imageBusy || !canGenerateImage()}
              title={imageGenerateDisabledReason ?? undefined}
              onClick={() => void generateImage()}
              className="w-full rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-50"
            >
              {m.wizard.regenerateImageBtn}
            </button>
          </div>
        ) : null}

        {!imageBusy ? <QuickFixImagePanel variant="dark" /> : null}
        {downloadError && (
          <p className="rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-200">{downloadError}</p>
        )}
        <button
          type="button"
          onClick={resetProject}
          className="w-full rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400"
        >
          {m.wizard.newProject}
        </button>
      </section>
    );
  }

  if (workflowMode !== "image-only" && videoUrl) {
    return (
      <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-900/40 backdrop-blur">
        <div className="h-1 w-full rounded-full bg-linear-to-r from-violet-400 via-violet-500 to-violet-600" />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {m.wizard.step4Title}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{m.wizard.step4Hint}</p>
        </div>
        {bgmNote && (
          <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">{bgmNote}</p>
        )}
        {videoNote && (
          <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-200">{videoNote}</p>
        )}
        {videoUrl && isFalCdnUrl(videoUrl) && (
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-xs text-red-200">
            {m.errors.postProcessIncomplete}
          </p>
        )}
        <video
          src={videoUrl}
          controls
          playsInline
          className="w-full rounded-2xl border border-slate-800 bg-black"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={downloadBusy}
            onClick={async () => {
              if (!videoUrl) return;
              setDownloadError(null);
              setDownloadBusy(true);
              try {
                await downloadMediaUrl(videoUrl, "marketing-reel.mp4");
              } catch (e: unknown) {
                setDownloadError(e instanceof Error ? e.message : m.errors.videoFailed);
              } finally {
                setDownloadBusy(false);
              }
            }}
            className="rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloadBusy ? m.wizard.phaseVideo : m.wizard.download}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!videoUrl) return;
              writeCaptionHandoff({
                videoUrl: captionHandoffVideoUrl ?? videoUrl,
                captionLines,
                label: headline?.trim() || product?.trim() || undefined,
                timingManifest: videoTimingManifest ?? undefined,
              });
              router.push("/captions");
            }}
            className="rounded-xl border border-violet-500/60 bg-violet-950/40 py-3 text-center text-sm font-medium text-violet-100"
          >
            {m.captions.openFromDone}
          </button>
        </div>
        <p className="text-center text-xs text-slate-500">{m.captions.doneHint}</p>
        {downloadError && (
          <p className="text-center text-xs text-red-300">{downloadError}</p>
        )}
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-sm font-semibold text-white">{m.wizard.quickFixTitle}</p>
          <p className="mt-1 text-xs text-slate-400">{m.wizard.quickFixVideoHint}</p>
          <p className="mt-1 text-xs text-slate-500">
            {quickFixCredits > 0
              ? m.wizard.quickFixVideoTipReady
              : m.wizard.quickFixVideoTipUsed}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              disabled={quickFixCredits <= 0}
              onClick={() =>
                quickFixVideo("More realistic motion. Locked camera. No morphing.", {
                  creativity: "subtle",
                })
              }
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
            >
              {m.wizard.quickFixLessMotion}
            </button>
            <button
              type="button"
              disabled={quickFixCredits <= 0}
              onClick={() =>
                quickFixVideo("No faces. Keep product and scene. Hands-only if needed.")
              }
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
            >
              {m.wizard.quickFixNoFace}
            </button>
            <button
              type="button"
              disabled={quickFixCredits <= 0}
              onClick={() =>
                quickFixVideo("Keep same story and shots. Correct only minor artifacts.")
              }
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
            >
              {m.wizard.quickFixMinor}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={resetProject}
          className="w-full rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400"
        >
          {m.wizard.newProject}
        </button>
      </section>
    );
  }

  if (workflowMode !== "image-only" && !videoUrl) {
    return (
      <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-900/40 backdrop-blur">
        <div className="h-1 w-full rounded-full bg-linear-to-r from-amber-400 via-orange-400 to-rose-400" />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {m.wizard.videoDoneEmptyTitle}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
            {m.wizard.videoDoneEmptyHint}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStepKey("video")}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white"
        >
          {m.wizard.videoDoneEmptyBack}
        </button>
        <button
          type="button"
          onClick={resetProject}
          className="w-full rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400"
        >
          {m.wizard.newProject}
        </button>
      </section>
    );
  }

  return null;
}
