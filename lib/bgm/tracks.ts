import path from "path";

export type BgmTrackId = "calm" | "upbeat" | "warm";

export const BGM_TRACKS: { id: BgmTrackId; file: string }[] = [
  { id: "calm", file: "calm.mp3" },
  { id: "upbeat", file: "upbeat.mp3" },
  { id: "warm", file: "warm.mp3" },
];

export const DEFAULT_BGM_TRACK: BgmTrackId = "calm";

export function bgmFilePath(trackId: BgmTrackId): string {
  const entry = BGM_TRACKS.find((t) => t.id === trackId) ?? BGM_TRACKS[0];
  return path.join(process.cwd(), "public", "bgm", entry.file);
}
