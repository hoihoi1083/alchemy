"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { newVisualCaptionClip, type VisualCaptionClip } from "@/lib/visual-caption-types";

type DragState = {
  clipId: string;
  offsetX: number;
  offsetY: number;
};

export function VisualCaptionStudioClient() {
  const { m } = useLocale();
  const t = m.visualCaptions;

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(8);
  const [currentTime, setCurrentTime] = useState(0);
  const [clips, setClips] = useState<VisualCaptionClip[]>([newVisualCaptionClip()]);
  const [selectedId, setSelectedId] = useState<string | null>(clips[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlobUrl, setOutputBlobUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = clips.find((c) => c.id === selectedId) ?? clips[0] ?? null;

  const updateClip = useCallback((id: string, patch: Partial<VisualCaptionClip>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const onFile = useCallback((file: File) => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (outputBlobUrl) URL.revokeObjectURL(outputBlobUrl);
    setOutputUrl(null);
    setOutputBlobUrl(null);
    setError(null);
    setSourceFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    const first = newVisualCaptionClip({ endSec: 3 });
    setClips([first]);
    setSelectedId(first.id);
  }, [previewUrl, outputBlobUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [previewUrl]);

  const clipVisible = (clip: VisualCaptionClip) =>
    currentTime >= clip.startSec && currentTime <= clip.endSec;

  const startDrag = (e: React.PointerEvent, clip: VisualCaptionClip) => {
    e.preventDefault();
    setSelectedId(clip.id);
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const elX = (clip.xPct / 100) * box.width;
    const elY = (clip.yPct / 100) * box.height;
    dragRef.current = {
      clipId: clip.id,
      offsetX: e.clientX - box.left - elX,
      offsetY: e.clientY - box.top - elY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!drag || !box) return;
    const x = e.clientX - box.left - drag.offsetX;
    const y = e.clientY - box.top - drag.offsetY;
    const xPct = Math.min(98, Math.max(2, (x / box.width) * 100));
    const yPct = Math.min(98, Math.max(2, (y / box.height) * 100));
    updateClip(drag.clipId, { xPct, yPct });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  async function exportVideo() {
    const lines = clips.filter((c) => c.text.trim());
    if (!sourceFile && !previewUrl) {
      setError(t.needVideo);
      return;
    }
    if (lines.length === 0) {
      setError(t.needText);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      if (sourceFile) fd.set("video_file", sourceFile);
      else if (previewUrl) fd.set("video_url", previewUrl);
      fd.set("clips", JSON.stringify(lines));

      const res = await fetch("/api/burn-visual-captions", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.exportFailed);

      const url = data.videoUrl as string;
      setOutputUrl(url);
      const previewRes = await fetch(url, { credentials: "include", cache: "no-store" });
      if (!previewRes.ok) throw new Error(t.previewFailed);
      const blob = await previewRes.blob();
      setOutputBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.exportFailed);
    } finally {
      setBusy(false);
    }
  }

  const activePreview = outputBlobUrl ?? previewUrl;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
        {t.hint}
      </div>

      {!previewUrl ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/50 px-6 py-16 text-center hover:border-cyan-500">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <p className="text-lg font-medium text-white">{t.uploadTitle}</p>
          <p className="mt-2 text-sm text-slate-400">{t.uploadHint}</p>
        </label>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div
              ref={canvasRef}
              className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-white/10"
              style={{ aspectRatio: "9/16" }}
            >
              <video
                ref={videoRef}
                src={activePreview ?? undefined}
                className="h-full w-full object-contain"
                controls
                playsInline
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d)) setVideoDuration(d);
                }}
              />
              {clips.map((clip) => {
                const visible = clipVisible(clip);
                const isSelected = clip.id === selectedId;
                return (
                  <div
                    key={clip.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => startDrag(e, clip)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={() => setSelectedId(clip.id)}
                    className={`absolute max-w-[88%] cursor-grab select-none rounded px-2 py-1 text-center text-sm font-bold leading-snug text-white active:cursor-grabbing ${
                      isSelected ? "ring-2 ring-cyan-400" : ""
                    } ${visible ? "opacity-100" : "opacity-35"}`}
                    style={{
                      left: `${clip.xPct}%`,
                      top: `${clip.yPct}%`,
                      transform: "translate(-50%, -50%)",
                      textShadow: "0 1px 3px #000, 0 0 8px #000",
                    }}
                  >
                    {clip.text || "…"}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-slate-500">{t.dragHint}</p>
          </div>

          <div className="space-y-4">
            {selected && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                  {t.selectedClip}
                </p>
                <textarea
                  value={selected.text}
                  onChange={(e) => updateClip(selected.id, { text: e.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <label className="block">
                    {t.startSec}
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={selected.startSec}
                      onChange={(e) =>
                        updateClip(selected.id, { startSec: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                    />
                  </label>
                  <label className="block">
                    {t.endSec}
                    <input
                      type="number"
                      min={0.3}
                      step={0.1}
                      value={selected.endSec}
                      onChange={(e) =>
                        updateClip(selected.id, { endSec: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                    />
                  </label>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  {t.positionLabel}: {selected.xPct.toFixed(0)}%, {selected.yPct.toFixed(0)}%
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const c = newVisualCaptionClip({
                    startSec: currentTime,
                    endSec: Math.min(videoDuration, currentTime + 3),
                  });
                  setClips((p) => [...p, c]);
                  setSelectedId(c.id);
                }}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500"
              >
                {t.addClip}
              </button>
              {selected && clips.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setClips((p) => p.filter((c) => c.id !== selected.id));
                    setSelectedId(clips.find((c) => c.id !== selected.id)?.id ?? null);
                  }}
                  className="rounded-lg border border-rose-800 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950"
                >
                  {t.removeClip}
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void exportVideo()}
              className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {busy ? t.exporting : t.exportBtn}
            </button>

            {outputUrl && (
              <a
                href={outputBlobUrl ?? outputUrl}
                download="visual-captions.mp4"
                className="block w-full rounded-xl border border-emerald-600 px-4 py-3 text-center text-sm font-medium text-emerald-300 hover:bg-emerald-950/40"
              >
                {t.downloadBtn}
              </a>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs text-slate-500 underline hover:text-slate-300"
            >
              {t.changeVideo}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
