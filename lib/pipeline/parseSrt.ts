import { TranscriptResult, TranscriptSegment } from "@/lib/pipeline/types";

function srtTimeToSeconds(input: string): number {
  const match = input.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) return 0;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  const ms = Number(match[4]);
  return h * 3600 + m * 60 + s + ms / 1000;
}

export function parseSrtToTranscript(srtText: string): TranscriptResult {
  const blocks = srtText
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const segments: TranscriptSegment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 2) continue;
    const timeline = lines[1]?.trim();
    if (!timeline?.includes("-->")) continue;
    const [startRaw, endRaw] = timeline.split("-->").map((s) => s.trim());
    if (!startRaw || !endRaw) continue;
    const text = lines.slice(2).join("\n").trim();
    if (!text) continue;
    segments.push({
      start: srtTimeToSeconds(startRaw),
      end: srtTimeToSeconds(endRaw),
      text,
    });
  }

  return {
    text: segments.map((s) => s.text).join(" "),
    segments,
  };
}
