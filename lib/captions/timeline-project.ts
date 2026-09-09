import type { CaptionLine } from "@/lib/ad-pack-types";
import type { BgmTrackId } from "@/lib/bgm/tracks";

export type TimelineClip = {
  id: string;
  url: string;
  label?: string;
  /** Inclusive start into the source file. */
  sourceInSec: number;
  /** Exclusive-ish end into the source file (playback end). */
  sourceOutSec: number;
  /** Full source duration when known (for trim max). */
  sourceDurationSec: number;
};

export type TimelineProject = {
  clips: TimelineClip[];
  captions: CaptionLine[];
  bgmTrack: BgmTrackId;
  bgmStartSec: number;
  voUrl?: string | null;
  voStartSec: number;
  playheadSec: number;
};

export type PackedClip = TimelineClip & {
  timelineStartSec: number;
  timelineEndSec: number;
};

export type ExportClipPlan = {
  url: string;
  trimInSec: number;
  trimOutSec: number;
  durationSec: number;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTimelineClip(input: {
  url: string;
  label?: string;
  sourceDurationSec: number;
  sourceInSec?: number;
  sourceOutSec?: number;
}): TimelineClip {
  const dur = Math.max(0.2, input.sourceDurationSec);
  const sourceInSec = Math.max(0, input.sourceInSec ?? 0);
  const sourceOutSec = Math.min(dur, input.sourceOutSec ?? dur);
  return {
    id: newId(),
    url: input.url,
    label: input.label,
    sourceInSec,
    sourceOutSec: Math.max(sourceInSec + 0.2, sourceOutSec),
    sourceDurationSec: dur,
  };
}

export function clipDurationSec(clip: Pick<TimelineClip, "sourceInSec" | "sourceOutSec">): number {
  return Math.max(0.2, clip.sourceOutSec - clip.sourceInSec);
}

/** Magnetic pack: clips abut with no gaps; order preserved. */
export function packClipsMagnetically(clips: TimelineClip[]): PackedClip[] {
  let t = 0;
  return clips.map((clip) => {
    const dur = clipDurationSec(clip);
    const packed: PackedClip = {
      ...clip,
      timelineStartSec: t,
      timelineEndSec: t + dur,
    };
    t += dur;
    return packed;
  });
}

export function projectDuration(clips: TimelineClip[]): number {
  return packClipsMagnetically(clips).reduce(
    (max, c) => Math.max(max, c.timelineEndSec),
    0,
  );
}

export function clipAtPlayhead(
  clips: TimelineClip[],
  playheadSec: number,
): { clip: PackedClip; localSec: number; index: number } | null {
  const packed = packClipsMagnetically(clips);
  if (packed.length === 0) return null;
  const t = Math.max(0, playheadSec);
  for (let i = 0; i < packed.length; i++) {
    const c = packed[i]!;
    if (t < c.timelineEndSec || i === packed.length - 1) {
      if (t >= c.timelineStartSec || i === 0) {
        const local = Math.min(
          clipDurationSec(c) - 0.01,
          Math.max(0, t - c.timelineStartSec),
        );
        return { clip: c, localSec: local, index: i };
      }
    }
  }
  const last = packed[packed.length - 1]!;
  return {
    clip: last,
    localSec: Math.max(0, clipDurationSec(last) - 0.01),
    index: packed.length - 1,
  };
}

export function sourceTimeForPlayhead(
  clips: TimelineClip[],
  playheadSec: number,
): { url: string; sourceSec: number; clipId: string } | null {
  const hit = clipAtPlayhead(clips, playheadSec);
  if (!hit) return null;
  return {
    url: hit.clip.url,
    sourceSec: hit.clip.sourceInSec + hit.localSec,
    clipId: hit.clip.id,
  };
}

export function trimClipEdge(
  clip: TimelineClip,
  edge: "in" | "out",
  sourceSec: number,
): TimelineClip {
  const max = Math.max(0.2, clip.sourceDurationSec);
  if (edge === "in") {
    const sourceInSec = Math.min(
      Math.max(0, sourceSec),
      clip.sourceOutSec - 0.2,
    );
    return { ...clip, sourceInSec };
  }
  const sourceOutSec = Math.max(
    clip.sourceInSec + 0.2,
    Math.min(max, sourceSec),
  );
  return { ...clip, sourceOutSec };
}

/**
 * Split clip containing playhead into two magnetic clips.
 * Returns null if playhead is not interior to a clip (within 0.15s of edges).
 */
export function splitClipAt(
  clips: TimelineClip[],
  playheadSec: number,
): TimelineClip[] | null {
  const hit = clipAtPlayhead(clips, playheadSec);
  if (!hit) return null;
  const { clip, localSec, index } = hit;
  const dur = clipDurationSec(clip);
  if (localSec < 0.15 || localSec > dur - 0.15) return null;
  const cutSource = clip.sourceInSec + localSec;
  const left: TimelineClip = {
    ...clip,
    id: newId(),
    sourceOutSec: cutSource,
  };
  const right: TimelineClip = {
    ...clip,
    id: newId(),
    sourceInSec: cutSource,
  };
  const next = [...clips];
  next.splice(index, 1, left, right);
  return next;
}

export function deleteClipAt(
  clips: TimelineClip[],
  clipId: string,
): TimelineClip[] {
  return clips.filter((c) => c.id !== clipId);
}

export function reorderClips(
  clips: TimelineClip[],
  fromIndex: number,
  toIndex: number,
): TimelineClip[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= clips.length ||
    toIndex >= clips.length ||
    fromIndex === toIndex
  ) {
    return clips;
  }
  const next = [...clips];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return clips;
  next.splice(toIndex, 0, item);
  return next;
}

/** Plan FFmpeg trim (+ later stitch) for each magnetic clip. */
export function exportPlan(clips: TimelineClip[]): ExportClipPlan[] {
  return clips.map((c) => ({
    url: c.url,
    trimInSec: c.sourceInSec,
    trimOutSec: c.sourceOutSec,
    durationSec: clipDurationSec(c),
  }));
}

export function needsTrim(plan: ExportClipPlan, sourceDurationSec?: number): boolean {
  if (plan.trimInSec > 0.05) return true;
  if (
    sourceDurationSec != null &&
    Number.isFinite(sourceDurationSec) &&
    plan.trimOutSec < sourceDurationSec - 0.05
  ) {
    return true;
  }
  // Without known full duration, treat any non-zero in as trim; out alone is still trimmed if we always send range.
  return plan.trimInSec > 0.05;
}

export function moveCaptionLine(
  line: CaptionLine,
  deltaSec: number,
  projectDur: number,
): CaptionLine {
  const len = Math.max(0.1, line.endSec - line.startSec);
  const startSec = Math.max(
    0,
    Math.min(projectDur - len, line.startSec + deltaSec),
  );
  return {
    ...line,
    startSec,
    endSec: startSec + len,
  };
}

export function resizeCaptionEdge(
  line: CaptionLine,
  edge: "start" | "end",
  sec: number,
  projectDur: number,
): CaptionLine {
  if (edge === "start") {
    return {
      ...line,
      startSec: Math.max(0, Math.min(sec, line.endSec - 0.1)),
    };
  }
  return {
    ...line,
    endSec: Math.min(projectDur, Math.max(sec, line.startSec + 0.1)),
  };
}
