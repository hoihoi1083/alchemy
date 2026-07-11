import path from "path";

export type BgmTrackId = "calm" | "upbeat" | "warm";

export type BgmTrackMeta = {
  id: BgmTrackId;
  file: string;
  /** ffmpeg mix volume when replacing silent / source audio */
  mixVolume: number;
  /** Short label for UI */
  character: string;
};

export const BGM_TRACKS: BgmTrackMeta[] = [
  {
    id: "calm",
    file: "calm.mp3",
    mixVolume: 0.62,
    character: "soft ambient pad, slow",
  },
  {
    id: "upbeat",
    file: "upbeat.mp3",
    mixVolume: 0.68,
    character: "energetic pulse, brighter",
  },
  {
    id: "warm",
    file: "warm.mp3",
    mixVolume: 0.64,
    character: "warm mid-tone lifestyle",
  },
];

export const DEFAULT_BGM_TRACK: BgmTrackId = "calm";

export function bgmTrackMeta(trackId: BgmTrackId): BgmTrackMeta {
  return BGM_TRACKS.find((t) => t.id === trackId) ?? BGM_TRACKS[0];
}

export function bgmFilePath(trackId: BgmTrackId): string {
  return path.join(process.cwd(), "public", "bgm", bgmTrackMeta(trackId).file);
}

/** Public URL for in-browser preview (library tracks). */
export function bgmPublicUrl(trackId: BgmTrackId): string {
  return `/bgm/${bgmTrackMeta(trackId).file}`;
}

export function bgmMixVolume(trackId: BgmTrackId): number {
  return bgmTrackMeta(trackId).mixVolume;
}
