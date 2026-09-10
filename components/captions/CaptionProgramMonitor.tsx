"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  clipAtPlayhead,
  packClipsMagnetically,
  sourceTimeForPlayhead,
  type TimelineClip,
} from "@/lib/captions/timeline-project";

/**
 * CapCut-like program monitor: keeps one <video> mounted across magnetic clips.
 * Swaps src only when the underlying URL changes; seeks on scrub / clip handoff,
 * not on every playhead tick from its own timeupdate.
 */
export const CaptionProgramMonitor = forwardRef<
  HTMLVideoElement,
  {
    clips: TimelineClip[];
    playheadSec: number;
    projectDur: number;
    /** Flat baked / burned / original override — bypasses multi-clip mapping. */
    flatSrc: string | null;
    showOriginal: boolean;
    onPlayhead: (sec: number) => void;
  }
>(function CaptionProgramMonitor(props, ref) {
  const { clips, playheadSec, projectDur, flatSrc, showOriginal, onPlayhead } =
    props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const syncingRef = useRef(false);
  const wantPlayingRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);
  const lastClipIdRef = useRef<string | null>(null);
  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  const hit = flatSrc ? null : sourceTimeForPlayhead(clips, playheadSec);
  const activeUrl = flatSrc ?? hit?.url ?? null;
  const activeClipId = flatSrc ? "__flat__" : hit?.clipId ?? null;
  const targetSourceSec = flatSrc ? playheadSec : (hit?.sourceSec ?? 0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    const applySeek = (sec: number) => {
      syncingRef.current = true;
      try {
        if (Number.isFinite(sec) && Math.abs(video.currentTime - sec) > 0.1) {
          video.currentTime = Math.max(0, sec);
        }
      } finally {
        window.setTimeout(() => {
          syncingRef.current = false;
        }, 60);
      }
    };

    const resumeIfNeeded = () => {
      if (wantPlayingRef.current && video.paused) {
        void video.play().catch(() => undefined);
      }
    };

    const urlChanged = lastUrlRef.current !== activeUrl;
    const clipChanged = lastClipIdRef.current !== activeClipId;

    if (urlChanged) {
      lastUrlRef.current = activeUrl;
      lastClipIdRef.current = activeClipId;
      video.src = activeUrl;
      video.load();
      const onMeta = () => {
        applySeek(targetSourceSec);
        resumeIfNeeded();
        video.removeEventListener("loadedmetadata", onMeta);
      };
      video.addEventListener("loadedmetadata", onMeta);
      return () => video.removeEventListener("loadedmetadata", onMeta);
    }

    if (clipChanged) {
      lastClipIdRef.current = activeClipId;
      applySeek(targetSourceSec);
      resumeIfNeeded();
      return;
    }

    // Scrub while paused (or large jump) — avoid fighting timeupdate while playing.
    if (video.paused || Math.abs(video.currentTime - targetSourceSec) > 0.35) {
      applySeek(targetSourceSec);
    }
  }, [activeUrl, activeClipId, targetSourceSec]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className="h-full max-h-full w-auto max-w-full rounded-lg bg-black object-contain"
      style={{ aspectRatio: "9 / 16", height: "100%", maxHeight: "100%", width: "auto" }}
      onPlay={() => {
        wantPlayingRef.current = true;
      }}
      onPause={() => {
        if (!syncingRef.current) wantPlayingRef.current = false;
      }}
      onTimeUpdate={(e) => {
        if (syncingRef.current) return;
        const video = e.currentTarget;

        if (flatSrc || showOriginal) {
          onPlayhead(Math.max(0, Math.min(projectDur, video.currentTime)));
          return;
        }

        const packed = packClipsMagnetically(clipsRef.current);
        const at = clipAtPlayhead(clipsRef.current, playheadSec);
        if (!at) return;
        const { clip, index } = at;

        if (video.currentTime >= clip.sourceOutSec - 0.04) {
          const next = packed[index + 1];
          if (next) {
            wantPlayingRef.current = true;
            onPlayhead(next.timelineStartSec + 0.01);
          } else {
            wantPlayingRef.current = false;
            video.pause();
            onPlayhead(projectDur);
          }
          return;
        }

        const local = video.currentTime - clip.sourceInSec;
        onPlayhead(
          Math.max(
            0,
            Math.min(projectDur, clip.timelineStartSec + Math.max(0, local)),
          ),
        );
      }}
    />
  );
});
