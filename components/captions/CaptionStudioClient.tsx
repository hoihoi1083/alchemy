"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CaptionLineEditor } from "@/components/captions/CaptionLineEditor";
import { CaptionTimelineL2 } from "@/components/captions/CaptionTimelineL2";
import {
  CaptionAudioSection,
  type MusicSource,
} from "@/components/captions/CaptionAudioSection";
import { useLocale } from "@/components/LocaleProvider";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import type { MusicMood } from "@/lib/ad-pack-preferences";
import type {
  AiMusicTrack,
  CaptionLine,
  VoicePreviewTrack,
} from "@/lib/ad-pack-types";
import { captionSpeakText } from "@/lib/ad-pack-types";
import { DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
import {
  CAPTION_STYLE_PRESETS,
  CAPTION_STYLE_PRESET_IDS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import {
  clearCaptionHandoff,
  defaultCaptionLines,
  readCaptionDraft,
  readCaptionHandoff,
  writeCaptionDraft,
} from "@/lib/caption-studio-draft";
import { toRelativePipelineUrl, withCacheBust, toBeatAnalysisUrl } from "@/lib/caption-studio-url";
import {
  captionLinesFromVoiceScript,
  captionVoiceStartSec,
  probeAudioDurationSec,
  splitCaptionLinesOverDuration,
} from "@/lib/caption-voice-timing";
import { alignCaptionsToBeats } from "@/lib/beat-detect";
import { resolveCaptionStudioMusicPrompt } from "@/lib/caption-music-prompt";
import { isPipelineFileUrl } from "@/lib/pipeline/safe-url";

type SourceKind = "file" | "url";

async function downloadVideoBlob(url: string, filename: string) {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

async function postVideoJson(
  endpoint: string,
  videoUrl: string,
  body: Record<string, unknown>,
) {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ video_url: videoUrl, ...body }),
  });
}

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (
      res.status === 413 ||
      /request entity too large|payload too large|entity too large/i.test(text)
    ) {
      return {
        error:
          "Video too large for the server upload limit. Uploading via direct storage and retrying should fix this — refresh if you still see this.",
        code: "REQUEST_TOO_LARGE",
      };
    }
    return { error: text.slice(0, 160) || "Request failed." };
  }
}

/** Upload a local File — prefer direct R2 PUT; fall back to same-origin server upload when CORS blocks. */
async function uploadVideoFileToLibrary(file: File): Promise<string> {
  const presignRes = await fetch("/api/library/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: "video",
      contentType: file.type || "video/mp4",
      name: file.name || "caption-studio-upload",
      sizeBytes: file.size,
    }),
  });
  const presign = await readApiJson(presignRes);
  if (!presignRes.ok || typeof presign.uploadUrl !== "string" || typeof presign.downloadUrl !== "string") {
    throw new Error(
      typeof presign.error === "string" ? presign.error : "Upload prep failed.",
    );
  }

  try {
    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "video/mp4" },
      body: file,
    });
    if (putRes.ok) return presign.downloadUrl as string;
    // Non-OK response (not CORS) — try server fallback below.
    console.warn("[captions] R2 PUT status", putRes.status);
  } catch (e: unknown) {
    // Browser CORS / network → TypeError: Failed to fetch
    console.warn(
      "[captions] R2 PUT failed, falling back to server upload:",
      e instanceof Error ? e.message : e,
    );
  }

  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", "video");
  const proxyRes = await fetch("/api/library/upload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const proxy = await readApiJson(proxyRes);
  if (!proxyRes.ok || typeof proxy.downloadUrl !== "string") {
    const hint =
      typeof proxy.error === "string"
        ? proxy.error
        : "Video upload failed. If you see Failed to fetch, add PUT CORS on the R2 bucket for this site (localhost + alchemyailab.com).";
    throw new Error(hint);
  }
  return proxy.downloadUrl;
}

export function CaptionStudioClient() {
  const { m, locale } = useLocale();
  const t = m.captions;
  const ad = m.wizard.adPack;
  const searchParams = useSearchParams();

  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [videoReloadKey, setVideoReloadKey] = useState(0);
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>(defaultCaptionLines());
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [videoDuration, setVideoDuration] = useState(8);
  const [videoTrimIn, setVideoTrimIn] = useState(0);
  const [videoTrimOut, setVideoTrimOut] = useState(8);
  const [beatMarkers, setBeatMarkers] = useState<number[]>([]);
  const [snapToBeats, setSnapToBeats] = useState(true);
  const [beatStatus, setBeatStatus] = useState<string | null>(null);
  const [beatBusy, setBeatBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const [musicTopic, setMusicTopic] = useState("");
  const [musicMood, setMusicMood] = useState<MusicMood>("auto");
  const [musicSource, setMusicSource] = useState<MusicSource>("ai");
  const [bgmTrack, setBgmTrack] = useState<BgmTrackId>(DEFAULT_BGM_TRACK);
  const [aiMusicTracks, setAiMusicTracks] = useState<AiMusicTrack[]>([]);
  const [selectedAiMusicId, setSelectedAiMusicId] = useState<string | null>(null);
  const [musicGenerateBusy, setMusicGenerateBusy] = useState(false);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [voiceoverScript, setVoiceoverScript] = useState("");
  const [voiceoverLocale, setVoiceoverLocale] = useState<VoiceoverLocale>("hk");
  const [voicePreviewTracks, setVoicePreviewTracks] = useState<VoicePreviewTrack[]>([]);
  const [selectedVoicePreviewId, setSelectedVoicePreviewId] = useState<string | null>(null);
  const [voicePreviewBusy, setVoicePreviewBusy] = useState(false);
  const [planCaptionVoiceBusy, setPlanCaptionVoiceBusy] = useState(false);
  const [expandSpokenBusy, setExpandSpokenBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [defaultStylePreset, setDefaultStylePreset] =
    useState<CaptionStylePresetId>("classic");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const sourceKey = sourceFile
    ? `file:${sourceFile.name}:${sourceFile.size}`
    : sourceUrl
      ? `url:${sourceUrl}`
      : "";

  const styleOptions = useMemo(
    () =>
      CAPTION_STYLE_PRESET_IDS.map((id) => ({
        id,
        label: locale === "en" ? CAPTION_STYLE_PRESETS[id].labelEn : CAPTION_STYLE_PRESETS[id].labelZh,
      })),
    [locale],
  );

  const bgmOptions: { id: BgmTrackId; label: string }[] = [
    { id: "calm", label: m.wizard.bgmCalm },
    { id: "upbeat", label: m.wizard.bgmUpbeat },
    { id: "warm", label: m.wizard.bgmWarm },
  ];

  const displayVideoSrc = playbackUrl ?? localPreviewUrl;

  async function materializePlaybackBlob(pipelineUrl: string): Promise<string> {
    const rel = toRelativePipelineUrl(pipelineUrl);
    const res = await fetch(withCacheBust(rel), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      let message = t.previewLoadFailed;
      try {
        const data = await res.json();
        if (data.error) message = data.error;
      } catch {
        /* not json */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    if (blob.size < 1024) {
      throw new Error(t.previewLoadFailed);
    }
    return URL.createObjectURL(blob);
  }

  async function commitProcessedVideo(pipelineUrl: string) {
    const rel = toRelativePipelineUrl(pipelineUrl);
    const blobUrl = await materializePlaybackBlob(rel);
    setProcessedVideoUrl(rel);
    setPlaybackUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return blobUrl;
    });
    setVideoReloadKey((k) => k + 1);
  }

  function workingVideoInput(): { file: File | null; url: string | null } {
    if (processedVideoUrl) return { file: null, url: processedVideoUrl };
    if (sourceKind === "file" && sourceFile) return { file: sourceFile, url: null };
    if (sourceUrl) return { file: null, url: sourceUrl };
    return { file: null, url: null };
  }

  /** Prefer URL APIs — local Files are uploaded to R2 first (Vercel body limit ~4.5MB). */
  async function resolveWorkingVideoUrl(): Promise<string> {
    const input = workingVideoInput();
    if (input.url) return input.url;
    if (!input.file) throw new Error(t.needVideo);
    const downloadUrl = await uploadVideoFileToLibrary(input.file);
    const rel = toRelativePipelineUrl(downloadUrl);
    setProcessedVideoUrl(rel);
    setSourceUrl(rel);
    setSourceKind("url");
    setSourceFile(null);
    return rel;
  }

  const loadSource = useCallback(
    (kind: SourceKind, opts: { file?: File; url?: string; label?: string; lines?: CaptionLine[] }) => {
      if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl);
      if (playbackUrl?.startsWith("blob:")) URL.revokeObjectURL(playbackUrl);

      setProcessedVideoUrl(null);
      setPlaybackUrl(null);
      setVideoReloadKey(0);
      setAudioNote(null);
      setNote(null);
      setError(null);
      setSourceKind(kind);

      if (kind === "file" && opts.file) {
        setSourceFile(opts.file);
        setSourceUrl(null);
        setSourceLabel(opts.label ?? opts.file.name);
        setLocalPreviewUrl(URL.createObjectURL(opts.file));
      } else if (kind === "url" && opts.url) {
        setSourceFile(null);
        const rel = toRelativePipelineUrl(opts.url);
        setSourceUrl(rel);
        setSourceLabel(opts.label ?? t.sourceFromStudio);
        setLocalPreviewUrl(rel);
      }

      const key =
        kind === "file" && opts.file
          ? `file:${opts.file.name}:${opts.file.size}`
          : opts.url
            ? `url:${toRelativePipelineUrl(opts.url)}`
            : "";
      const draft = key ? readCaptionDraft(key) : null;
      setCaptionLines(opts.lines ?? draft ?? defaultCaptionLines());
    },
    [localPreviewUrl, t.sourceFromStudio],
  );

  useEffect(() => {
    const handoff = readCaptionHandoff();
    const videoParam = searchParams.get("video")?.trim();
    const url = handoff?.videoUrl ?? videoParam ?? null;
    if (url) {
      loadSource("url", {
        url,
        label: handoff?.label,
        lines: handoff?.captionLines,
      });
      clearCaptionHandoff();
    }
  }, [searchParams, loadSource]);

  useEffect(() => {
    if (!sourceKey) return;
    writeCaptionDraft(sourceKey, captionLines);
  }, [sourceKey, captionLines]);

  useEffect(() => {
    const raw = processedVideoUrl || sourceUrl || playbackUrl;
    const analyzable = toBeatAnalysisUrl(raw);
    if (!analyzable) {
      setBeatMarkers([]);
      setBeatStatus(t.beatStatusUnavailable);
      return;
    }

    let cancelled = false;
    setBeatBusy(true);
    setBeatStatus(t.beatStatusAnalyzing);
    void fetch("/api/analyze-beats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ video_url: analyzable }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.beats) && data.beats.length > 0) {
          setBeatMarkers(data.beats as number[]);
          setBeatStatus(
            t.beatStatusReady.replace("{n}", String(data.beats.length)),
          );
        } else {
          setBeatMarkers([]);
          setBeatStatus(t.beatStatusEmpty);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setBeatMarkers([]);
        setBeatStatus(t.beatStatusEmpty);
      })
      .finally(() => {
        if (!cancelled) setBeatBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [processedVideoUrl, sourceUrl, playbackUrl, t.beatStatusAnalyzing, t.beatStatusEmpty, t.beatStatusReady, t.beatStatusUnavailable]);

  function alignCaptionsToDetectedBeats() {
    if (!beatMarkers.length) {
      setError(t.beatAlignNeedBeats);
      return;
    }
    setCaptionLines((prev) => alignCaptionsToBeats(prev, beatMarkers, videoDuration));
    setNote(t.beatAlignDone.replace("{n}", String(beatMarkers.length)));
    setError(null);
  }

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(localPreviewUrl);
      if (playbackUrl?.startsWith("blob:")) URL.revokeObjectURL(playbackUrl);
    };
  }, [localPreviewUrl, playbackUrl]);

  function onFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError(t.invalidVideoType);
      return;
    }
    loadSource("file", { file });
  }

  function updateCaptionLine(index: number, patch: Partial<CaptionLine>) {
    setCaptionLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addCaptionLine() {
    const last = captionLines[captionLines.length - 1];
    const start = last ? last.endSec : 0;
    const end = Math.min(videoDuration, start + 2.5);
    setCaptionLines((prev) => [
      ...prev,
      {
        startSec: start,
        endSec: end,
        text: "",
        position: prev.length % 2 === 0 ? "bottom" : "top",
        stylePreset: defaultStylePreset,
      },
    ]);
  }

  function addTopLineSameTiming() {
    const anchor = captionLines[0];
    if (!anchor) {
      addCaptionLine();
      return;
    }
    setCaptionLines((prev) => [
      ...prev,
      {
        startSec: anchor.startSec,
        endSec: Math.min(videoDuration, anchor.endSec),
        text: "",
        position: "top",
        stylePreset: defaultStylePreset,
      },
    ]);
  }

  function removeCaptionLine(index: number) {
    setCaptionLines((prev) => prev.filter((_, i) => i !== index));
  }

  function splitEvenly() {
    setCaptionLines((prev) => splitCaptionLinesOverDuration(prev, videoDuration));
  }

  async function fitCaptionsToVoice() {
    const selected =
      voicePreviewTracks.find((tr) => tr.id === selectedVoicePreviewId) ??
      voicePreviewTracks[0];
    if (!selected?.audioUrl) {
      setError(t.fitCaptionsNeedVoice);
      return;
    }
    const voiceSec = await probeAudioDurationSec(selected.audioUrl);
    if (voiceSec < 0.5) {
      setError(t.fitCaptionsNeedVoice);
      return;
    }
    setCaptionLines((prev) => splitCaptionLinesOverDuration(prev, voiceSec));
    setAudioNote(t.fitCaptionsToVoiceDone.replace("{sec}", voiceSec.toFixed(1)));
    setError(null);
  }

  async function generateAiMusicTracks() {
    const promptEn = resolveCaptionStudioMusicPrompt({
      productBrief: musicTopic,
      musicMood,
      durationSec: Math.round(videoDuration),
    });
    setMusicGenerateBusy(true);
    setError(null);
    setAudioNote(null);
    try {
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          promptEn,
          durationSec: Math.round(videoDuration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.musicGenerateFailed);
      const tracks = (data.tracks ?? []) as AiMusicTrack[];
      if (tracks.length === 0) throw new Error(m.errors.musicGenerateFailed);
      setAiMusicTracks(tracks);
      setSelectedAiMusicId(tracks[0]?.id ?? null);
      setMusicSource("ai");
      setAudioNote(t.aiMusicGeneratedNote.replace("{count}", String(tracks.length)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : m.errors.musicGenerateFailed);
    } finally {
      setMusicGenerateBusy(false);
    }
  }

  async function generateVoicePreviews(scriptOverride?: string) {
    const script = (scriptOverride ?? voiceoverScript).trim();
    if (!script) return;
    setVoicePreviewBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/preview-script-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ script, locale: voiceoverLocale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.voiceoverFailed);
      const tracks = (data.tracks ?? []) as VoicePreviewTrack[];
      // Library audio needs cookies; materialize to blob so <audio> always plays.
      const playable: VoicePreviewTrack[] = [];
      for (const track of tracks) {
        const url = track.audioUrl?.trim();
        if (!url) continue;
        if (url.startsWith("/api/library/") || url.includes("/api/library/download/")) {
          try {
            const audioRes = await fetch(withCacheBust(url), {
              credentials: "include",
              cache: "no-store",
            });
            if (!audioRes.ok) throw new Error(`audio ${audioRes.status}`);
            const blob = await audioRes.blob();
            playable.push({ ...track, audioUrl: URL.createObjectURL(blob) });
            continue;
          } catch {
            /* fall through to raw URL */
          }
        }
        playable.push(track);
      }
      setVoicePreviewTracks((prev) => {
        for (const t of prev) {
          if (t.audioUrl?.startsWith("blob:")) URL.revokeObjectURL(t.audioUrl);
        }
        return playable;
      });
      setSelectedVoicePreviewId(playable[0]?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : m.errors.voiceoverFailed);
    } finally {
      setVoicePreviewBusy(false);
    }
  }

  function syncCaptionsFromVoiceScript() {
    const script = voiceoverScript.trim();
    if (!script) {
      setError(t.syncCaptionsNeedScript);
      setAudioNote(null);
      return;
    }
    const lines = captionLinesFromVoiceScript(script, videoDuration, {
      stylePreset: defaultStylePreset,
    });
    if (!lines.length) {
      setError(t.syncCaptionsNeedScript);
      return;
    }
    setCaptionLines(lines);
    setSelectedCaptionIndex(0);
    setVoiceoverEnabled(true);
    setError(null);
    setAudioNote(
      t.syncCaptionsFromVoiceDone
        .replaceAll("{n}", String(lines.length))
        .replaceAll("{sec}", videoDuration.toFixed(1)),
    );
  }

  async function applyBgm() {
    if (!workingVideoInput().file && !workingVideoInput().url) {
      setError(t.needVideo);
      return;
    }

    setAudioBusy(true);
    setError(null);
    setAudioNote(null);

    try {
      const selectedAi = aiMusicTracks.find((tr) => tr.id === selectedAiMusicId);
      if (musicSource === "ai") {
        if (aiMusicTracks.length === 0) {
          throw new Error(t.aiMusicGenerateFirst);
        }
        if (!selectedAi?.audioUrl) {
          throw new Error(t.aiMusicSelectTrack);
        }
      }

      const videoUrl = await resolveWorkingVideoUrl();
      const body: Record<string, unknown> = { replace_source_audio: true };
      if (musicSource === "ai" && selectedAi?.audioUrl) {
        body.music_url = selectedAi.audioUrl;
      } else {
        body.track = bgmTrack;
      }
      const res = await postVideoJson("/api/add-bgm", videoUrl, body);
      const data = await readApiJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? t.burnFailed);
      await commitProcessedVideo(data.videoUrl as string);
      previewVideoRef.current?.load();
      setAudioNote(t.audioBgmDone);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setAudioBusy(false);
    }
  }

  async function applyVoiceover() {
    const script = voiceoverScript.trim();
    const timedCaptionLines = captionLines.filter((l) => l.text.trim());
    const selectedPreview = voicePreviewTracks.find((tr) => tr.id === selectedVoicePreviewId);
    // Need 2+ timed caption lines — otherwise we'd only reuse the single preview clip.
    if (timedCaptionLines.length < 2) {
      setError(t.audioVoiceNeedCaptionLines.replace("{n}", String(timedCaptionLines.length)));
      return;
    }
    if (!script && !selectedPreview) {
      setError(t.audioVoiceNeedPreviewOrScript);
      return;
    }
    if (!workingVideoInput().file && !workingVideoInput().url) {
      setError(t.needVideo);
      return;
    }

    setAudioBusy(true);
    setError(null);
    setAudioNote(null);

    try {
      const speechStartSec = captionVoiceStartSec(captionLines);
      const captionPayload = timedCaptionLines.map((l) => ({
        text: l.text.trim(),
        startSec: l.startSec,
        endSec: l.endSec,
        ...(l.spokenText?.trim() ? { spokenText: l.spokenText.trim() } : {}),
      }));
      // Never send speech_url for multi-caption — preview is voice pick only.
      const voiceBody: Record<string, unknown> = {
        locale: voiceoverLocale,
        target_duration_sec: videoDuration,
        speech_start_sec: speechStartSec,
        caption_lines: captionPayload,
      };
      if (selectedPreview) voiceBody.voice_preset = selectedPreview.presetId;
      else if (script) voiceBody.script = script;

      const videoUrl = await resolveWorkingVideoUrl();
      const res = await postVideoJson("/api/dub-script-voice", videoUrl, voiceBody);
      const data = await readApiJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? t.burnFailed);
      await commitProcessedVideo(data.videoUrl as string);
      previewVideoRef.current?.load();
      const clipCount = Number(data.clipCount) || timedCaptionLines.length;
      if (data.perCaption && clipCount >= 2) {
        setAudioNote(t.audioVoiceDonePerCaption.replace("{n}", String(clipCount)));
      } else {
        // Server fell back somehow — surface that clearly.
        setError(
          t.audioVoiceSingleClipFallback.replace(
            "{n}",
            String(timedCaptionLines.length),
          ),
        );
        setAudioNote(
          speechStartSec > 0.05
            ? t.audioVoiceDoneAtCaption.replace("{sec}", speechStartSec.toFixed(1))
            : t.audioVoiceDone,
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setAudioBusy(false);
    }
  }

  function fillVoiceFromCaptions() {
    const text = captionLines
      .map((l) => captionSpeakText(l))
      .filter(Boolean)
      .join("，");
    if (text) setVoiceoverScript(text);
  }

  async function expandSpokenToFitCaptions() {
    const lines = captionLines.filter((l) => l.text.trim());
    if (!lines.length) {
      setError(t.expandCaptionVoiceNeedLines);
      return;
    }
    setExpandSpokenBusy(true);
    setError(null);
    setAudioNote(null);
    try {
      const res = await fetch("/api/expand-spoken-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caption_lines: lines.map((l) => ({
            text: l.text.trim(),
            startSec: l.startSec,
            endSec: l.endSec,
            ...(l.spokenText?.trim() ? { spokenText: l.spokenText.trim() } : {}),
          })),
          locale: voiceoverLocale,
          product: musicTopic.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t.expandCaptionVoiceFailed,
        );
      }
      const next = (data.captionLines ?? []) as CaptionLine[];
      if (!next.length) throw new Error(t.expandCaptionVoiceFailed);

      setCaptionLines((prev) => {
        let ni = 0;
        return prev.map((line) => {
          if (!line.text.trim()) return line;
          const got = next[ni++];
          const spoken = String(got?.spokenText ?? "").trim();
          return spoken ? { ...line, spokenText: spoken } : line;
        });
      });

      const script =
        typeof data.voiceoverScript === "string" && data.voiceoverScript.trim()
          ? data.voiceoverScript.trim()
          : next.map((l) => captionSpeakText(l)).filter(Boolean).join("，");
      if (script) {
        setVoiceoverScript(script);
        setVoiceoverEnabled(true);
        await generateVoicePreviews(script);
      }
      const n = Number(data.lineCount) || next.length;
      setAudioNote(
        t.expandCaptionVoiceDone
          .replaceAll("{n}", String(n))
          .replaceAll("{sec}", videoDuration.toFixed(1)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.expandCaptionVoiceFailed);
      setAudioNote(null);
    } finally {
      setExpandSpokenBusy(false);
    }
  }

  async function planCaptionsAndVoiceFromTopic() {
    const topic = musicTopic.trim();
    if (!topic) {
      setError(t.planCaptionVoiceNeedTopic);
      return;
    }
    if (!sourceKind) {
      setError(t.needVideo);
      return;
    }

    setPlanCaptionVoiceBusy(true);
    setError(null);
    setAudioNote(null);
    try {
      const res = await fetch("/api/plan-caption-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic,
          locale: voiceoverLocale,
          video_duration_sec: videoDuration,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t.planCaptionVoiceFailed,
        );
      }
      const lines = (data.captionLines ?? []) as CaptionLine[];
      if (!lines.length) throw new Error(t.planCaptionVoiceFailed);

      setCaptionLines(
        lines.map((line, i) => {
          const text = String(line.text ?? "").trim();
          const spoken = String(line.spokenText ?? "").trim();
          return {
            startSec: Math.max(0, Number(line.startSec) || 0),
            endSec: Math.max(
              Number(line.startSec) || 0,
              Number(line.endSec) || (Number(line.startSec) || 0) + 2,
            ),
            text,
            ...(spoken ? { spokenText: spoken } : {}),
            position: line.position ?? (i % 2 === 0 ? "bottom" : "top"),
            stylePreset: line.stylePreset ?? defaultStylePreset,
          };
        }),
      );
      const script =
        typeof data.voiceoverScript === "string" && data.voiceoverScript.trim()
          ? data.voiceoverScript.trim()
          : lines.map((l) => captionSpeakText(l)).filter(Boolean).join("，");
      if (script) setVoiceoverScript(script);
      setVoiceoverEnabled(true);
      setVoicePreviewTracks([]);
      setSelectedVoicePreviewId(null);
      setSelectedCaptionIndex(0);
      const n = Number(data.lineCount) || lines.length;
      setAudioNote(
        t.planCaptionVoiceDone
          .replaceAll("{n}", String(n))
          .replaceAll("{sec}", videoDuration.toFixed(1)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.planCaptionVoiceFailed);
      setAudioNote(null);
    } finally {
      setPlanCaptionVoiceBusy(false);
    }
  }

  async function applyCaptions() {
    const lines = captionLines.filter((l) => l.text.trim());
    if (!sourceKind || (!sourceFile && !sourceUrl && !processedVideoUrl)) {
      setError(t.needVideo);
      return;
    }
    if (lines.length === 0) {
      setError(t.needCaptionText);
      return;
    }

    setBusy(true);
    setError(null);
    setNote(null);

    const captionStyle = { preset: defaultStylePreset };

    try {
      let videoUrl = await resolveWorkingVideoUrl();
      const needsTrim = videoTrimIn > 0.05 || videoTrimOut < videoDuration - 0.05;
      if (needsTrim) {
        const trimFd = new FormData();
        trimFd.set("video_url", videoUrl);
        trimFd.set("trim_in_sec", String(videoTrimIn));
        trimFd.set("trim_out_sec", String(videoTrimOut));
        const trimRes = await fetch("/api/trim-video", {
          method: "POST",
          credentials: "include",
          body: trimFd,
        });
        const trimData = await readApiJson(trimRes);
        if (!trimRes.ok) throw new Error((trimData.error as string) ?? t.trimFailed);
        videoUrl = trimData.videoUrl as string;
      }

      const res = await postVideoJson("/api/burn-script-captions", videoUrl, {
        caption_lines: lines,
        caption_style: captionStyle,
      });
      const data = await readApiJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? t.burnFailed);

      await commitProcessedVideo(data.videoUrl as string);
      previewVideoRef.current?.load();

      if (data.softSubtitles) {
        setNote(t.softTrackNote);
        setError(t.softTrackError);
      } else if (data.burnMethod === "overlay" || data.burnMethod === "drawtext") {
        setNote(t.appliedNote);
      } else {
        setNote(t.appliedLegacyNote);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setBusy(false);
    }
  }

  function resetToSource() {
    setProcessedVideoUrl(null);
    setPlaybackUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoReloadKey((k) => k + 1);
    setNote(null);
    setAudioNote(null);
    if (sourceKind === "file" && sourceFile) {
      setLocalPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(sourceFile);
      });
    } else if (sourceUrl) {
      setLocalPreviewUrl(sourceUrl);
    }
  }

  const finalDownloadUrl = processedVideoUrl;

  const hasWorkspace = Boolean(displayVideoSrc && sourceKind);
  const workspaceVideoSrc = displayVideoSrc ?? "";

  return (
    <div className="space-y-6">
      {!hasWorkspace ? (
        <div className="flex min-h-[min(56vh,520px)] items-center justify-center px-2 py-8">
          <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center shadow-xl">
            <h2 className="text-xl font-semibold text-white">{t.uploadTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{t.uploadHint}</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                {t.chooseFile}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
              {sourceLabel && (
                <span className="text-xs text-slate-400">{sourceLabel}</span>
              )}
            </div>
            {sourceUrl && isPipelineFileUrl(sourceUrl) && (
              <p className="mt-3 text-xs text-emerald-300">{t.pipelineSourceNote}</p>
            )}
          </section>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-300"
          >
            {t.changeVideo}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {hasWorkspace && error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      {hasWorkspace && (
        <div className="grid gap-5 pb-24 xl:grid-cols-[minmax(300px,1fr)_minmax(280px,400px)_minmax(300px,1fr)] xl:items-start xl:pb-0">
          {/* Mobile: preview first. Desktop xl: audio | preview | lines (order restored). */}
          <div className="order-2 xl:order-1 xl:min-w-0">
          <CaptionAudioSection
            disabled={!sourceKind}
            audioBusy={audioBusy}
            captionBusy={busy}
            musicTopic={musicTopic}
            onMusicTopicChange={setMusicTopic}
            musicMood={musicMood}
            onMusicMoodChange={setMusicMood}
            musicSource={musicSource}
            onMusicSourceChange={setMusicSource}
            bgmTrack={bgmTrack}
            onBgmTrackChange={setBgmTrack}
            bgmOptions={bgmOptions}
            aiMusicTracks={aiMusicTracks}
            selectedAiMusicId={selectedAiMusicId}
            onSelectAiMusic={setSelectedAiMusicId}
            musicGenerateBusy={musicGenerateBusy}
            onGenerateAiMusic={() => void generateAiMusicTracks()}
            aiMusicGenerateFirstHint={t.aiMusicGenerateFirst}
            onApplyBgm={() => void applyBgm()}
            voiceoverEnabled={voiceoverEnabled}
            onVoiceoverEnabledChange={setVoiceoverEnabled}
            voiceoverScript={voiceoverScript}
            onVoiceoverScriptChange={setVoiceoverScript}
            voiceoverLocale={voiceoverLocale}
            onVoiceoverLocaleChange={setVoiceoverLocale}
            voicePreviewTracks={voicePreviewTracks}
            selectedVoicePreviewId={selectedVoicePreviewId}
            onSelectVoicePreview={setSelectedVoicePreviewId}
            voicePreviewBusy={voicePreviewBusy}
            onGenerateVoicePreviews={() => void generateVoicePreviews()}
            onApplyVoiceover={() => void applyVoiceover()}
            onFillVoiceFromCaptions={fillVoiceFromCaptions}
            onSyncCaptionsFromVoice={syncCaptionsFromVoiceScript}
            onPlanCaptionVoice={() => void planCaptionsAndVoiceFromTopic()}
            planCaptionVoiceBusy={planCaptionVoiceBusy}
            onExpandSpokenCaptions={() => void expandSpokenToFitCaptions()}
            expandSpokenBusy={expandSpokenBusy}
            captionLineCount={captionLines.filter((l) => l.text.trim()).length}
            audioNote={audioNote}
            audioError={error}
            labels={{
              title: t.audioTitle,
              hint: t.audioHint,
              planSection: t.planCaptionVoiceSection,
              planHint: t.planCaptionVoiceHint,
              planTopicLabel: t.planCaptionVoiceTopicLabel,
              planTopicPlaceholder: t.planCaptionVoiceTopicPlaceholder,
              planCaptionVoice: t.planCaptionVoice,
              planningCaptionVoice: t.planningCaptionVoice,
              planNeedTopic: t.planCaptionVoiceNeedTopic,
              musicSection: ad.musicSection,
              musicMoodLabel: ad.musicMoodLabel,
              musicMoods: ad.musicMoods,
              musicTopicLabel: t.musicTopicLabel,
              musicTopicPlaceholder: t.musicTopicPlaceholder,
              libraryMusic: ad.libraryMusic,
              aiMusic: ad.aiMusic,
              libraryDisclaimer: t.libraryBgmDisclaimer,
              generateMusic: ad.generateMusic,
              generatingMusic: ad.generatingMusic,
              generateMusicHint: t.aiMusicGenerateHint,
              trackLabel: ad.trackLabel,
              selectTrack: ad.selectTrack,
              selected: ad.selected,
              applyBgm: t.audioApplyBgm,
              applyingBgm: t.audioApplyingBgm,
              libraryPreviewLabel: t.libraryBgmPreviewLabel,
              voiceSection: ad.voiceSection,
              voicePreviewHint: t.audioVoicePerCaptionHint,
              generateVoice: ad.generateVoice,
              generatingVoice: ad.generatingVoice,
              voicePresets: ad.voicePresets,
              speakVoiceover: t.audioSpeakVoiceover,
              voicePlaceholder: t.audioVoicePlaceholder,
              applyVoice: t.audioApplyVoice,
              applyVoicePerCaption: t.audioApplyVoicePerCaption,
              applyingVoice: t.audioApplyingVoice,
              localeHk: t.audioLocaleHk,
              localeCn: t.audioLocaleCn,
              localeEn: t.audioLocaleEn,
              fillVoiceFromCaptions: t.fillVoiceFromCaptions,
              syncCaptionsFromVoice: t.syncCaptionsFromVoice,
              syncCaptionsNeedScript: t.syncCaptionsNeedScript,
              expandSpokenCaptions: t.expandCaptionVoice,
              expandingSpokenCaptions: t.expandingCaptionVoice,
            }}
          />
          </div>

          <section className="order-1 space-y-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-3 sm:p-4 xl:order-2 xl:sticky xl:top-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">{t.previewTitle}</h2>
              {processedVideoUrl && (
                <button
                  type="button"
                  onClick={resetToSource}
                  className="text-xs text-cyan-300 underline underline-offset-2"
                >
                  {t.showOriginal}
                </button>
              )}
            </div>
            <video
              ref={previewVideoRef}
              key={`${workspaceVideoSrc}-${videoReloadKey}`}
              src={workspaceVideoSrc}
              controls
              playsInline
              className="mx-auto aspect-9/16 w-full max-h-[min(48vh,420px)] rounded-2xl border border-slate-800 bg-black object-contain xl:max-h-[min(72vh,720px)]"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  setVideoDuration(dur);
                  setVideoTrimOut(dur);
                }
              }}
            />
            <p className="text-center text-xs text-slate-500">
              {t.durationLabel.replace("{sec}", videoDuration.toFixed(1))}
            </p>
            {processedVideoUrl && (
              <p className="text-center text-[11px] text-emerald-300/90">{t.previewProcessedHint}</p>
            )}
            {processedVideoUrl && (
              <p className="text-center text-[11px] text-amber-200/80">{t.previewAudioHint}</p>
            )}
          </section>

          <section className="order-3 space-y-3 rounded-3xl border border-violet-500/30 bg-violet-950/20 p-3 sm:p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-violet-50">{t.linesTitle}</h2>
                <p className="mt-1 hidden text-xs text-violet-200/80 sm:block">{t.linesHintPerLineStyle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!sourceKind || voicePreviewTracks.length === 0}
                  onClick={() => void fitCaptionsToVoice()}
                  className="rounded-full border border-cyan-400/50 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-900/40 disabled:opacity-50"
                >
                  {t.fitCaptionsToVoice}
                </button>
                <button
                  type="button"
                  disabled={!sourceKind}
                  onClick={splitEvenly}
                  className="rounded-full border border-violet-400/50 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/40 disabled:opacity-50"
                >
                  {t.splitEvenly}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-violet-200">{t.defaultStyleLabel}</label>
              <p className="mt-0.5 text-[11px] text-violet-200/70">{t.defaultStyleHint}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {styleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!sourceKind || busy}
                    onClick={() => setDefaultStylePreset(opt.id)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      defaultStylePreset === opt.id
                        ? "bg-violet-600 text-white"
                        : "border border-violet-400/40 text-violet-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <CaptionTimelineL2
              durationSec={videoDuration}
              lines={captionLines}
              selectedIndex={selectedCaptionIndex}
              videoTrimIn={videoTrimIn}
              videoTrimOut={videoTrimOut}
              beatMarkers={beatMarkers}
              snapToBeats={snapToBeats}
              beatStatus={beatBusy ? t.beatStatusAnalyzing : beatStatus}
              onSelect={setSelectedCaptionIndex}
              onUpdate={updateCaptionLine}
              onVideoTrimChange={(trimIn, trimOut) => {
                setVideoTrimIn(trimIn);
                setVideoTrimOut(trimOut);
              }}
              onSnapToggle={setSnapToBeats}
              onAlignToBeats={alignCaptionsToDetectedBeats}
              labels={{
                title: t.timelineTitle,
                hint: t.timelineL2Hint,
                videoTrack: t.videoTrack,
                captionTrack: t.captionTrack,
                bgmTrack: t.bgmTrack,
                trimIn: t.trimIn,
                trimOut: t.trimOut,
                snapBeats: t.snapBeats,
                trimVideoIn: t.trimVideoIn,
                trimVideoOut: t.trimVideoOut,
                alignToBeats: t.alignToBeats,
              }}
            />

            <div className="space-y-2">
              {captionLines.map((line, index) => (
                <CaptionLineEditor
                  key={`cap-${index}`}
                  line={line}
                  index={index}
                  timingLabel={t.timingLabel}
                  positionLabel={t.positionLabel}
                  positionOptions={t.positionOptions}
                  multilineHint={t.multilineHint}
                  removeLabel={t.removeLine}
                  spokenLabel={t.spokenLineLabel}
                  spokenPlaceholder={t.spokenLinePlaceholder}
                  styleLabel={t.lineStyleLabel}
                  styleOptions={styleOptions}
                  defaultStylePreset={defaultStylePreset}
                  locale={locale}
                  onChange={(patch) => updateCaptionLine(index, patch)}
                  onRemove={() => removeCaptionLine(index)}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addCaptionLine}
                className="text-xs font-medium text-cyan-300 underline underline-offset-2"
              >
                {t.addLine}
              </button>
              <button
                type="button"
                onClick={addTopLineSameTiming}
                className="text-xs font-medium text-violet-300 underline underline-offset-2"
              >
                {t.addTopSameTiming}
              </button>
            </div>

            <button
              type="button"
              disabled={busy || audioBusy || !sourceKind}
              onClick={() => void applyCaptions()}
              className="hidden w-full rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white disabled:opacity-40 xl:block"
            >
              {busy ? t.applying : t.applyBtn}
            </button>
          </section>
        </div>
      )}

      {hasWorkspace && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            <button
              type="button"
              disabled={
                audioBusy ||
                busy ||
                (!voiceoverScript.trim() && !selectedVoicePreviewId)
              }
              onClick={() => void applyVoiceover()}
              className="min-w-0 flex-1 rounded-full bg-violet-700 py-2.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-40"
            >
              {audioBusy
                ? t.audioApplyingVoice
                : captionLines.filter((l) => l.text.trim()).length >= 2
                  ? t.audioApplyVoicePerCaption.replace(
                      "{n}",
                      String(captionLines.filter((l) => l.text.trim()).length),
                    )
                  : t.audioApplyVoice}
            </button>
            <button
              type="button"
              disabled={busy || audioBusy || !sourceKind}
              onClick={() => void applyCaptions()}
              className="min-w-0 flex-1 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {busy ? t.applying : t.applyBtn}
            </button>
          </div>
        </div>
      )}

      {!hasWorkspace && error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      {note && (
        <p className="rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{note}</p>
      )}

      {finalDownloadUrl && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={downloadBusy}
            onClick={async () => {
              setDownloadBusy(true);
              try {
                await downloadVideoBlob(finalDownloadUrl, "captioned-reel.mp4");
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : t.downloadFailed);
              } finally {
                setDownloadBusy(false);
              }
            }}
            className="rounded-2xl border border-slate-600 px-8 py-3 text-sm font-medium text-slate-200 disabled:opacity-40"
          >
            {downloadBusy ? t.downloading : t.downloadBtn}
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        {t.reeditHint}{" "}
        <Link href="/start" className="text-emerald-400 underline underline-offset-2">
          {t.studioLink}
        </Link>
      </p>
    </div>
  );
}
