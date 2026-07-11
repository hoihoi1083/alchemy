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
import { toRelativePipelineUrl } from "@/lib/caption-studio-url";
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

async function postVideoMultipart(
  endpoint: string,
  file: File,
  fields: Record<string, string>,
) {
  const fd = new FormData();
  fd.set("video_file", file);
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fetch(endpoint, { method: "POST", credentials: "include", body: fd });
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
    const res = await fetch(`${rel}?v=${Date.now()}`, {
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
    const url = processedVideoUrl || playbackUrl;
    if (!url?.startsWith("http")) return;
    void fetch("/api/analyze-beats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ video_url: url }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.beats)) setBeatMarkers(data.beats as number[]);
      })
      .catch(() => {});
  }, [processedVideoUrl, playbackUrl]);

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
    const filled = captionLines.filter((l) => l.text.trim());
    const lines = filled.length > 0 ? filled : [{ startSec: 0, endSec: videoDuration, text: "" }];
    const slice = videoDuration / lines.length;
    setCaptionLines(
      lines.map((line, i) => ({
        ...line,
        startSec: Number((i * slice).toFixed(1)),
        endSec: Number(Math.min(videoDuration, (i + 1) * slice).toFixed(1)),
        stylePreset: line.stylePreset ?? defaultStylePreset,
      })),
    );
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

  async function generateVoicePreviews() {
    const script = voiceoverScript.trim();
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
      setVoicePreviewTracks(tracks);
      setSelectedVoicePreviewId(tracks[0]?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : m.errors.voiceoverFailed);
    } finally {
      setVoicePreviewBusy(false);
    }
  }

  async function applyBgm() {
    const input = workingVideoInput();
    if (!input.file && !input.url) {
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

      let res: Response;
      if (input.file) {
        const fields: Record<string, string> = { replace_source_audio: "true" };
        if (musicSource === "ai" && selectedAi?.audioUrl) {
          fields.music_url = selectedAi.audioUrl;
        } else {
          fields.track = bgmTrack;
        }
        res = await postVideoMultipart("/api/add-bgm", input.file, fields);
      } else {
        const body: Record<string, unknown> = { replace_source_audio: true };
        if (musicSource === "ai" && selectedAi?.audioUrl) {
          body.music_url = selectedAi.audioUrl;
        } else {
          body.track = bgmTrack;
        }
        res = await postVideoJson("/api/add-bgm", input.url!, body);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.burnFailed);
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
    const selectedPreview = voicePreviewTracks.find((tr) => tr.id === selectedVoicePreviewId);
    if (!script && !selectedPreview) return;
    const input = workingVideoInput();
    if (!input.file && !input.url) {
      setError(t.needVideo);
      return;
    }

    setAudioBusy(true);
    setError(null);
    setAudioNote(null);

    try {
      let res: Response;
      const voiceBody: Record<string, unknown> = {
        locale: voiceoverLocale,
        target_duration_sec: videoDuration,
      };
      if (selectedPreview) {
        voiceBody.speech_url = selectedPreview.audioUrl;
        voiceBody.voice_preset = selectedPreview.presetId;
      } else {
        voiceBody.script = script;
      }

      if (input.file) {
        const fields: Record<string, string> = {
          locale: voiceoverLocale,
          target_duration_sec: String(videoDuration),
        };
        if (selectedPreview) {
          fields.speech_url = selectedPreview.audioUrl;
          fields.voice_preset = selectedPreview.presetId;
        } else {
          fields.script = script;
        }
        res = await postVideoMultipart("/api/dub-script-voice", input.file, fields);
      } else {
        res = await postVideoJson("/api/dub-script-voice", input.url!, voiceBody);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.burnFailed);
      await commitProcessedVideo(data.videoUrl as string);
      previewVideoRef.current?.load();
      setAudioNote(t.audioVoiceDone);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setAudioBusy(false);
    }
  }

  function fillVoiceFromCaptions() {
    const text = captionLines
      .map((l) => l.text.trim())
      .filter(Boolean)
      .join("，");
    if (text) setVoiceoverScript(text);
  }

  async function applyCaptions() {
    const lines = captionLines.filter((l) => l.text.trim());
    if (!sourceKind || (!sourceFile && !sourceUrl)) {
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
      let input = workingVideoInput();
      const needsTrim = videoTrimIn > 0.05 || videoTrimOut < videoDuration - 0.05;
      if (needsTrim && (input.url || input.file)) {
        const trimFd = new FormData();
        if (input.file) trimFd.set("video_file", input.file);
        else if (input.url) trimFd.set("video_url", input.url);
        trimFd.set("trim_in_sec", String(videoTrimIn));
        trimFd.set("trim_out_sec", String(videoTrimOut));
        const trimRes = await fetch("/api/trim-video", { method: "POST", credentials: "include", body: trimFd });
        const trimData = await trimRes.json();
        if (!trimRes.ok) throw new Error(trimData.error ?? t.trimFailed);
        input = { file: null, url: trimData.videoUrl as string };
      }

      let res: Response;
      if (input.file) {
        const fd = new FormData();
        fd.set("video_file", input.file);
        fd.set("caption_lines", JSON.stringify(lines));
        fd.set("caption_style", JSON.stringify(captionStyle));
        res = await fetch("/api/burn-script-captions", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      } else if (input.url) {
        res = await postVideoJson("/api/burn-script-captions", input.url, {
          caption_lines: lines,
          caption_style: captionStyle,
        });
      } else {
        throw new Error(t.needVideo);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.burnFailed);

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

      {hasWorkspace && (
        <div className="grid gap-5 xl:grid-cols-[minmax(300px,1fr)_minmax(280px,400px)_minmax(300px,1fr)] xl:items-start">
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
            audioNote={audioNote}
            labels={{
              title: t.audioTitle,
              hint: t.audioHint,
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
              voicePreviewHint: ad.voicePreviewHint,
              generateVoice: ad.generateVoice,
              generatingVoice: ad.generatingVoice,
              voicePresets: ad.voicePresets,
              speakVoiceover: t.audioSpeakVoiceover,
              voicePlaceholder: t.audioVoicePlaceholder,
              applyVoice: t.audioApplyVoice,
              applyingVoice: t.audioApplyingVoice,
              localeHk: t.audioLocaleHk,
              localeCn: t.audioLocaleCn,
              localeEn: t.audioLocaleEn,
              fillVoiceFromCaptions: t.fillVoiceFromCaptions,
            }}
          />

          <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 xl:sticky xl:top-4">
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
              className="mx-auto aspect-[9/16] w-full max-h-[min(72vh,720px)] rounded-2xl border border-slate-800 bg-black object-contain"
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

          <section className="space-y-3 rounded-3xl border border-violet-500/30 bg-violet-950/20 p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-violet-50">{t.linesTitle}</h2>
                <p className="mt-1 text-xs text-violet-200/80">{t.linesHintPerLineStyle}</p>
              </div>
              <button
                type="button"
                disabled={!sourceKind}
                onClick={splitEvenly}
                className="rounded-full border border-violet-400/50 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/40 disabled:opacity-50"
              >
                {t.splitEvenly}
              </button>
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
              onSelect={setSelectedCaptionIndex}
              onUpdate={updateCaptionLine}
              onVideoTrimChange={(trimIn, trimOut) => {
                setVideoTrimIn(trimIn);
                setVideoTrimOut(trimOut);
              }}
              onSnapToggle={setSnapToBeats}
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
              className="w-full rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? t.applying : t.applyBtn}
            </button>
          </section>
        </div>
      )}

      {error && (
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
