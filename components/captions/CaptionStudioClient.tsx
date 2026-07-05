"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CaptionLineEditor } from "@/components/captions/CaptionLineEditor";
import { useLocale } from "@/components/LocaleProvider";
import type { CaptionLine } from "@/lib/ad-pack-types";
import {
  clearCaptionHandoff,
  defaultCaptionLines,
  readCaptionDraft,
  readCaptionHandoff,
  writeCaptionDraft,
} from "@/lib/caption-studio-draft";
import { isPipelineFileUrl } from "@/lib/pipeline/safe-url";

type SourceKind = "file" | "url";

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

export function CaptionStudioClient() {
  const { m } = useLocale();
  const t = m.captions;
  const searchParams = useSearchParams();

  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlobUrl, setOutputBlobUrl] = useState<string | null>(null);
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>(defaultCaptionLines());
  const [videoDuration, setVideoDuration] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const sourceKey = sourceFile
    ? `file:${sourceFile.name}:${sourceFile.size}`
    : sourceUrl
      ? `url:${sourceUrl}`
      : "";

  const activePreview = outputBlobUrl ?? outputUrl ?? previewUrl;

  const loadSource = useCallback(
    (kind: SourceKind, opts: { file?: File; url?: string; label?: string; lines?: CaptionLine[] }) => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (outputBlobUrl) URL.revokeObjectURL(outputBlobUrl);

      setOutputUrl(null);
      setOutputBlobUrl(null);
      setNote(null);
      setError(null);
      setSourceKind(kind);

      if (kind === "file" && opts.file) {
        const blob = URL.createObjectURL(opts.file);
        setSourceFile(opts.file);
        setSourceUrl(null);
        setSourceLabel(opts.label ?? opts.file.name);
        setPreviewUrl(blob);
      } else if (kind === "url" && opts.url) {
        setSourceFile(null);
        setSourceUrl(opts.url);
        setSourceLabel(opts.label ?? t.sourceFromStudio);
        setPreviewUrl(opts.url);
      }

      const key =
        kind === "file" && opts.file
          ? `file:${opts.file.name}:${opts.file.size}`
          : opts.url
            ? `url:${opts.url}`
            : "";
      const draft = key ? readCaptionDraft(key) : null;
      setCaptionLines(opts.lines ?? draft ?? defaultCaptionLines());
    },
    [previewUrl, outputBlobUrl, t.sourceFromStudio],
  );

  useEffect(() => {
    const handoff = readCaptionHandoff();
    const videoParam = searchParams.get("video")?.trim();
    const url = handoff?.videoUrl ?? videoParam ?? null;
    if (url) {
      loadSource("url", {
        url,
        label: handoff?.label,
        lines: handoff?.captionLines,
      });
      clearCaptionHandoff();
    }
  }, [searchParams, loadSource]);

  useEffect(() => {
    if (!sourceKey) return;
    writeCaptionDraft(sourceKey, captionLines);
  }, [sourceKey, captionLines]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (outputBlobUrl) URL.revokeObjectURL(outputBlobUrl);
    };
  }, [previewUrl, outputBlobUrl]);

  function onFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError(t.invalidVideoType);
      return;
    }
    loadSource("file", { file });
  }

  function updateCaptionLine(index: number, patch: Partial<CaptionLine>) {
    setCaptionLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addCaptionLine() {
    const last = captionLines[captionLines.length - 1];
    const start = last ? last.endSec : 0;
    const end = Math.min(videoDuration, start + 2.5);
    setCaptionLines((prev) => [
      ...prev,
      { startSec: start, endSec: end, text: "", position: prev.length % 2 === 0 ? "bottom" : "top" },
    ]);
  }

  function addTopLineSameTiming() {
    const anchor = captionLines[0];
    if (!anchor) {
      addCaptionLine();
      return;
    }
    setCaptionLines((prev) => [
      ...prev,
      {
        startSec: anchor.startSec,
        endSec: Math.min(videoDuration, anchor.endSec),
        text: "",
        position: "top",
      },
    ]);
  }

  function removeCaptionLine(index: number) {
    setCaptionLines((prev) => prev.filter((_, i) => i !== index));
  }

  function splitEvenly() {
    const filled = captionLines.filter((l) => l.text.trim());
    const lines = filled.length > 0 ? filled : [{ startSec: 0, endSec: videoDuration, text: "" }];
    const slice = videoDuration / lines.length;
    setCaptionLines(
      lines.map((line, i) => ({
        ...line,
        startSec: Number((i * slice).toFixed(1)),
        endSec: Number(Math.min(videoDuration, (i + 1) * slice).toFixed(1)),
      })),
    );
  }

  async function applyCaptions() {
    const lines = captionLines.filter((l) => l.text.trim());
    if (!sourceKind || (!sourceFile && !sourceUrl)) {
      setError(t.needVideo);
      return;
    }
    if (lines.length === 0) {
      setError(t.needCaptionText);
      return;
    }

    setBusy(true);
    setError(null);
    setNote(null);

    try {
      let res: Response;
      if (sourceKind === "file" && sourceFile) {
        const fd = new FormData();
        fd.set("video_file", sourceFile);
        fd.set("caption_lines", JSON.stringify(lines));
        res = await fetch("/api/burn-script-captions", { method: "POST", body: fd });
      } else if (sourceUrl) {
        res = await fetch("/api/burn-script-captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: sourceUrl, caption_lines: lines }),
        });
      } else {
        throw new Error(t.needVideo);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.burnFailed);

      const burnedUrl = data.videoUrl as string;
      setOutputUrl(burnedUrl);

      const previewRes = await fetch(burnedUrl, { credentials: "include", cache: "no-store" });
      if (!previewRes.ok) throw new Error(t.previewLoadFailed);
      const blob = await previewRes.blob();
      setOutputBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });

      if (data.softSubtitles) {
        setNote(t.softTrackNote);
        setError(t.softTrackError);
      } else if (data.burnMethod === "overlay" || data.burnMethod === "drawtext") {
        setNote(t.appliedNote);
      } else {
        setNote(t.appliedLegacyNote);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setBusy(false);
    }
  }

  function resetToSource() {
    setOutputUrl(null);
    setOutputBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNote(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
        <h2 className="text-xl font-semibold text-white">{t.uploadTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.uploadHint}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            {t.chooseFile}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
          {sourceLabel && (
            <span className="self-center text-xs text-slate-400">{sourceLabel}</span>
          )}
        </div>

        {sourceUrl && isPipelineFileUrl(sourceUrl) && (
          <p className="mt-2 text-xs text-emerald-300">{t.pipelineSourceNote}</p>
        )}
      </section>

      {activePreview && (
        <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">{t.previewTitle}</h2>
            {outputUrl && (
              <button
                type="button"
                onClick={resetToSource}
                className="text-xs text-cyan-300 underline underline-offset-2"
              >
                {t.showOriginal}
              </button>
            )}
          </div>
          {outputUrl && (
            <p className="text-xs text-violet-200/90">{t.previewCaptionedHint}</p>
          )}
          <video
            ref={previewVideoRef}
            key={activePreview}
            src={activePreview}
            controls
            playsInline
            className="w-full rounded-2xl border border-slate-800 bg-black"
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (Number.isFinite(dur) && dur > 0) setVideoDuration(dur);
            }}
          />
          <p className="text-xs text-slate-500">
            {t.durationLabel.replace("{sec}", videoDuration.toFixed(1))}
          </p>
        </section>
      )}

      <section className="space-y-3 rounded-3xl border border-violet-500/30 bg-violet-950/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-violet-50">{t.linesTitle}</h2>
            <p className="mt-1 text-xs text-violet-200/80">{t.linesHint}</p>
          </div>
          <button
            type="button"
            disabled={!sourceKind}
            onClick={splitEvenly}
            className="rounded-full border border-violet-400/50 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/40 disabled:opacity-50"
          >
            {t.splitEvenly}
          </button>
        </div>

        <div className="space-y-2">
          {captionLines.map((line, index) => (
            <CaptionLineEditor
              key={`cap-${index}`}
              line={line}
              index={index}
              timingLabel={t.timingLabel}
              positionLabel={t.positionLabel}
              positionOptions={t.positionOptions}
              multilineHint={t.multilineHint}
              removeLabel={t.removeLine}
              onChange={(patch) => updateCaptionLine(index, patch)}
              onRemove={() => removeCaptionLine(index)}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addCaptionLine}
            className="text-xs font-medium text-cyan-300 underline underline-offset-2"
          >
            {t.addLine}
          </button>
          <button
            type="button"
            onClick={addTopLineSameTiming}
            className="text-xs font-medium text-violet-300 underline underline-offset-2"
          >
            {t.addTopSameTiming}
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      {note && (
        <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{note}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || !sourceKind}
          onClick={() => void applyCaptions()}
          className="flex-1 rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white disabled:opacity-40"
        >
          {busy ? t.applying : t.applyBtn}
        </button>
        {(outputUrl ?? activePreview) && (
          <button
            type="button"
            disabled={downloadBusy || !outputUrl}
            onClick={async () => {
              if (!outputUrl) return;
              setDownloadBusy(true);
              try {
                await downloadVideoBlob(outputUrl, "captioned-reel.mp4");
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : t.downloadFailed);
              } finally {
                setDownloadBusy(false);
              }
            }}
            className="rounded-2xl border border-slate-600 px-6 py-3.5 text-sm font-medium text-slate-200 disabled:opacity-40"
          >
            {downloadBusy ? t.downloading : t.downloadBtn}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-slate-500">
        {t.reeditHint}{" "}
        <Link href="/start" className="text-emerald-400 underline underline-offset-2">
          {t.studioLink}
        </Link>
      </p>
    </div>
  );
}
