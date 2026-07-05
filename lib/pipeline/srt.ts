import { TranscriptSegment } from "@/lib/pipeline/types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function secondsToSrtTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

export function buildSrt(segments: TranscriptSegment[]): string {
  const body = segments
    .map((segment, idx) => {
      const start = secondsToSrtTime(segment.start);
      const end = secondsToSrtTime(segment.end);
      return `${idx + 1}\n${start} --> ${end}\n${segment.text.trim()}\n`;
    })
    .join("\n");
  // UTF-8 BOM helps ffmpeg/libass render CJK reliably on macOS.
  return `\uFEFF${body}`;
}
