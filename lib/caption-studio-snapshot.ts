import type {
  AiMusicTrack,
  CaptionLine,
  CaptionLineStyle,
  CaptionPosition,
  VoClip,
  VoicePreviewTrack,
} from "@/lib/ad-pack-types";
import type { MusicMood, VoiceoverLocale } from "@/lib/ad-pack-preferences";
import type { BgmTrackId } from "@/lib/bgm/tracks";
import { DEFAULT_BGM_TRACK } from "@/lib/bgm/tracks";
import {
  isCaptionStylePresetId,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import type { TimelineClip } from "@/lib/captions/timeline-project";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";

export type CaptionMusicSource = "library" | "ai";
export type CaptionMode = "pure" | "speech" | "ai";

/**
 * Cloud-persisted Caption Studio 2 project (Ultra-board style).
 * Media is referenced by durable URL only — never blob: / File.
 */
export type CaptionStudioSnapshot = {
  version: 1;
  sourceLabel?: string;
  sourceUrl?: string | null;
  originalSourceUrl?: string | null;
  processedVideoUrl?: string | null;
  refImageUrl?: string | null;
  timelineClips: TimelineClip[];
  captionLines: CaptionLine[];
  defaultStylePreset: CaptionStylePresetId;
  captionMode: CaptionMode;
  bgmTrack: BgmTrackId;
  bgmStartSec: number;
  bgmDurationSec: number | null;
  replaceSourceAudio: boolean;
  bgmVolume: number;
  underVoiceBgmVolume: number;
  voiceVolume: number;
  voiceoverEnabled: boolean;
  voiceoverScript: string;
  voiceoverLocale: VoiceoverLocale;
  voClips: VoClip[];
  musicSource: CaptionMusicSource;
  musicTopic: string;
  musicMood: MusicMood;
  matchMusicToVideo: boolean;
  aiMusicTracks: AiMusicTrack[];
  selectedAiMusicId: string | null;
  voicePreviewTracks: VoicePreviewTrack[];
  selectedVoicePreviewId: string | null;
  playheadSec: number;
  /** True when caption text is already burned into the plate pixels. */
  captionsBurnedInPlate?: boolean;
};

export type CaptionStudioSnapshotInput = {
  sourceLabel?: string;
  sourceUrl?: string | null;
  originalSourceUrl?: string | null;
  processedVideoUrl?: string | null;
  refImageUrl?: string | null;
  timelineClips: TimelineClip[];
  captionLines: CaptionLine[];
  defaultStylePreset: CaptionStylePresetId;
  captionMode: CaptionMode;
  bgmTrack: BgmTrackId;
  bgmStartSec: number;
  bgmDurationSec: number | null;
  replaceSourceAudio: boolean;
  bgmVolume: number;
  underVoiceBgmVolume: number;
  voiceVolume: number;
  voiceoverEnabled: boolean;
  voiceoverScript: string;
  voiceoverLocale: VoiceoverLocale;
  voClips: VoClip[];
  musicSource: CaptionMusicSource;
  musicTopic: string;
  musicMood: MusicMood;
  matchMusicToVideo: boolean;
  aiMusicTracks: AiMusicTrack[];
  selectedAiMusicId: string | null;
  voicePreviewTracks: VoicePreviewTrack[];
  selectedVoicePreviewId: string | null;
  playheadSec: number;
  captionsBurnedInPlate?: boolean;
};

function isPersistableUrl(url: unknown): url is string {
  return typeof url === "string" && isHttpOrLibraryMediaUrl(url);
}

const BGM_TRACKS = new Set<BgmTrackId>(["calm", "upbeat", "warm"]);
const MUSIC_MOODS = new Set<MusicMood>([
  "auto",
  "warm",
  "upbeat",
  "premium",
  "cinematic",
]);
const VO_LOCALES = new Set<VoiceoverLocale>(["hk", "en", "cn"]);
const MUSIC_SOURCES = new Set<CaptionMusicSource>(["library", "ai"]);
const CAPTION_MODES = new Set<CaptionMode>(["pure", "speech", "ai"]);
const POSITIONS = new Set<CaptionPosition>([
  "top",
  "center",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

function asFiniteNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function parseCaptionStyle(raw: unknown): CaptionLineStyle | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const style: CaptionLineStyle = {};
  if (typeof o.fill === "string") style.fill = o.fill;
  if (typeof o.stroke === "string") style.stroke = o.stroke;
  if (typeof o.strokeWidth === "number" && Number.isFinite(o.strokeWidth)) {
    style.strokeWidth = o.strokeWidth;
  }
  if (typeof o.fontSizeScale === "number" && Number.isFinite(o.fontSizeScale)) {
    style.fontSizeScale = o.fontSizeScale;
  }
  if (typeof o.shadowColor === "string") style.shadowColor = o.shadowColor;
  if (typeof o.shadowBlur === "number" && Number.isFinite(o.shadowBlur)) {
    style.shadowBlur = o.shadowBlur;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function parseCaptionLine(raw: unknown): CaptionLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = asString(o.text).trim();
  if (!text) return null;
  const startSec = Math.max(0, asFiniteNumber(o.startSec, 0));
  const endSec = Math.max(startSec + 0.1, asFiniteNumber(o.endSec, startSec + 2));
  const line: CaptionLine = { startSec, endSec, text };
  if (typeof o.spokenText === "string" && o.spokenText.trim()) {
    line.spokenText = o.spokenText;
  }
  if (typeof o.position === "string" && POSITIONS.has(o.position as CaptionPosition)) {
    line.position = o.position as CaptionPosition;
  }
  if (typeof o.stylePreset === "string" && o.stylePreset.trim()) {
    line.stylePreset = o.stylePreset;
  }
  if (typeof o.xPct === "number" && Number.isFinite(o.xPct)) line.xPct = o.xPct;
  if (typeof o.yPct === "number" && Number.isFinite(o.yPct)) line.yPct = o.yPct;
  const style = parseCaptionStyle(o.style);
  if (style) line.style = style;
  return line;
}

function parseTimelineClip(raw: unknown): TimelineClip | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isPersistableUrl(o.url) || typeof o.id !== "string" || !o.id.trim()) return null;
  const sourceDurationSec = Math.max(0.2, asFiniteNumber(o.sourceDurationSec, 8));
  const sourceInSec = Math.max(0, asFiniteNumber(o.sourceInSec, 0));
  const sourceOutSec = Math.min(
    sourceDurationSec,
    Math.max(sourceInSec + 0.2, asFiniteNumber(o.sourceOutSec, sourceDurationSec)),
  );
  return {
    id: o.id.trim(),
    url: o.url.trim(),
    label: typeof o.label === "string" ? o.label : undefined,
    sourceInSec,
    sourceOutSec,
    sourceDurationSec,
  };
}

function parseVoClip(raw: unknown): VoClip | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isPersistableUrl(o.audioUrl) || typeof o.id !== "string" || !o.id.trim()) {
    return null;
  }
  return {
    id: o.id.trim(),
    audioUrl: o.audioUrl.trim(),
    startSec: Math.max(0, asFiniteNumber(o.startSec, 0)),
    durationSec: Math.max(0.1, asFiniteNumber(o.durationSec, 1)),
    label: typeof o.label === "string" ? o.label : undefined,
  };
}

function parseAiMusicTrack(raw: unknown): AiMusicTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    !o.id.trim() ||
    typeof o.label !== "string" ||
    !isPersistableUrl(o.audioUrl)
  ) {
    return null;
  }
  return { id: o.id.trim(), label: o.label, audioUrl: o.audioUrl.trim() };
}

function parseVoicePreview(raw: unknown): VoicePreviewTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    !o.id.trim() ||
    typeof o.label !== "string" ||
    typeof o.presetId !== "string" ||
    !isPersistableUrl(o.audioUrl)
  ) {
    return null;
  }
  return {
    id: o.id.trim(),
    label: o.label,
    presetId: o.presetId,
    audioUrl: o.audioUrl.trim(),
    durationSec:
      typeof o.durationSec === "number" && Number.isFinite(o.durationSec)
        ? o.durationSec
        : undefined,
  };
}

/** Strip blob:/file-only media before Mongo persistence. */
export function serializeCaptionStudioSnapshot(
  input: CaptionStudioSnapshotInput,
): CaptionStudioSnapshot {
  const timelineClips = input.timelineClips.filter((c) => isPersistableUrl(c.url));
  const voClips = input.voClips.filter((c) => isPersistableUrl(c.audioUrl));
  const aiMusicTracks = input.aiMusicTracks.filter((t) =>
    isPersistableUrl(t.audioUrl),
  );
  const voicePreviewTracks = input.voicePreviewTracks.filter((t) =>
    isPersistableUrl(t.audioUrl),
  );
  const selectedAi =
    input.selectedAiMusicId &&
    aiMusicTracks.some((t) => t.id === input.selectedAiMusicId)
      ? input.selectedAiMusicId
      : null;
  const selectedVoPreview =
    input.selectedVoicePreviewId &&
    voicePreviewTracks.some((t) => t.id === input.selectedVoicePreviewId)
      ? input.selectedVoicePreviewId
      : null;

  return {
    version: 1,
    sourceLabel: input.sourceLabel?.trim() || undefined,
    sourceUrl: isPersistableUrl(input.sourceUrl) ? input.sourceUrl : null,
    originalSourceUrl: isPersistableUrl(input.originalSourceUrl)
      ? input.originalSourceUrl
      : null,
    processedVideoUrl: isPersistableUrl(input.processedVideoUrl)
      ? input.processedVideoUrl
      : null,
    refImageUrl: isPersistableUrl(input.refImageUrl) ? input.refImageUrl : null,
    timelineClips,
    captionLines: input.captionLines
      .map((l) => parseCaptionLine(l))
      .filter((l): l is CaptionLine => Boolean(l)),
    defaultStylePreset: isCaptionStylePresetId(input.defaultStylePreset)
      ? input.defaultStylePreset
      : "classic",
    captionMode: CAPTION_MODES.has(input.captionMode) ? input.captionMode : "pure",
    bgmTrack: BGM_TRACKS.has(input.bgmTrack) ? input.bgmTrack : DEFAULT_BGM_TRACK,
    bgmStartSec: Math.max(0, asFiniteNumber(input.bgmStartSec, 0)),
    bgmDurationSec:
      input.bgmDurationSec == null
        ? null
        : Math.max(0.2, asFiniteNumber(input.bgmDurationSec, 0.2)),
    replaceSourceAudio: Boolean(input.replaceSourceAudio),
    bgmVolume: Math.min(1, Math.max(0, asFiniteNumber(input.bgmVolume, 0.55))),
    underVoiceBgmVolume: Math.min(
      1,
      Math.max(0, asFiniteNumber(input.underVoiceBgmVolume, 0.14)),
    ),
    voiceVolume: Math.min(5, Math.max(0, asFiniteNumber(input.voiceVolume, 2.1))),
    voiceoverEnabled: Boolean(input.voiceoverEnabled),
    voiceoverScript: asString(input.voiceoverScript),
    voiceoverLocale: VO_LOCALES.has(input.voiceoverLocale)
      ? input.voiceoverLocale
      : "hk",
    voClips,
    musicSource: MUSIC_SOURCES.has(input.musicSource) ? input.musicSource : "ai",
    musicTopic: asString(input.musicTopic),
    musicMood: MUSIC_MOODS.has(input.musicMood) ? input.musicMood : "auto",
    matchMusicToVideo: Boolean(input.matchMusicToVideo),
    aiMusicTracks,
    selectedAiMusicId: selectedAi,
    voicePreviewTracks,
    selectedVoicePreviewId: selectedVoPreview,
    playheadSec: Math.max(0, asFiniteNumber(input.playheadSec, 0)),
    captionsBurnedInPlate: Boolean(input.captionsBurnedInPlate),
  };
}

/** Validate API / Mongo payload; returns null if unusable. */
export function parseCaptionStudioSnapshot(
  raw: unknown,
): CaptionStudioSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (!Array.isArray(o.timelineClips) || !Array.isArray(o.captionLines)) return null;

  const timelineClips = o.timelineClips
    .map(parseTimelineClip)
    .filter((c): c is TimelineClip => Boolean(c));
  // Allow caption-only packs (words) without clips — user can reattach video later.
  const captionLines = o.captionLines
    .map(parseCaptionLine)
    .filter((l): l is CaptionLine => Boolean(l));

  const bgmTrack =
    typeof o.bgmTrack === "string" && BGM_TRACKS.has(o.bgmTrack as BgmTrackId)
      ? (o.bgmTrack as BgmTrackId)
      : DEFAULT_BGM_TRACK;
  const defaultStylePreset =
    typeof o.defaultStylePreset === "string" &&
    isCaptionStylePresetId(o.defaultStylePreset)
      ? o.defaultStylePreset
      : "classic";
  const captionMode =
    typeof o.captionMode === "string" && CAPTION_MODES.has(o.captionMode as CaptionMode)
      ? (o.captionMode as CaptionMode)
      : "pure";
  const voiceoverLocale =
    typeof o.voiceoverLocale === "string" &&
    VO_LOCALES.has(o.voiceoverLocale as VoiceoverLocale)
      ? (o.voiceoverLocale as VoiceoverLocale)
      : "hk";
  const musicSource =
    typeof o.musicSource === "string" &&
    MUSIC_SOURCES.has(o.musicSource as CaptionMusicSource)
      ? (o.musicSource as CaptionMusicSource)
      : "ai";
  const musicMood =
    typeof o.musicMood === "string" && MUSIC_MOODS.has(o.musicMood as MusicMood)
      ? (o.musicMood as MusicMood)
      : "auto";

  const voClips = Array.isArray(o.voClips)
    ? o.voClips.map(parseVoClip).filter((c): c is VoClip => Boolean(c))
    : [];
  const aiMusicTracks = Array.isArray(o.aiMusicTracks)
    ? o.aiMusicTracks
        .map(parseAiMusicTrack)
        .filter((t): t is AiMusicTrack => Boolean(t))
    : [];
  const voicePreviewTracks = Array.isArray(o.voicePreviewTracks)
    ? o.voicePreviewTracks
        .map(parseVoicePreview)
        .filter((t): t is VoicePreviewTrack => Boolean(t))
    : [];

  const selectedAiMusicId =
    typeof o.selectedAiMusicId === "string" &&
    aiMusicTracks.some((t) => t.id === o.selectedAiMusicId)
      ? o.selectedAiMusicId
      : null;
  const selectedVoicePreviewId =
    typeof o.selectedVoicePreviewId === "string" &&
    voicePreviewTracks.some((t) => t.id === o.selectedVoicePreviewId)
      ? o.selectedVoicePreviewId
      : null;

  return {
    version: 1,
    sourceLabel:
      typeof o.sourceLabel === "string" && o.sourceLabel.trim()
        ? o.sourceLabel.trim()
        : undefined,
    sourceUrl: isPersistableUrl(o.sourceUrl) ? o.sourceUrl : null,
    originalSourceUrl: isPersistableUrl(o.originalSourceUrl)
      ? o.originalSourceUrl
      : null,
    processedVideoUrl: isPersistableUrl(o.processedVideoUrl)
      ? o.processedVideoUrl
      : null,
    refImageUrl: isPersistableUrl(o.refImageUrl) ? o.refImageUrl : null,
    timelineClips,
    captionLines,
    defaultStylePreset,
    captionMode,
    bgmTrack,
    bgmStartSec: Math.max(0, asFiniteNumber(o.bgmStartSec, 0)),
    bgmDurationSec:
      o.bgmDurationSec == null
        ? null
        : Math.max(0.2, asFiniteNumber(o.bgmDurationSec, 0.2)),
    replaceSourceAudio: Boolean(o.replaceSourceAudio),
    bgmVolume: Math.min(1, Math.max(0, asFiniteNumber(o.bgmVolume, 0.55))),
    underVoiceBgmVolume: Math.min(
      1,
      Math.max(0, asFiniteNumber(o.underVoiceBgmVolume, 0.14)),
    ),
    voiceVolume: Math.min(5, Math.max(0, asFiniteNumber(o.voiceVolume, 2.1))),
    voiceoverEnabled: o.voiceoverEnabled !== false,
    voiceoverScript: asString(o.voiceoverScript),
    voiceoverLocale,
    voClips,
    musicSource,
    musicTopic: asString(o.musicTopic),
    musicMood,
    matchMusicToVideo: o.matchMusicToVideo !== false,
    aiMusicTracks,
    selectedAiMusicId,
    voicePreviewTracks,
    selectedVoicePreviewId,
    playheadSec: Math.max(0, asFiniteNumber(o.playheadSec, 0)),
    captionsBurnedInPlate: Boolean(o.captionsBurnedInPlate),
  };
}

export function captionStudioPackSummary(snapshot: CaptionStudioSnapshot): {
  captionCount: number;
  clipCount: number;
} {
  return {
    captionCount: snapshot.captionLines.length,
    clipCount: snapshot.timelineClips.length,
  };
}
