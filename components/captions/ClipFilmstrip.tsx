"use client";

import { useEffect, useState } from "react";
import { toRelativePipelineUrl } from "@/lib/caption-studio-url";

/**
 * Filmstrip thumbs for a trimmed source range.
 * Prefer same-origin `/api/...` (no crossOrigin — cookies work).
 * Absolute CDN URLs without CORS go through `/api/download-media`.
 */
export function ClipFilmstrip(props: {
  url: string;
  sourceInSec: number;
  sourceOutSec: number;
  /** Approx pixel width of the clip bar — drives thumb count. */
  widthPx: number;
}) {
  const { url, sourceInSec, sourceOutSec, widthPx } = props;
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const count = Math.max(1, Math.min(10, Math.ceil(widthPx / 36)));
    const dur = Math.max(0.2, sourceOutSec - sourceInSec);

    void (async () => {
      const frames = await captureThumbs(url, sourceInSec, dur, count, () => cancelled);
      if (!cancelled && frames.length > 0) setThumbs(frames);
    })();

    return () => {
      cancelled = true;
    };
  }, [url, sourceInSec, sourceOutSec, widthPx]);

  if (thumbs.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex overflow-hidden opacity-70">
      {thumbs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${i}-${src.slice(-12)}`}
          src={src}
          alt=""
          className="h-full min-w-0 flex-1 object-cover"
        />
      ))}
    </div>
  );
}

function resolveFilmstripPlayUrl(raw: string): { src: string; crossOrigin: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { src: trimmed, crossOrigin: false };
  if (trimmed.startsWith("blob:")) return { src: trimmed, crossOrigin: false };

  const rel = toRelativePipelineUrl(trimmed);
  if (rel.startsWith("/")) {
    // Same-origin pipeline / library — auth cookies; do not set anonymous CORS.
    // Library download without inline/stream 302s to R2 (CORS-breaks canvas thumbs).
    let src = rel;
    if (src.includes("/api/library/download/")) {
      const sep = src.includes("?") ? "&" : "?";
      if (!/[?&]inline=1\b/.test(src) && !/[?&]stream=1\b/.test(src)) {
        src = `${src}${sep}inline=1`;
      }
    }
    return { src, crossOrigin: false };
  }

  try {
    if (typeof window !== "undefined") {
      const abs = new URL(rel, window.location.origin);
      if (abs.origin === window.location.origin) {
        return resolveFilmstripPlayUrl(`${abs.pathname}${abs.search}`);
      }
    }
  } catch {
    /* fall through */
  }

  // Remote media: same-origin download proxy so canvas capture is not CORS-tainted.
  return {
    src: `/api/download-media?url=${encodeURIComponent(rel)}`,
    crossOrigin: false,
  };
}

async function captureThumbs(
  url: string,
  sourceInSec: number,
  dur: number,
  count: number,
  isCancelled: () => boolean,
): Promise<string[]> {
  const { src, crossOrigin } = resolveFilmstripPlayUrl(url);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  if (crossOrigin) video.crossOrigin = "anonymous";

  const loaded = new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("video load"));
  });
  video.src = src;
  try {
    await loaded;
  } catch {
    return [];
  }
  if (isCancelled()) return [];

  const canvas = document.createElement("canvas");
  const w = 48;
  const h = 36;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    if (isCancelled()) return frames;
    const t =
      sourceInSec +
      (count === 1 ? dur * 0.5 : (i / Math.max(1, count - 1)) * dur * 0.98);
    try {
      await seekVideo(video, t);
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas.toDataURL("image/jpeg", 0.55));
    } catch {
      break;
    }
  }
  video.removeAttribute("src");
  video.load();
  return frames;
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("seek"));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = Math.max(0, Math.min(time, (video.duration || time) - 0.01));
    } catch (e) {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(e);
    }
  });
}
