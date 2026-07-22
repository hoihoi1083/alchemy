import type { CaptionLine } from "@/lib/ad-pack-types";

export type StoryboardCaptionSource = {
  startSec: number;
  endSec: number;
  onImageCopyZh?: string;
  sceneDescriptionZh?: string;
};

/**
 * Build timed captions from storyboard scene copy.
 * When `videoDurationSec` is set (e.g. Kling 4×5s = 20s vs plan 8s),
 * scene windows are scaled to fill the finished video.
 */
export function captionLinesFromStoryboardScenes(
  scenes: StoryboardCaptionSource[],
  opts?: { videoDurationSec?: number },
): CaptionLine[] {
  const lines: CaptionLine[] = [];
  for (const scene of scenes) {
    const text =
      scene.onImageCopyZh?.trim() ||
      scene.sceneDescriptionZh?.trim() ||
      "";
    if (!text) continue;
    lines.push({
      startSec: Math.max(0, scene.startSec),
      endSec: Math.max(scene.startSec + 0.3, scene.endSec),
      text,
      position: "bottom",
    });
  }
  if (!lines.length) return [];

  const planEnd = Math.max(...lines.map((l) => l.endSec), 0.1);
  const videoDur = opts?.videoDurationSec;
  if (videoDur && videoDur > 0 && Math.abs(videoDur - planEnd) > 0.75) {
    const scale = videoDur / planEnd;
    return lines.map((l) => ({
      ...l,
      startSec: Math.round(l.startSec * scale * 100) / 100,
      endSec: Math.round(l.endSec * scale * 100) / 100,
    }));
  }
  return lines;
}

/** Equal-duration captions when each Kling clip is the same length. */
export function captionLinesFromEqualKlingClips(
  texts: string[],
  clipSec: number,
): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let t = 0;
  for (const raw of texts) {
    const text = raw.trim();
    if (!text) {
      t += clipSec;
      continue;
    }
    lines.push({
      startSec: t,
      endSec: t + clipSec,
      text,
      position: "bottom",
    });
    t += clipSec;
  }
  return lines;
}
