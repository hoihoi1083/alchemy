"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CaptionLineEditor } from "@/components/captions/CaptionLineEditor";
import { CaptionTimelineL2 } from "@/components/captions/CaptionTimelineL2";
import { LibraryAssetPicker } from "@/components/LibraryAssetPicker";
import { ToolPhaseStrip } from "@/components/studio/ToolPhaseStrip";
import { useLocale } from "@/components/LocaleProvider";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  CAPTION_STYLE_PRESETS,
  CAPTION_STYLE_PRESET_IDS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import {
  clearCaptionHandoff,
  readCaptionHandoff,
} from "@/lib/caption-studio-draft";
import { toRelativePipelineUrl, withCacheBust } from "@/lib/caption-studio-url";
import { DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
import { rebaseCaptionLinesAfterTrim } from "@/lib/video-timing-manifest";
import { isSafeForServerUpload } from "@/lib/upload-limits";

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 160) || "Request failed." };
  }
}

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

async function uploadVideoFileToLibrary(file: File, failMsg: string): Promise<string> {
  const presignRes = await fetch("/api/library/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: "video",
      contentType: file.type || "video/mp4",
      name: file.name || "caption-studio-2-upload",
      sizeBytes: file.size,
    }),
  });
  const presign = await readApiJson(presignRes);
  if (
    !presignRes.ok ||
    typeof presign.uploadUrl !== "string" ||
    typeof presign.downloadUrl !== "string"
  ) {
    throw new Error(
      typeof presign.error === "string" ? presign.error : failMsg,
    );
  }
  try {
    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "video/mp4" },
      body: file,
    });
    if (putRes.ok) return presign.downloadUrl as string;
  } catch {
    /* fall through */
  }
  if (!isSafeForServerUpload(file.size)) {
    throw new Error(failMsg);
  }
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", "video");
  const proxyRes = await fetch("/api/library/upload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const proxy = await readApiJson(proxyRes);
  if (!proxyRes.ok || typeof proxy.downloadUrl !== "string") {
    throw new Error(typeof proxy.error === "string" ? proxy.error : failMsg);
  }
  return proxy.downloadUrl;
}

const TIP_DISMISS_KEY = "ams-captions2-tip-dismissed";

type Phase = "captions" | "finish";

export function CaptionStudio2Client() {
  const { m, locale } = useLocale();
  const t = m.captions;
  const t2 = m.captions2;
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("captions");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  /** Clean plate before BGM — used for ASR + show-original. */
  const [originalSourceUrl, setOriginalSourceUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>([]);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [videoDuration, setVideoDuration] = useState(8);
  const [videoTrimIn, setVideoTrimIn] = useState(0);
  const [videoTrimOut, setVideoTrimOut] = useState(8);
  const [defaultStylePreset, setDefaultStylePreset] =
    useState<CaptionStylePresetId>("classic");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribeBusy, setTranscribeBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [bgmTrack, setBgmTrack] = useState<BgmTrackId>(DEFAULT_BGM_TRACK);
  const [audioBusy, setAudioBusy] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const handoffDone = useRef(false);
  const blobPreviewRef = useRef<string | null>(null);

  const displayVideoSrc = showOriginal
    ? originalSourceUrl ?? localPreviewUrl ?? sourceUrl
    : playbackUrl ?? localPreviewUrl ?? sourceUrl;
  const hasWorkspace = Boolean(sourceUrl || localPreviewUrl);
  const asrSourceUrl = originalSourceUrl ?? sourceUrl;

  const styleOptions = useMemo(
    () =>
      CAPTION_STYLE_PRESET_IDS.map((id) => ({
        id,
        label:
          locale === "en"
            ? CAPTION_STYLE_PRESETS[id].labelEn
            : CAPTION_STYLE_PRESETS[id].labelZh,
      })),
    [locale],
  );

  useEffect(() => {
    try {
      setTipOpen(sessionStorage.getItem(TIP_DISMISS_KEY) !== "1");
    } catch {
      setTipOpen(true);
    }
  }, []);

  const applySource = useCallback((url: string, label: string, blobPreview?: string) => {
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
      blobPreviewRef.current = null;
    }
    if (blobPreview) blobPreviewRef.current = blobPreview;
    setSourceUrl(url);
    setOriginalSourceUrl(url);
    setSourceLabel(label);
    setLocalPreviewUrl(blobPreview ?? null);
    setPlaybackUrl(null);
    setProcessedVideoUrl(null);
    setShowOriginal(false);
    setCaptionLines([]);
    setSelectedCaptionIndex(0);
    setNote(null);
    setWarn(null);
    setError(null);
    setPhase("captions");
  }, []);

  useEffect(() => {
    return () => {
      if (blobPreviewRef.current) URL.revokeObjectURL(blobPreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (handoffDone.current) return;
    const q = searchParams.get("video")?.trim();
    if (q) {
      handoffDone.current = true;
      applySource(q, t2.fromLink);
      return;
    }
    const handoff = readCaptionHandoff();
    if (handoff?.videoUrl) {
      handoffDone.current = true;
      clearCaptionHandoff();
      applySource(handoff.videoUrl, t.sourceFromStudio);
    }
  }, [applySource, searchParams, t.sourceFromStudio, t2.fromLink]);

  function clearWorkspace() {
    setPhase("captions");
    setSourceUrl(null);
    setOriginalSourceUrl(null);
    setLocalPreviewUrl(null);
    setPlaybackUrl(null);
    setProcessedVideoUrl(null);
    setCaptionLines([]);
    setShowOriginal(false);
    setNote(null);
    setWarn(null);
    setError(null);
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
      blobPreviewRef.current = null;
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = URL.createObjectURL(file);
      const url = await uploadVideoFileToLibrary(file, t.uploadNeedCorsOrLibrary);
      applySource(url, file.name || t2.uploadedVideo, blob);
      setNote(t2.readyAuto);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function runAutoTranscribe() {
    if (!asrSourceUrl) {
      setError(t2.needVideo);
      return;
    }
    setTranscribeBusy(true);
    setError(null);
    setNote(null);
    setWarn(null);
    try {
      const fd = new FormData();
      fd.set("video_url", asrSourceUrl);
      const res = await fetch("/api/transcribe-captions", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t2.transcribeFailed,
        );
      }
      const lines = Array.isArray(data.lines) ? (data.lines as CaptionLine[]) : [];
      if (lines.length === 0 || data.emptySpeech) {
        setCaptionLines([]);
        setWarn(t2.noSpeech);
        return;
      }
      setCaptionLines(lines);
      setSelectedCaptionIndex(0);
      const asr =
        data.asrProvider === "local" ? t2.asrLocal : t2.asrCloud;
      const tok =
        typeof data.tokensCharged === "number" && data.tokensCharged > 0
          ? t2.chargedTok(data.tokensCharged)
          : "";
      const splitNote = data.evenSplit ? ` · ${t2.evenSplitNote}` : "";
      setNote(
        `${t2.transcribeDone(lines.length)} · ${asr}${tok ? ` · ${tok}` : ""}${splitNote}`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t2.transcribeFailed);
    } finally {
      setTranscribeBusy(false);
    }
  }

  async function applyBgm() {
    if (!sourceUrl) return;
    setAudioBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/add-bgm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          video_url: sourceUrl,
          track: bgmTrack,
          replace_source_audio: false,
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok || typeof data.videoUrl !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : t.burnFailed,
        );
      }
      const rel = toRelativePipelineUrl(data.videoUrl);
      setSourceUrl(rel);
      setPlaybackUrl(withCacheBust(rel));
      setShowOriginal(false);
      setNote(t.audioBgmDone);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setAudioBusy(false);
    }
  }

  async function burnCaptions() {
    const videoUrl = sourceUrl;
    if (!videoUrl) {
      setError(t.needVideo);
      return;
    }
    const usable = captionLines.filter((l) => l.text.trim());
    if (usable.length === 0) {
      setError(t.needCaptionText);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let burnUrl = videoUrl;
      let burnLines = usable;
      const needsTrim =
        videoTrimIn > 0.05 || videoTrimOut < videoDuration - 0.05;
      if (needsTrim) {
        const trimInSec = Math.max(0, videoTrimIn);
        const trimOutSec = Math.max(trimInSec + 0.2, videoTrimOut);
        const trimFd = new FormData();
        trimFd.set("video_url", videoUrl);
        trimFd.set("trim_in_sec", String(trimInSec));
        trimFd.set("trim_out_sec", String(trimOutSec));
        const trimRes = await fetch("/api/trim-video", {
          method: "POST",
          credentials: "include",
          body: trimFd,
        });
        const trimData = await readApiJson(trimRes);
        if (!trimRes.ok || typeof trimData.videoUrl !== "string") {
          throw new Error(
            typeof trimData.error === "string" ? trimData.error : t.trimFailed,
          );
        }
        burnUrl = toRelativePipelineUrl(trimData.videoUrl);
        burnLines = rebaseCaptionLinesAfterTrim(usable, trimInSec, trimOutSec);
      }

      const res = await fetch("/api/burn-script-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          video_url: burnUrl,
          caption_lines: burnLines,
          caption_style: {
            preset: defaultStylePreset,
          },
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok || typeof data.videoUrl !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : t.burnFailed,
        );
      }
      const out = toRelativePipelineUrl(data.videoUrl);
      setProcessedVideoUrl(out);
      setPlaybackUrl(withCacheBust(out));
      setShowOriginal(false);
      setNote(t.appliedNote);
      setPhase("finish");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setBusy(false);
    }
  }

  function updateLine(index: number, patch: Partial<CaptionLine>) {
    setCaptionLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function seekPreviewTo(sec: number) {
    const video = previewVideoRef.current;
    if (!video) return;
    const maxSec =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : videoDuration;
    video.currentTime = Math.min(Math.max(0, sec), Math.max(0, maxSec));
  }

  async function onDownload() {
    if (!processedVideoUrl) return;
    setDownloadBusy(true);
    setError(null);
    try {
      await downloadVideoBlob(processedVideoUrl, "captions-2.mp4");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.downloadFailed);
    } finally {
      setDownloadBusy(false);
    }
  }

  const usableLineCount = captionLines.filter((l) => l.text.trim()).length;

  return (
    <div className="space-y-4 pb-28 xl:pb-4">
      {tipOpen ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs leading-relaxed text-slate-400">{t2.diffBody}</p>
            <button
              type="button"
              className="shrink-0 text-[11px] text-slate-500 underline hover:text-slate-300"
              onClick={() => {
                setTipOpen(false);
                try {
                  sessionStorage.setItem(TIP_DISMISS_KEY, "1");
                } catch {
                  /* ignore */
                }
              }}
            >
              {t2.dismissTip}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {warn ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          <p>{warn}</p>
          {asrSourceUrl ? (
            <p className="mt-1 text-xs">
              <Link
                href={`/captions?video=${encodeURIComponent(asrSourceUrl)}`}
                className="underline hover:text-white"
              >
                {t2.openClassicPlan}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
      {note ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {note}
        </p>
      ) : null}

      {!hasWorkspace ? (
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h2 className="text-lg font-semibold text-white">{t.uploadTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{t2.importHint}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {busy ? "…" : t.chooseFile}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setLibraryOpen(true)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {t.chooseFromLibrary}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onPickFile(f);
              }}
            />
          </div>
        </section>
      ) : null}

      {hasWorkspace ? (
        <>
          <ToolPhaseStrip
            phases={[
              { id: "captions", label: t2.phaseCaptionsName },
              { id: "finish", label: t2.phaseFinishName },
            ]}
            currentId={phase}
            onSelect={(id) => setPhase(id as Phase)}
            howTo={
              phase === "captions" ? t2.phaseHowToCaptions : t2.phaseHowToFinish
            }
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {t.previewTitle}
                  </p>
                  <p className="text-sm text-slate-300">{sourceLabel || "Video"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {processedVideoUrl || originalSourceUrl ? (
                    <button
                      type="button"
                      className="text-xs text-slate-400 underline hover:text-slate-200"
                      onClick={() => setShowOriginal((v) => !v)}
                    >
                      {showOriginal ? t2.showProcessed : t.showOriginal}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs text-cyan-300 underline"
                    onClick={clearWorkspace}
                  >
                    {t.changeVideo}
                  </button>
                </div>
              </div>
              {displayVideoSrc ? (
                <video
                  key={`${displayVideoSrc}-${showOriginal ? "orig" : "play"}`}
                  ref={previewVideoRef}
                  src={displayVideoSrc}
                  controls
                  playsInline
                  className="aspect-[9/16] max-h-[min(70vh,640px)] w-full rounded-xl bg-black object-contain"
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0) {
                      setVideoDuration(d);
                      setVideoTrimIn(0);
                      setVideoTrimOut(d);
                    }
                  }}
                />
              ) : null}

              {phase === "captions" ? (
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-3">
                  <p className="text-sm font-semibold text-cyan-50">{t2.autoTitle}</p>
                  <p className="mt-1 text-xs text-cyan-100/75">{t2.autoHint}</p>
                  <button
                    type="button"
                    disabled={transcribeBusy || !asrSourceUrl}
                    onClick={() => void runAutoTranscribe()}
                    className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
                  >
                    {transcribeBusy ? t2.transcribing : t2.autoCta}
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-cyan-100/60">
                    {t2.tokenCostHint(TOKEN_COST.plan)}
                  </p>
                </div>
              ) : null}

              {phase === "finish" ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-sm font-medium text-white">{t2.finishHint}</p>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    {t.audioBgmLabel}
                    <select
                      value={bgmTrack}
                      onChange={(e) => setBgmTrack(e.target.value as BgmTrackId)}
                      className="rounded border border-white/15 bg-slate-950 px-2 py-1"
                    >
                      <option value="calm">{m.wizard.bgmCalm}</option>
                      <option value="upbeat">{m.wizard.bgmUpbeat}</option>
                      <option value="warm">{m.wizard.bgmWarm}</option>
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={audioBusy}
                      onClick={() => void applyBgm()}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      {audioBusy ? t.audioApplyingBgm : t.audioApplyBgm}
                    </button>
                    <button
                      type="button"
                      disabled={busy || usableLineCount === 0}
                      onClick={() => void burnCaptions()}
                      className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
                    >
                      {busy ? t.applying : t.applyBtn}
                    </button>
                    {processedVideoUrl ? (
                      <button
                        type="button"
                        disabled={downloadBusy}
                        onClick={() => void onDownload()}
                        className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-50"
                      >
                        {downloadBusy ? t.downloading : t.downloadBtn}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500">{t2.classicVoiceNote}</p>
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">{t.linesTitle}</h2>
                <label className="flex items-center gap-1 text-[11px] text-slate-400">
                  {t.styleLabel}
                  <select
                    value={defaultStylePreset}
                    onChange={(e) =>
                      setDefaultStylePreset(e.target.value as CaptionStylePresetId)
                    }
                    className="rounded border border-white/15 bg-slate-950 px-1 py-0.5 text-white"
                  >
                    {styleOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <CaptionTimelineL2
                durationSec={videoDuration}
                lines={captionLines}
                selectedIndex={selectedCaptionIndex}
                videoTrimIn={videoTrimIn}
                videoTrimOut={videoTrimOut}
                beatMarkers={[]}
                snapToBeats={false}
                showBeatControls={false}
                onSelect={(i) => {
                  setSelectedCaptionIndex(i);
                  const line = captionLines[i];
                  if (line) seekPreviewTo(line.startSec);
                }}
                onUpdate={updateLine}
                onVideoTrimChange={(a, b) => {
                  setVideoTrimIn(a);
                  setVideoTrimOut(b);
                }}
                onSnapToggle={() => undefined}
                labels={{
                  title: t.timelineTitle,
                  hint: t.timelineHint,
                  videoTrack: t.videoTrack,
                  captionTrack: t.captionTrack,
                  bgmTrack: t.bgmTrack,
                  trimIn: t.trimIn,
                  trimOut: t.trimOut,
                  snapBeats: t.snapBeats,
                  trimVideoIn: t.trimVideoIn,
                  trimVideoOut: t.trimVideoOut,
                }}
              />

              {captionLines.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
                  {t2.emptyLinesHint}
                </p>
              ) : (
                <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                  {captionLines.map((line, index) => (
                    <div
                      key={`line-${index}`}
                      className={`rounded-lg ${
                        index === selectedCaptionIndex
                          ? "ring-1 ring-cyan-400/50"
                          : ""
                      }`}
                      onClick={(e) => {
                        const tag = (e.target as HTMLElement).tagName;
                        if (
                          tag === "INPUT" ||
                          tag === "TEXTAREA" ||
                          tag === "SELECT" ||
                          tag === "BUTTON" ||
                          tag === "LABEL"
                        ) {
                          return;
                        }
                        setSelectedCaptionIndex(index);
                        seekPreviewTo(line.startSec);
                      }}
                    >
                      <CaptionLineEditor
                        line={line}
                        index={index}
                        timingLabel={t.timingLabel}
                        positionLabel={t.positionLabel}
                        positionOptions={t.positionOptions}
                        multilineHint={t.multilineHint}
                        removeLabel={t.removeLine}
                        styleOptions={styleOptions}
                        defaultStylePreset={defaultStylePreset}
                        locale={locale}
                        onChange={(patch) => updateLine(index, patch)}
                        onRemove={() =>
                          setCaptionLines((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white"
                onClick={() =>
                  setCaptionLines((prev) => [
                    ...prev,
                    {
                      startSec: Math.max(0, videoDuration - 2),
                      endSec: videoDuration,
                      text: "",
                      position: "bottom",
                    },
                  ])
                }
              >
                {t.addLine}
              </button>
            </section>
          </div>

          {/* Sticky primary actions — classic captions pattern */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur xl:static xl:mt-2 xl:rounded-2xl xl:border xl:px-4">
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">
                {phase === "captions"
                  ? t2.stickyCaptionsHint
                  : t2.stickyFinishHint(usableLineCount)}
              </p>
              <div className="flex flex-wrap gap-2">
                {phase === "captions" ? (
                  <>
                    <button
                      type="button"
                      disabled={transcribeBusy || !asrSourceUrl}
                      onClick={() => void runAutoTranscribe()}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                    >
                      {transcribeBusy ? t2.transcribing : t2.autoCta}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
                      onClick={() => setPhase("finish")}
                    >
                      {t2.continueFinish}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
                      onClick={() => setPhase("captions")}
                    >
                      {t2.backToCaptions}
                    </button>
                    <button
                      type="button"
                      disabled={busy || usableLineCount === 0}
                      onClick={() => void burnCaptions()}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                    >
                      {busy ? t.applying : t.applyBtn}
                    </button>
                    {processedVideoUrl ? (
                      <button
                        type="button"
                        disabled={downloadBusy}
                        onClick={() => void onDownload()}
                        className="rounded-xl border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200 disabled:opacity-50"
                      >
                        {downloadBusy ? t.downloading : t.downloadBtn}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <LibraryAssetPicker
        open={libraryOpen}
        kinds={["video"]}
        onClose={() => setLibraryOpen(false)}
        onPick={(asset) => {
          setLibraryOpen(false);
          if (asset.downloadUrl) {
            applySource(asset.downloadUrl, asset.name || t.sourceFromLibrary);
            setNote(t2.readyAuto);
          }
        }}
        labels={{
          title: t.libraryPickerTitle,
          loading: t.libraryPickerLoading,
          empty: t.libraryPickerEmpty,
          loadError: t.libraryPickerLoadError,
          cancel: t.libraryPickerCancel,
          useThis: t.libraryPickerUse,
          close: t.libraryPickerClose,
        }}
      />
    </div>
  );
}
