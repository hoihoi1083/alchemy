"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/components/studio/WizardContext";
import { QuickFixImagePanel } from "@/components/studio/QuickFixImagePanel";
import { writeCaptionHandoff } from "@/lib/caption-studio-draft";
import { isFalCdnUrl } from "@/lib/pipeline/safe-url";

async function downloadVideoBlob(url: string, filename: string) {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export function DoneStep() {
  const router = useRouter();
  const {
    bgmNote,
    captionLines,
    downloadEditPack,
    finalImageSrc,
    headline,
    imageGenKey,
    m,
    product,
    quickFixCredits,
    quickFixVideo,
    resetProject,
    videoNote,
    videoUrl,
    workflowMode,
  } = useWizard();
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (workflowMode === "image-only" && finalImageSrc) {
    return (
      <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-900/40 backdrop-blur">
        <div className="h-1 w-full rounded-full bg-linear-to-r from-emerald-400 via-cyan-400 to-violet-400" />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {m.wizard.imageDoneTitle}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{m.wizard.imageDoneHint}</p>
        </div>
        <img
          src={`${finalImageSrc}${finalImageSrc.includes("?") ? "&" : "?"}v=${imageGenKey}`}
          alt=""
          className="w-full rounded-2xl border border-slate-800 object-contain"
        />
        <a
          href={finalImageSrc}
          download="marketing-image.png"
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white"
        >
          {m.wizard.downloadImage}
        </a>
        <button
          type="button"
          onClick={() => void downloadEditPack("image")}
          className="w-full rounded-xl border border-cyan-300 bg-cyan-50 py-2.5 text-sm font-medium text-cyan-700"
        >
          {m.wizard.downloadEditPack}
        </button>
        <QuickFixImagePanel variant="dark" />
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
        <div className="h-1 w-full rounded-full bg-linear-to-r from-emerald-400 via-cyan-400 to-violet-400" />
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
                await downloadVideoBlob(videoUrl, "marketing-reel.mp4");
              } catch (e: unknown) {
                setDownloadError(e instanceof Error ? e.message : m.errors.videoFailed);
              } finally {
                setDownloadBusy(false);
              }
            }}
            className="rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloadBusy ? m.wizard.phaseVideo : m.wizard.download}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!videoUrl) return;
              writeCaptionHandoff({
                videoUrl,
                captionLines,
                label: headline?.trim() || product?.trim() || undefined,
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
        <button
          type="button"
          onClick={() => void downloadEditPack("video")}
          className="w-full rounded-xl border border-cyan-300 bg-cyan-50 py-2.5 text-sm font-medium text-cyan-700"
        >
          {m.wizard.downloadEditPack}
        </button>
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-sm font-semibold text-white">{m.wizard.quickFixTitle}</p>
          <p className="mt-1 text-xs text-slate-400">{m.wizard.quickFixVideoHint}</p>
          <p className="mt-1 text-xs text-slate-500">
            {quickFixCredits > 0
              ? m.wizard.quickFixCreditReady.replace("{count}", String(quickFixCredits))
              : m.wizard.quickFixCreditUsed}
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

  return null;
}
