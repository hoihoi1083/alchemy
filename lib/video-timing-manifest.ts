import type { CaptionLine } from "@/lib/ad-pack-types";

/** One contiguous segment in the finished MP4 (single clip or stitch piece). */
export type VideoClipBoundary = {
  startSec: number;
  endSec: number;
  /** Provenance only — editing is boundary-based, not engine-based. */
  source?: "seedance" | "kling" | "stitch" | "upload" | "unknown";
  sceneId?: string;
  role?: string;
  label?: string;
};

/**
 * Timing facts about a finished video.
 * Optional for arbitrary user uploads — /captions always probes `<video>.duration`.
 */
export type VideoTimingManifest = {
  outputDurationSec: number;
  clipBoundaries: VideoClipBoundary[];
  /** How duration/boundaries were obtained. */
  timingSource: "probed" | "reported" | "estimated";
  engine?: "seedance" | "kling" | "mixed" | "unknown";
};

export function buildSingleClipManifest(
  durationSec: number,
  opts?: {
    source?: VideoClipBoundary["source"];
    engine?: VideoTimingManifest["engine"];
    timingSource?: VideoTimingManifest["timingSource"];
  },
): VideoTimingManifest {
  const dur = Math.max(0.1, Number(durationSec) || 0.1);
  return {
    outputDurationSec: dur,
    clipBoundaries: [
      {
        startSec: 0,
        endSec: dur,
        source: opts?.source ?? "unknown",
      },
    ],
    timingSource: opts?.timingSource ?? "estimated",
    engine: opts?.engine ?? "unknown",
  };
}

/** Cumulative boundaries from ordered clip lengths (Seedance stitch or Kling). */
export function buildManifestFromClipDurations(
  clipDurations: number[],
  opts?: {
    source?: VideoClipBoundary["source"];
    engine?: VideoTimingManifest["engine"];
    timingSource?: VideoTimingManifest["timingSource"];
    labels?: string[];
  },
): VideoTimingManifest {
  const boundaries: VideoClipBoundary[] = [];
  let cursor = 0;
  for (let i = 0; i < clipDurations.length; i++) {
    const span = Math.max(0.1, Number(clipDurations[i]) || 0.1);
    boundaries.push({
      startSec: cursor,
      endSec: cursor + span,
      source: opts?.source ?? "stitch",
      sceneId: `clip-${i + 1}`,
      label: opts?.labels?.[i],
    });
    cursor += span;
  }
  if (!boundaries.length) {
    return buildSingleClipManifest(8, {
      source: opts?.source,
      engine: opts?.engine,
      timingSource: opts?.timingSource ?? "estimated",
    });
  }
  return {
    outputDurationSec: cursor,
    clipBoundaries: boundaries,
    timingSource: opts?.timingSource ?? "reported",
    engine: opts?.engine ?? "unknown",
  };
}

export function cutMarkersFromManifest(
  manifest: VideoTimingManifest | null | undefined,
): number[] {
  if (!manifest?.clipBoundaries?.length || manifest.clipBoundaries.length < 2) {
    return [];
  }
  // Interior cuts only (skip 0 and final end).
  return manifest.clipBoundaries.slice(0, -1).map((b) => b.endSec);
}

export function scaleManifestToDuration(
  manifest: VideoTimingManifest,
  durationSec: number,
): VideoTimingManifest {
  const dur = Math.max(0.1, Number(durationSec) || 0.1);
  const prevDur = Math.max(0.1, Number(manifest.outputDurationSec) || 0.1);
  const scale = dur / prevDur;
  return {
    ...manifest,
    outputDurationSec: dur,
    clipBoundaries: manifest.clipBoundaries.map((boundary, index, boundaries) => ({
      ...boundary,
      startSec: index === 0 ? 0 : Math.round(boundary.startSec * scale * 1000) / 1000,
      endSec:
        index === boundaries.length - 1
          ? dur
          : Math.round(boundary.endSec * scale * 1000) / 1000,
    })),
    timingSource: "probed",
  };
}

/** After trimming the media file, shift/clamp caption windows into the new timeline. */
export function rebaseCaptionLinesAfterTrim(
  lines: CaptionLine[],
  trimInSec: number,
  trimOutSec: number,
): CaptionLine[] {
  const inSec = Math.max(0, trimInSec);
  const outSec = Math.max(inSec + 0.2, trimOutSec);
  const span = outSec - inSec;
  return lines
    .map((line) => {
      const start = Math.max(0, line.startSec - inSec);
      const end = Math.min(span, line.endSec - inSec);
      return {
        ...line,
        startSec: Math.round(start * 100) / 100,
        endSec: Math.round(end * 100) / 100,
      };
    })
    .filter((line) => line.endSec - line.startSec >= 0.15 && line.text.trim());
}

/**
 * Map ordered text blocks onto clip boundaries (1:1 when counts match;
 * otherwise distribute evenly within each remaining boundary span).
 */
export function captionLinesOntoBoundaries(
  texts: string[],
  boundaries: VideoClipBoundary[],
): CaptionLine[] {
  const cleaned = texts.map((t) => t.trim()).filter(Boolean);
  if (!cleaned.length || !boundaries.length) return [];

  if (cleaned.length === boundaries.length) {
    return cleaned.map((text, i) => ({
      startSec: boundaries[i].startSec,
      endSec: Math.max(boundaries[i].startSec + 0.3, boundaries[i].endSec),
      text,
      position: "bottom" as const,
    }));
  }

  // More/fewer lines than clips: even-split across full output span.
  const totalStart = boundaries[0].startSec;
  const totalEnd = boundaries[boundaries.length - 1].endSec;
  const span = Math.max(0.3, totalEnd - totalStart);
  const slot = span / cleaned.length;
  return cleaned.map((text, i) => ({
    startSec: Math.round((totalStart + i * slot) * 100) / 100,
    endSec: Math.round((totalStart + (i + 1) * slot) * 100) / 100,
    text,
    position: "bottom" as const,
  }));
}

export function parseTimingManifest(raw: unknown): VideoTimingManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<VideoTimingManifest>;
  if (typeof obj.outputDurationSec !== "number" || obj.outputDurationSec <= 0) return null;
  if (!Array.isArray(obj.clipBoundaries)) return null;
  const clipBoundaries = obj.clipBoundaries.filter(
    (b): b is VideoClipBoundary =>
      Boolean(b) &&
      typeof b === "object" &&
      typeof (b as VideoClipBoundary).startSec === "number" &&
      typeof (b as VideoClipBoundary).endSec === "number",
  );
  return {
    outputDurationSec: obj.outputDurationSec,
    clipBoundaries,
    timingSource:
      obj.timingSource === "probed" || obj.timingSource === "reported"
        ? obj.timingSource
        : "estimated",
    engine: obj.engine,
  };
}
