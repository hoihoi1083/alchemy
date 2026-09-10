"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { CaptionLineEditor } from "@/components/captions/CaptionLineEditor";
import {
  CaptionAudioSection,
  type MusicSource,
} from "@/components/captions/CaptionAudioSection";
import { CaptionNleTimeline } from "@/components/captions/CaptionNleTimeline";
import { CaptionLiveOverlay } from "@/components/captions/CaptionLiveOverlay";
import { CaptionPicturePhase } from "@/components/captions/CaptionPicturePhase";
import { CaptionProgramMonitor } from "@/components/captions/CaptionProgramMonitor";
import { LibraryAssetPicker } from "@/components/LibraryAssetPicker";
import { useLocale } from "@/components/LocaleProvider";
import type { MusicMood, VoiceoverLocale } from "@/lib/ad-pack-preferences";
import type {
  AiMusicTrack,
  CaptionLine,
  VoClip,
  VoicePreviewTrack,
} from "@/lib/ad-pack-types";
import { captionSpeakText } from "@/lib/ad-pack-types";
import type { CaptionEditJob } from "@/lib/byteplus-seedance-edit";
import {
  CAPTION_STYLE_PRESETS,
  CAPTION_STYLE_PRESET_IDS,
  type CaptionStylePresetId,
} from "@/lib/caption-burn-styles";
import { resolveCaptionStudioMusicPrompt } from "@/lib/caption-music-prompt";
import {
  clearCaptionHandoff,
  readCaptionHandoff,
} from "@/lib/caption-studio-draft";
import { toRelativePipelineUrl, withCacheBust } from "@/lib/caption-studio-url";
import {
  captionVoiceStartSec,
  fitCaptionLinesToVoiceDuration,
  probeAudioDurationSec,
  voiceTimingStatus,
} from "@/lib/caption-voice-timing";
import { DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
import {
  clipDurationSec,
  createTimelineClip,
  deleteClipAt,
  exportPlan,
  packClipsMagnetically,
  projectDuration,
  reorderClips,
  sourceTimeForPlayhead,
  splitClipAt,
  trimClipEdge,
  type TimelineClip,
} from "@/lib/captions/timeline-project";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { isSafeForServerUpload } from "@/lib/upload-limits";

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 160) || "Request failed." };
  }
}

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

async function uploadVideoFileToLibrary(file: File, failMsg: string): Promise<string> {
  const presignRes = await fetch("/api/library/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: "video",
      contentType: file.type || "video/mp4",
      name: file.name || "caption-studio-2-upload",
      sizeBytes: file.size,
    }),
  });
  const presign = await readApiJson(presignRes);
  if (
    !presignRes.ok ||
    typeof presign.uploadUrl !== "string" ||
    typeof presign.downloadUrl !== "string"
  ) {
    throw new Error(
      typeof presign.error === "string" ? presign.error : failMsg,
    );
  }
  const orphanId =
    typeof presign.assetId === "string" ? (presign.assetId as string) : null;
  const purgeOrphan = () => {
    if (!orphanId) return;
    void fetch(`/api/library/download/${orphanId}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => undefined);
  };
  try {
    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "video/mp4" },
      body: file,
    });
    if (putRes.ok) return presign.downloadUrl as string;
  } catch {
    /* fall through */
  }
  purgeOrphan();
  if (!isSafeForServerUpload(file.size)) {
    throw new Error(failMsg);
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
    throw new Error(typeof proxy.error === "string" ? proxy.error : failMsg);
  }
  return proxy.downloadUrl;
}

const UNDO_LIMIT = 30;

type ToolTab = "edit" | "captions" | "audio";

type UndoSnapshot = {
  clips: TimelineClip[];
  captions: CaptionLine[];
  bgmStartSec: number;
  bgmDurationSec: number;
  voClips: VoClip[];
  selectedVoId: string | null;
};

function probeVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      resolve(Number.isFinite(d) && d > 0 ? d : 8);
      v.src = "";
    };
    v.onerror = () => resolve(8);
    v.src = url;
  });
}

export function CaptionStudio2Client() {
  const { m, locale } = useLocale();
  const t = m.captions;
  const t2 = m.captions2;
  const searchParams = useSearchParams();

  const [toolTab, setToolTab] = useState<ToolTab>("edit");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [originalSourceUrl, setOriginalSourceUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [pxPerSec, setPxPerSec] = useState(48);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>([]);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [defaultStylePreset, setDefaultStylePreset] =
    useState<CaptionStylePresetId>("classic");
  const [libraryOpen, setLibraryOpen] = useState(false);
  /** replace = start/replace project; append = add another timeline clip */
  const [libraryPickMode, setLibraryPickMode] = useState<"replace" | "append">(
    "replace",
  );
  const [busy, setBusy] = useState(false);
  const [transcribeBusy, setTranscribeBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [bgmTrack, setBgmTrack] = useState<BgmTrackId>(DEFAULT_BGM_TRACK);
  const [bgmStartSec, setBgmStartSec] = useState(0);
  /** BGM clip length on timeline; null until first set → use remaining project. */
  const [bgmDurationSec, setBgmDurationSec] = useState<number | null>(null);
  const [replaceSourceAudio, setReplaceSourceAudio] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.55);
  const [matchMusicToVideo, setMatchMusicToVideo] = useState(true);
  const [musicTopic, setMusicTopic] = useState("");
  const [musicMood, setMusicMood] = useState<MusicMood>("auto");
  const [musicSource, setMusicSource] = useState<MusicSource>("ai");
  const [aiMusicTracks, setAiMusicTracks] = useState<AiMusicTrack[]>([]);
  const [selectedAiMusicId, setSelectedAiMusicId] = useState<string | null>(null);
  const [musicGenerateBusy, setMusicGenerateBusy] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(2.1);
  const [underVoiceBgmVolume, setUnderVoiceBgmVolume] = useState(0.14);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [voiceoverScript, setVoiceoverScript] = useState("");
  const [voiceoverLocale, setVoiceoverLocale] = useState<VoiceoverLocale>("hk");
  const [voicePreviewTracks, setVoicePreviewTracks] = useState<VoicePreviewTrack[]>(
    [],
  );
  const [selectedVoicePreviewId, setSelectedVoicePreviewId] = useState<
    string | null
  >(null);
  const [voicePreviewBusy, setVoicePreviewBusy] = useState(false);
  const [planCaptionVoiceBusy, setPlanCaptionVoiceBusy] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [voClips, setVoClips] = useState<VoClip[]>([]);
  const [selectedVoId, setSelectedVoId] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  /** CapCut-like: preview gets the rest; timeline is compact + resizable. */
  const [timelinePx, setTimelinePx] = useState(() => {
    if (typeof window === "undefined") return 260;
    try {
      const saved = Number(localStorage.getItem("c2-timeline-h"));
      if (Number.isFinite(saved) && saved >= 160 && saved <= 560) return saved;
    } catch {
      /* ignore */
    }
    const vh = Math.round(window.innerHeight * 0.28);
    return Math.min(480, Math.max(220, vh));
  });
  const timelineDragRef = useRef<{ startY: number; startH: number } | null>(
    null,
  );
  const [editJob, setEditJob] = useState<CaptionEditJob>("product");
  const [editNote, setEditNote] = useState("");
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editStage, setEditStage] = useState<"trim" | "generate" | null>(null);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [editDownloadBusy, setEditDownloadBusy] = useState(false);
  const [captionMode, setCaptionMode] = useState<"pure" | "speech" | "ai">(
    "pure",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaAddInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const editAbortRef = useRef<AbortController | null>(null);
  const handoffDone = useRef(false);
  const blobPreviewRef = useRef<string | null>(null);

  const projectDur = useMemo(
    () => Math.max(0.2, projectDuration(timelineClips)),
    [timelineClips],
  );

  const playheadSource = useMemo(
    () => sourceTimeForPlayhead(timelineClips, playheadSec),
    [timelineClips, playheadSec],
  );

  const flatPreviewSrc = showOriginal
    ? originalSourceUrl ?? localPreviewUrl ?? sourceUrl
    : playbackUrl ?? processedVideoUrl;

  const selectedEditDurationSec = useMemo(() => {
    const target =
      timelineClips.find((c) => c.id === selectedClipId) ?? timelineClips[0];
    return target ? clipDurationSec(target) : 8;
  }, [timelineClips, selectedClipId]);

  const hasWorkspace = Boolean(
    sourceUrl || localPreviewUrl || timelineClips.length > 0,
  );
  const asrSourceUrl =
    timelineClips[0]?.url ?? originalSourceUrl ?? sourceUrl;

  const styleOptions = useMemo(
    () =>
      CAPTION_STYLE_PRESET_IDS.map((id) => ({
        id,
        label:
          locale === "en"
            ? CAPTION_STYLE_PRESETS[id].labelEn
            : CAPTION_STYLE_PRESETS[id].labelZh,
      })),
    [locale],
  );

  const bgmLabel =
    bgmTrack === "upbeat"
      ? m.wizard.bgmUpbeat
      : bgmTrack === "warm"
        ? m.wizard.bgmWarm
        : m.wizard.bgmCalm;

  const bgmOptions = useMemo(
    () => [
      { id: "calm" as const, label: m.wizard.bgmCalm },
      { id: "upbeat" as const, label: m.wizard.bgmUpbeat },
      { id: "warm" as const, label: m.wizard.bgmWarm },
    ],
    [m.wizard.bgmCalm, m.wizard.bgmUpbeat, m.wizard.bgmWarm],
  );

  const ad = m.wizard.adPack;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = timelineDragRef.current;
      if (!drag) return;
      const delta = drag.startY - e.clientY;
      const maxH = Math.min(560, Math.round(window.innerHeight * 0.55));
      const next = Math.min(maxH, Math.max(160, drag.startH + delta));
      setTimelinePx(next);
    };
    const onUp = () => {
      timelineDragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("c2-timeline-h", String(timelinePx));
    } catch {
      /* ignore */
    }
  }, [timelinePx]);

  const pushUndo = useCallback(() => {
    setUndoStack((prev) =>
      [
        ...prev,
        {
          clips: timelineClips,
          captions: captionLines,
          bgmStartSec,
          bgmDurationSec: bgmDurationSec ?? Math.max(0.4, projectDur - bgmStartSec),
          voClips,
          selectedVoId,
        },
      ].slice(-UNDO_LIMIT),
    );
  }, [
    timelineClips,
    captionLines,
    bgmStartSec,
    bgmDurationSec,
    projectDur,
    voClips,
    selectedVoId,
  ]);

  /** After BGM / VO / burn / export: plate becomes the sole timeline source so next bake keeps the mix. */
  const commitPlateToTimeline = useCallback(
    async (plateUrl: string, label?: string) => {
      const rel = toRelativePipelineUrl(plateUrl);
      const dur = await probeVideoDuration(withCacheBust(rel));
      pushUndo();
      const clip = createTimelineClip({
        url: rel,
        label: label || sourceLabel || "Plate",
        sourceDurationSec: dur,
      });
      setTimelineClips([clip]);
      setSelectedClipId(clip.id);
      setSourceUrl(rel);
      setProcessedVideoUrl(rel);
      setPlaybackUrl(withCacheBust(rel));
      setShowOriginal(false);
      setPlayheadSec(0);
      setLocalPreviewUrl(null);
      return rel;
    },
    [pushUndo, sourceLabel],
  );

  const effectiveBgmDuration = useMemo(() => {
    const remain = Math.max(0.4, projectDur - bgmStartSec);
    if (typeof bgmDurationSec === "number" && Number.isFinite(bgmDurationSec)) {
      return Math.min(remain, Math.max(0.4, bgmDurationSec));
    }
    return remain;
  }, [bgmDurationSec, bgmStartSec, projectDur]);

  const setBgmRange = useCallback(
    (startSec: number, durationSec: number) => {
      const start = Math.max(0, Math.min(projectDur - 0.2, startSec));
      const dur = Math.max(0.4, Math.min(projectDur - start, durationSec));
      setBgmStartSec(start);
      setBgmDurationSec(dur);
    },
    [projectDur],
  );

  const setClipsWithUndo = useCallback(
    (next: TimelineClip[] | ((prev: TimelineClip[]) => TimelineClip[])) => {
      pushUndo();
      setTimelineClips(next);
    },
    [pushUndo],
  );

  const setClipsLive = useCallback(
    (next: TimelineClip[] | ((prev: TimelineClip[]) => TimelineClip[])) => {
      setTimelineClips(next);
    },
    [],
  );

  const applySource = useCallback(
    (url: string, label: string, blobPreview?: string, durationSec = 8) => {
      if (blobPreviewRef.current) {
        URL.revokeObjectURL(blobPreviewRef.current);
        blobPreviewRef.current = null;
      }
      if (blobPreview) blobPreviewRef.current = blobPreview;
      const clip = createTimelineClip({
        url,
        label,
        sourceDurationSec: durationSec,
      });
      setSourceUrl(url);
      setOriginalSourceUrl(url);
      setSourceLabel(label);
      setLocalPreviewUrl(blobPreview ?? null);
      setPlaybackUrl(null);
      setProcessedVideoUrl(null);
      setShowOriginal(false);
      setTimelineClips([clip]);
      setSelectedClipId(clip.id);
      setPlayheadSec(0);
      // Short clips start zoomed in so trim edges are usable.
      setPxPerSec(
        Math.min(320, Math.max(64, Math.round(720 / Math.max(1, durationSec)))),
      );
      setUndoStack([]);
      setCaptionLines([]);
      setSelectedCaptionIndex(0);
      setBgmStartSec(0);
      setBgmDurationSec(null);
      setVoClips([]);
      setSelectedVoId(null);
      setNote(null);
      setWarn(null);
      setError(null);
      setRefImageUrl(null);
      setEditNote("");
      setEditedVideoUrl(null);
      setToolTab("edit");
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (blobPreviewRef.current) URL.revokeObjectURL(blobPreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (handoffDone.current) return;
    const q = searchParams.get("video")?.trim();
    if (q) {
      handoffDone.current = true;
      void probeVideoDuration(q).then((d) => applySource(q, t2.fromLink, undefined, d));
      return;
    }
    const handoff = readCaptionHandoff();
    if (handoff?.videoUrl) {
      handoffDone.current = true;
      clearCaptionHandoff();
      void probeVideoDuration(handoff.videoUrl).then((d) =>
        applySource(handoff.videoUrl, t.sourceFromStudio, undefined, d),
      );
    }
  }, [applySource, searchParams, t.sourceFromStudio, t2.fromLink]);

  // Transient toast while CapCut board is open (success notes were previously hidden).
  useEffect(() => {
    if (!note || !hasWorkspace) return;
    const id = window.setTimeout(() => setNote(null), 3500);
    return () => window.clearTimeout(id);
  }, [note, hasWorkspace]);

  function clearWorkspace() {
    setToolTab("edit");
    setSourceUrl(null);
    setOriginalSourceUrl(null);
    setLocalPreviewUrl(null);
    setPlaybackUrl(null);
    setProcessedVideoUrl(null);
    setTimelineClips([]);
    setSelectedClipId(null);
    setPlayheadSec(0);
    setUndoStack([]);
    setCaptionLines([]);
    setShowOriginal(false);
    setNote(null);
    setWarn(null);
    setError(null);
    setRefImageUrl(null);
    setEditNote("");
    setEditedVideoUrl(null);
    setBgmStartSec(0);
    setBgmDurationSec(null);
    setVoClips([]);
    setSelectedVoId(null);
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
      blobPreviewRef.current = null;
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = URL.createObjectURL(file);
      const url = await uploadVideoFileToLibrary(file, t.uploadNeedCorsOrLibrary);
      const dur = await probeVideoDuration(blob);
      applySource(url, file.name || t2.uploadedVideo, blob, dur);
      setNote(t2.readyPicture);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImageFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", "image");
    const proxyRes = await fetch("/api/library/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const proxy = await readApiJson(proxyRes);
    if (!proxyRes.ok || typeof proxy.downloadUrl !== "string") {
      throw new Error(
        typeof proxy.error === "string" ? proxy.error : t.uploadFailed,
      );
    }
    return proxy.downloadUrl;
  }

  async function addTimelineClip(url: string, label: string) {
    const dur = await probeVideoDuration(url);
    const clip = createTimelineClip({
      url,
      label,
      sourceDurationSec: dur,
    });
    setClipsWithUndo((prev) => [...prev, clip]);
    setSelectedClipId(clip.id);
    setNote(t2.clipAdded);
  }

  async function runPictureEdit() {
    const target =
      timelineClips.find((c) => c.id === selectedClipId) ?? timelineClips[0];
    if (!target) {
      setError(t2.needVideo);
      return;
    }
    if (!refImageUrl && !editNote.trim()) {
      setError(t2.needRefOrNote);
      return;
    }
    editAbortRef.current?.abort();
    const ac = new AbortController();
    editAbortRef.current = ac;
    setEditBusy(true);
    setEditStage(null);
    setError(null);
    try {
      // CapCut flow: trim on timeline first, then Seedance that segment only.
      let editUrl = target.url;
      const clipDur = Math.max(0.2, target.sourceOutSec - target.sourceInSec);
      const needsTrim =
        target.sourceInSec > 0.05 ||
        target.sourceOutSec < target.sourceDurationSec - 0.05;
      if (needsTrim) {
        setEditStage("trim");
        const trimFd = new FormData();
        trimFd.set("video_url", target.url);
        trimFd.set("trim_in_sec", String(target.sourceInSec));
        trimFd.set("trim_out_sec", String(target.sourceOutSec));
        const trimRes = await fetch("/api/trim-video", {
          method: "POST",
          credentials: "include",
          body: trimFd,
          signal: ac.signal,
        });
        const trimData = await readApiJson(trimRes);
        if (!trimRes.ok || typeof trimData.videoUrl !== "string") {
          throw new Error(
            typeof trimData.error === "string" ? trimData.error : t.trimFailed,
          );
        }
        editUrl = toRelativePipelineUrl(trimData.videoUrl);
      }

      setEditStage("generate");
      const res = await fetch("/api/caption-video-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          video_url: editUrl,
          image_url: refImageUrl || undefined,
          job: editJob,
          note: editNote,
          duration_sec: clipDur,
          resolution: "720p",
        }),
        signal: ac.signal,
      });
      const data = await readApiJson(res);
      if (!res.ok || typeof data.videoUrl !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : t2.editFailed,
        );
      }
      const next = withCacheBust(toRelativePipelineUrl(data.videoUrl));
      const dur = await probeVideoDuration(next);
      const updated = createTimelineClip({
        url: next,
        label: target.label || sourceLabel || t2.uploadedVideo,
        sourceDurationSec: dur,
      });
      const wasFirst = timelineClips[0]?.id === target.id;
      pushUndo();
      setTimelineClips((prev) =>
        prev.map((c) => (c.id === target.id ? updated : c)),
      );
      setSelectedClipId(updated.id);
      setEditedVideoUrl(next);
      if (wasFirst) {
        setSourceUrl(next);
        setOriginalSourceUrl(next);
      }
      setPlaybackUrl(null);
      setProcessedVideoUrl(null);
      setLocalPreviewUrl(null);
      setNote(t2.editDoneOnClip);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setNote(t2.editCancel);
      } else {
        setError(e instanceof Error ? e.message : t2.editFailed);
      }
    } finally {
      setEditBusy(false);
      setEditStage(null);
      if (editAbortRef.current === ac) editAbortRef.current = null;
    }
  }

  async function downloadEditedClip() {
    const url = editedVideoUrl ?? originalSourceUrl ?? sourceUrl;
    if (!url) return;
    setEditDownloadBusy(true);
    setError(null);
    try {
      await downloadVideoBlob(url, "caption-edited.mp4");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t2.editDownloadFailed);
    } finally {
      setEditDownloadBusy(false);
    }
  }

  /** Bake magnetic timeline → trimmed clips → stitch → single plate URL. */
  async function bakeTimelinePlate(): Promise<string> {
    if (timelineClips.length === 0) {
      throw new Error(t2.needVideo);
    }
    const plan = exportPlan(timelineClips);
    const bakedUrls: string[] = [];
    for (let i = 0; i < plan.length; i++) {
      const step = plan[i]!;
      const clip = timelineClips[i]!;
      const full =
        step.trimInSec <= 0.05 &&
        step.trimOutSec >= clip.sourceDurationSec - 0.05;
      if (full) {
        bakedUrls.push(step.url);
        continue;
      }
      const trimFd = new FormData();
      trimFd.set("video_url", step.url);
      trimFd.set("trim_in_sec", String(step.trimInSec));
      trimFd.set("trim_out_sec", String(step.trimOutSec));
      const trimRes = await fetch("/api/trim-video", {
        method: "POST",
        credentials: "include",
        body: trimFd,
      });
      const trimData = await readApiJson(trimRes);
      if (!trimRes.ok || typeof trimData.videoUrl !== "string") {
        throw new Error(
          typeof trimData.error === "string" ? trimData.error : t.trimFailed,
        );
      }
      bakedUrls.push(toRelativePipelineUrl(trimData.videoUrl));
    }
    if (bakedUrls.length === 1) return bakedUrls[0]!;
    const res = await fetch("/api/stitch-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ video_urls: bakedUrls }),
    });
    const data = await readApiJson(res);
    if (!res.ok || typeof data.videoUrl !== "string") {
      throw new Error(
        typeof data.error === "string" ? data.error : t2.joinFailed,
      );
    }
    return toRelativePipelineUrl(data.videoUrl);
  }

  async function runAutoTranscribe() {
    if (!asrSourceUrl) {
      setError(t2.needVideo);
      return;
    }
    setTranscribeBusy(true);
    setError(null);
    setNote(null);
    setWarn(null);
    try {
      const fd = new FormData();
      fd.set("video_url", asrSourceUrl);
      const res = await fetch("/api/transcribe-captions", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t2.transcribeFailed,
        );
      }
      const lines = Array.isArray(data.lines) ? (data.lines as CaptionLine[]) : [];
      if (lines.length === 0 || data.emptySpeech) {
        setCaptionLines([]);
        setWarn(t2.noSpeech);
        return;
      }
      pushUndo();
      setCaptionLines(lines);
      setSelectedCaptionIndex(0);
      const asr =
        data.asrProvider === "local" ? t2.asrLocal : t2.asrCloud;
      const tok =
        typeof data.tokensCharged === "number" && data.tokensCharged > 0
          ? t2.chargedTok(data.tokensCharged)
          : "";
      const splitNote = data.evenSplit ? ` · ${t2.evenSplitNote}` : "";
      setNote(
        `${t2.transcribeDone(lines.length)} · ${asr}${tok ? ` · ${tok}` : ""}${splitNote}`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t2.transcribeFailed);
    } finally {
      setTranscribeBusy(false);
    }
  }

  async function generateAiMusicTracks() {
    setMusicGenerateBusy(true);
    setError(null);
    setAudioNote(null);
    try {
      const durationSec = Math.max(8, Math.min(60, Math.round(projectDur)));
      const promptEn = resolveCaptionStudioMusicPrompt({
        productBrief: musicTopic,
        musicMood,
        durationSec,
      });
      const body: Record<string, unknown> = {
        promptEn,
        durationSec,
      };
      if (matchMusicToVideo) {
        if (timelineClips.length === 0) {
          throw new Error(t2.needVideo);
        }
        body.matchVideo = true;
        body.videoUrl = await bakeTimelinePlate();
      }
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : m.errors.musicGenerateFailed,
        );
      }
      const tracks = (Array.isArray(data.tracks) ? data.tracks : []) as AiMusicTrack[];
      if (tracks.length === 0) throw new Error(m.errors.musicGenerateFailed);
      setAiMusicTracks(tracks);
      setSelectedAiMusicId(tracks[0]?.id ?? null);
      setMusicSource("ai");
      const matched =
        data.matchedVideo === true ? t.aiMusicMatchedVideoNote : null;
      setAudioNote(
        matched ??
          t.aiMusicGeneratedNote.replace("{count}", String(tracks.length)),
      );
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
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : m.errors.voiceoverFailed,
        );
      }
      const tracks = (Array.isArray(data.tracks) ? data.tracks : []) as VoicePreviewTrack[];
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
            /* fall through */
          }
        }
        playable.push(track);
      }
      const playableWithDuration = await Promise.all(
        playable.map(async (track) => {
          const durationSec =
            track.durationSec ??
            (track.audioUrl ? await probeAudioDurationSec(track.audioUrl) : 0);
          return durationSec > 0 ? { ...track, durationSec } : track;
        }),
      );
      setVoicePreviewTracks((prev) => {
        for (const tr of prev) {
          if (tr.audioUrl?.startsWith("blob:")) URL.revokeObjectURL(tr.audioUrl);
        }
        return playableWithDuration;
      });
      setSelectedVoicePreviewId(playableWithDuration[0]?.id ?? null);
      setVoiceoverEnabled(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : m.errors.voiceoverFailed);
    } finally {
      setVoicePreviewBusy(false);
    }
  }

  function fillVoiceFromCaptions() {
    const sep = voiceoverLocale === "en" ? " · " : "，";
    const text = captionLines
      .map((l) => captionSpeakText(l))
      .filter(Boolean)
      .join(sep);
    if (text) {
      setVoiceoverScript(text);
      setVoiceoverEnabled(true);
    }
  }

  async function planCaptionsAndVoiceFromTopic() {
    const topic = musicTopic.trim();
    if (!topic) {
      setError(t.planCaptionVoiceNeedTopic);
      return;
    }
    if (timelineClips.length === 0) {
      setError(t2.needVideo);
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
          video_duration_sec: projectDur,
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t.planCaptionVoiceFailed,
        );
      }
      const lines = (Array.isArray(data.captionLines)
        ? data.captionLines
        : []) as CaptionLine[];
      if (!lines.length) throw new Error(t.planCaptionVoiceFailed);
      pushUndo();
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
          : lines
              .map((l) => captionSpeakText(l))
              .filter(Boolean)
              .join(voiceoverLocale === "en" ? " · " : "，");
      if (script) setVoiceoverScript(script);
      setVoiceoverEnabled(true);
      setVoicePreviewTracks([]);
      setSelectedVoicePreviewId(null);
      setSelectedCaptionIndex(0);
      setToolTab("audio");
      const n = Number(data.lineCount) || lines.length;
      setAudioNote(
        t.planCaptionVoiceDone
          .replaceAll("{n}", String(n))
          .replaceAll("{sec}", projectDur.toFixed(1)),
      );
      setNote(
        t.planCaptionVoiceDone
          .replaceAll("{n}", String(n))
          .replaceAll("{sec}", projectDur.toFixed(1)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.planCaptionVoiceFailed);
      setAudioNote(null);
    } finally {
      setPlanCaptionVoiceBusy(false);
    }
  }

  /** Selected clip range, else selected caption window, else full project. */
  function selectedSectionRange(): { startSec: number; endSec: number } {
    const packed = packClipsMagnetically(timelineClips);
    const clip = packed.find((c) => c.id === selectedClipId);
    if (clip) {
      return {
        startSec: clip.timelineStartSec,
        endSec: clip.timelineEndSec,
      };
    }
    const line = captionLines[selectedCaptionIndex];
    if (line && line.endSec > line.startSec) {
      return { startSec: line.startSec, endSec: line.endSec };
    }
    return { startSec: 0, endSec: Math.max(2, projectDur) };
  }

  async function planCaptionForSelectedSection() {
    const topic = musicTopic.trim();
    if (!topic) {
      setError(t.planCaptionVoiceNeedTopic);
      return;
    }
    if (timelineClips.length === 0) {
      setError(t2.needVideo);
      return;
    }
    const { startSec, endSec } = selectedSectionRange();
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
          start_sec: startSec,
          end_sec: endSec,
          line_count: 1,
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t.planCaptionVoiceFailed,
        );
      }
      const lines = (Array.isArray(data.captionLines)
        ? data.captionLines
        : []) as CaptionLine[];
      if (!lines.length) throw new Error(t.planCaptionVoiceFailed);
      pushUndo();
      const mapped = lines.map((line, i) => {
        const text = String(line.text ?? "").trim();
        const spoken = String(line.spokenText ?? "").trim();
        return {
          startSec: Math.max(0, Number(line.startSec) || startSec),
          endSec: Math.max(
            Number(line.startSec) || startSec,
            Number(line.endSec) || endSec,
          ),
          text,
          ...(spoken ? { spokenText: spoken } : {}),
          position: line.position ?? (i % 2 === 0 ? "bottom" : "top"),
          stylePreset: line.stylePreset ?? defaultStylePreset,
        } satisfies CaptionLine;
      });
      const script =
        typeof data.voiceoverScript === "string" && data.voiceoverScript.trim()
          ? data.voiceoverScript.trim()
          : mapped.map((l) => captionSpeakText(l)).filter(Boolean).join("");
      if (script) setVoiceoverScript(script);
      setVoiceoverEnabled(true);
      setCaptionLines((prev) => {
        const kept = prev.filter(
          (l) => l.endSec <= startSec + 0.05 || l.startSec >= endSec - 0.05,
        );
        const next = [...kept, ...mapped].sort((a, b) => a.startSec - b.startSec);
        const idx = next.findIndex(
          (l) => Math.abs(l.startSec - mapped[0]!.startSec) < 0.05,
        );
        setSelectedCaptionIndex(idx >= 0 ? idx : 0);
        return next;
      });
      const note = (t2.sectionCaptionDone ?? t.planCaptionVoiceDone)
        .replaceAll("{n}", "1")
        .replaceAll("{sec}", (endSec - startSec).toFixed(1));
      setAudioNote(note);
      setNote(note);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.planCaptionVoiceFailed);
    } finally {
      setPlanCaptionVoiceBusy(false);
    }
  }

  async function generateVoForSelectedSection() {
    const { startSec, endSec } = selectedSectionRange();
    const sectionLine =
      captionLines.find(
        (l) =>
          l.startSec >= startSec - 0.05 &&
          l.endSec <= endSec + 0.05 &&
          l.text.trim(),
      ) ?? captionLines[selectedCaptionIndex];
    const speak =
      (sectionLine ? captionSpeakText(sectionLine) : "") ||
      voiceoverScript.trim();
    if (!speak) {
      setError(t.audioVoiceNeedPreviewOrScript);
      return;
    }
    setVoicePreviewBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/preview-script-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ script: speak, locale: voiceoverLocale }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : m.errors.voiceoverFailed,
        );
      }
      const tracks = (Array.isArray(data.tracks) ? data.tracks : []) as VoicePreviewTrack[];
      const first = tracks[0];
      if (!first?.audioUrl) throw new Error(m.errors.voiceoverFailed);
      let audioUrl = first.audioUrl;
      if (audioUrl.startsWith("/api/library/") || audioUrl.includes("/api/library/download/")) {
        const audioRes = await fetch(withCacheBust(audioUrl), {
          credentials: "include",
          cache: "no-store",
        });
        if (audioRes.ok) {
          audioUrl = URL.createObjectURL(await audioRes.blob());
        }
      }
      const durationSec =
        first.durationSec ??
        (await probeAudioDurationSec(audioUrl)) ??
        Math.max(0.8, endSec - startSec);
      const safeDur =
        durationSec > 0 ? durationSec : Math.max(0.8, endSec - startSec);
      const clip: VoClip = {
        id: `vo-sec-${Date.now()}`,
        audioUrl,
        startSec,
        durationSec: safeDur,
        label: speak.slice(0, 12) || t2.nleVoLane,
      };
      pushUndo();
      setVoClips((prev) => [...prev.filter((v) => !(v.startSec >= startSec && v.startSec < endSec)), clip]);
      setSelectedVoId(clip.id);
      setVoicePreviewTracks(tracks.map((tr, i) => (i === 0 ? { ...tr, audioUrl, durationSec: safeDur } : tr)));
      setSelectedVoicePreviewId(first.id);
      setVoiceoverScript(speak);
      setAudioNote(t2.sectionVoDone ?? t.audioVoiceDone);
      setNote(t2.sectionVoDone ?? t.audioVoiceDone);
      setToolTab("audio");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : m.errors.voiceoverFailed);
    } finally {
      setVoicePreviewBusy(false);
    }
  }

  async function applyVoiceover() {
    const script = voiceoverScript.trim();
    const selectedPreview = voicePreviewTracks.find(
      (tr) => tr.id === selectedVoicePreviewId,
    );
    const timelineVos = [...voClips]
      .filter((v) => Boolean(v.audioUrl?.trim()))
      .sort((a, b) => a.startSec - b.startSec);
    let captionLinesForMix = captionLines;
    if (
      captionLinesForMix.filter((l) => l.text.trim()).length < 1 &&
      !script &&
      !selectedPreview &&
      timelineVos.length === 0
    ) {
      setError(
        t.audioVoiceNeedCaptionLines.replace(
          "{n}",
          String(captionLinesForMix.filter((l) => l.text.trim()).length),
        ),
      );
      return;
    }
    if (!script && !selectedPreview && timelineVos.length === 0) {
      setError(t.audioVoiceNeedPreviewOrScript);
      return;
    }
    if (timelineClips.length === 0) {
      setError(t2.needVideo);
      return;
    }

    setAudioBusy(true);
    setError(null);
    setAudioNote(null);
    try {
      let voiceFitNote: string | null = null;
      const targetDurationSec = projectDur;
      if (selectedPreview?.audioUrl && timelineVos.length === 0) {
        const voiceSec =
          selectedPreview.durationSec ??
          (await probeAudioDurationSec(selectedPreview.audioUrl));
        const status = voiceTimingStatus(voiceSec, targetDurationSec);
        if (status.exceedsVideo) {
          const fitted = fitCaptionLinesToVoiceDuration(
            captionLinesForMix,
            voiceSec,
            targetDurationSec,
          );
          captionLinesForMix = fitted.lines;
          setCaptionLines(captionLinesForMix);
          voiceFitNote = t.voiceFittedCapped
            .replace("{voice}", voiceSec.toFixed(1))
            .replace("{video}", targetDurationSec.toFixed(1));
          setAudioNote(voiceFitNote);
        }
      }

      let videoUrl = await bakeTimelinePlate();
      const mixLines = captionLinesForMix.filter((l) => l.text.trim());

      const dubOnce = async (body: Record<string, unknown>) => {
        const res = await fetch("/api/dub-script-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await readApiJson(res);
        if (!res.ok || typeof data.videoUrl !== "string") {
          throw new Error(
            typeof data.error === "string" ? data.error : t.burnFailed,
          );
        }
        return toRelativePipelineUrl(data.videoUrl);
      };

      let speechStartSec = 0;
      if (timelineVos.length > 0) {
        // Mix every VO clip onto the plate in start order (keeps multi-section VO).
        for (const vo of timelineVos) {
          speechStartSec = vo.startSec;
          videoUrl = await dubOnce({
            video_url: videoUrl,
            locale: voiceoverLocale,
            target_duration_sec: targetDurationSec,
            speech_start_sec: vo.startSec,
            speech_url: vo.audioUrl,
            voice_volume: voiceVolume,
            under_voice_bgm_volume: underVoiceBgmVolume,
            mix_mode: "continuous",
          });
        }
      } else {
        const speechStart =
          captionVoiceStartSec(mixLines);
        speechStartSec = speechStart;
        const voiceBody: Record<string, unknown> = {
          video_url: videoUrl,
          locale: voiceoverLocale,
          target_duration_sec: targetDurationSec,
          speech_start_sec: speechStart,
          voice_volume: voiceVolume,
          under_voice_bgm_volume: underVoiceBgmVolume,
          mix_mode: "continuous",
        };
        if (selectedPreview) {
          voiceBody.voice_preset = selectedPreview.presetId;
          if (selectedPreview.audioUrl) {
            voiceBody.speech_url = selectedPreview.audioUrl;
          }
        }
        if (script) voiceBody.script = script;
        videoUrl = await dubOnce(voiceBody);

        const previewUrl = selectedPreview?.audioUrl ?? null;
        let voDur = selectedPreview?.durationSec ?? 0;
        if (previewUrl && !(voDur > 0)) {
          voDur = await probeAudioDurationSec(previewUrl);
        }
        if (previewUrl && voDur > 0) {
          const clip: VoClip = {
            id: `vo-${Date.now()}`,
            audioUrl: previewUrl,
            startSec: speechStart,
            durationSec: voDur,
            label: t2.nleVoLane,
          };
          setVoClips([clip]);
          setSelectedVoId(clip.id);
        }
      }

      await commitPlateToTimeline(videoUrl, sourceLabel || "VO mix");

      const doneNote =
        speechStartSec > 0.05
          ? t.audioVoiceDoneAtCaption.replace(
              "{sec}",
              speechStartSec.toFixed(1),
            )
          : t.audioVoiceDone;
      const multi =
        timelineVos.length > 1
          ? ` · ${timelineVos.length} VO`
          : "";
      const msg = `${voiceFitNote ? `${voiceFitNote} ` : ""}${doneNote}${multi}`;
      setAudioNote(msg);
      setNote(msg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setAudioBusy(false);
    }
  }

  async function applyBgm() {
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
      const plate = await bakeTimelinePlate();
      const body: Record<string, unknown> = {
        video_url: plate,
        replace_source_audio: replaceSourceAudio,
        start_sec: bgmStartSec,
        duration_sec: effectiveBgmDuration,
        volume: bgmVolume,
      };
      if (musicSource === "ai" && selectedAi?.audioUrl) {
        body.music_url = selectedAi.audioUrl;
      } else {
        body.track = bgmTrack;
      }
      const res = await fetch("/api/add-bgm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await readApiJson(res);
      if (!res.ok || typeof data.videoUrl !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : t.burnFailed,
        );
      }
      await commitPlateToTimeline(data.videoUrl, sourceLabel || "BGM mix");
      setBgmDurationSec(effectiveBgmDuration);
      const placeNote =
        bgmStartSec > 0.05 || effectiveBgmDuration < projectDur - 0.15
          ? ` · ${bgmStartSec.toFixed(1)}s–${(bgmStartSec + effectiveBgmDuration).toFixed(1)}s`
          : "";
      const demoNote =
        musicSource === "library" ? ` · ${t.libraryBgmDisclaimer}` : "";
      const msg = `${t.audioBgmDone}${placeNote}${demoNote}`;
      setAudioNote(msg);
      setNote(msg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setAudioBusy(false);
    }
  }

  async function burnCaptions() {
    const usable = captionLines.filter((l) => l.text.trim());
    if (usable.length === 0) {
      setError(t2.burnNeedLines);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const burnUrl = await bakeTimelinePlate();
      const res = await fetch("/api/burn-script-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          video_url: burnUrl,
          caption_lines: usable,
          caption_style: {
            preset: defaultStylePreset,
          },
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok || typeof data.videoUrl !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : t.burnFailed,
        );
      }
      // Keep pre-burn plate as "show original" reference.
      setOriginalSourceUrl(toRelativePipelineUrl(burnUrl));
      await commitPlateToTimeline(data.videoUrl, sourceLabel || "Burned");
      setNote(t.appliedNote);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.burnFailed);
    } finally {
      setBusy(false);
    }
  }

  async function exportTimelinePlate() {
    setBusy(true);
    setError(null);
    try {
      const plate = await bakeTimelinePlate();
      setOriginalSourceUrl(toRelativePipelineUrl(plate));
      await commitPlateToTimeline(plate, sourceLabel || "Export");
      setNote(t2.exportDone);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t2.joinFailed);
    } finally {
      setBusy(false);
    }
  }

  function updateLine(index: number, patch: Partial<CaptionLine>) {
    setCaptionLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function seekPreviewTo(sec: number) {
    setPlayheadSec(Math.max(0, Math.min(projectDur, sec)));
  }

  function onUndo() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1]!;
      setTimelineClips(snap.clips);
      setCaptionLines(snap.captions);
      setBgmStartSec(snap.bgmStartSec);
      setBgmDurationSec(snap.bgmDurationSec);
      setVoClips(snap.voClips ?? []);
      setSelectedVoId(snap.selectedVoId ?? null);
      return prev.slice(0, -1);
    });
  }

  function doSplitAtPlayhead() {
    const next = splitClipAt(timelineClips, playheadSec);
    if (!next) {
      setNote(t2.nleSplitNeedInterior);
      return;
    }
    setClipsWithUndo(next);
    setNote(t2.nleSplitDone);
  }

  function doDeleteSelectedClip() {
    if (!selectedClipId) return;
    if (timelineClips.length <= 1) {
      setError(t2.nleKeepOne);
      return;
    }
    setClipsWithUndo((prev) => deleteClipAt(prev, selectedClipId));
    setSelectedClipId(null);
  }

  useEffect(() => {
    if (!hasWorkspace) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        const v = previewVideoRef.current;
        if (!v) return;
        if (v.paused) void v.play().catch(() => undefined);
        else v.pause();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        doSplitAtPlayhead();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        doDeleteSelectedClip();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional board shortcuts
  }, [
    hasWorkspace,
    timelineClips,
    playheadSec,
    selectedClipId,
    undoStack.length,
  ]);

  async function onDownload() {
    if (!processedVideoUrl) return;
    setDownloadBusy(true);
    setError(null);
    try {
      await downloadVideoBlob(processedVideoUrl, "captions.mp4");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.downloadFailed);
    } finally {
      setDownloadBusy(false);
    }
  }

  const usableLineCount = captionLines.filter((l) => l.text.trim()).length;

  return (
    <>
      {/* Injected like StudioGlowShell — globals.css alone was stacking as a column in the browser. */}
      <style>{`
        .c2-capcut {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          background: rgba(2,6,23,0.92);
        }
        .c2-capcut-top {
          display: flex !important;
          flex-direction: row !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .c2-capcut-media {
          flex: 0 0 200px !important;
          width: 200px !important;
          max-width: 200px !important;
          border-right: 1px solid rgba(255,255,255,0.1);
          overflow: auto !important;
        }
        .c2-capcut-preview {
          flex: 1 1 0% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: stretch !important;
          background: #05070f !important;
          overflow: hidden !important;
          padding: 0.5rem !important;
        }
        .c2-capcut-preview-stage {
          position: relative !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .c2-capcut-props {
          flex: 0 0 300px !important;
          width: 300px !important;
          max-width: 300px !important;
          border-left: 1px solid rgba(255,255,255,0.1);
          overflow: auto !important;
        }
        .c2-capcut-timeline {
          flex: 0 0 var(--c2-timeline-h, 200px) !important;
          height: var(--c2-timeline-h, 200px) !important;
          min-height: 140px !important;
          max-height: min(55vh, 560px) !important;
          border-top: none !important;
          overflow: hidden !important;
        }
        .c2-capcut-timeline-resize {
          flex: 0 0 6px !important;
          height: 6px !important;
          cursor: row-resize !important;
          background: rgba(148, 163, 184, 0.15) !important;
          border-top: 1px solid rgba(255,255,255,0.12) !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .c2-capcut-timeline-resize:hover,
        .c2-capcut-timeline-resize:active {
          background: rgba(34, 211, 238, 0.35) !important;
        }
        @media (max-width: 700px) {
          .c2-capcut { height: auto !important; max-height: none !important; overflow: visible !important; }
          .c2-capcut-top { flex-direction: column !important; }
          .c2-capcut-media, .c2-capcut-props {
            flex: none !important; width: 100% !important; max-width: none !important;
            border: none !important; max-height: 200px !important;
          }
          .c2-capcut-timeline { flex: none !important; height: auto !important; min-height: 180px !important; }
        }
      `}</style>
    <div className={hasWorkspace ? "flex h-full min-h-0 flex-col gap-2" : "space-y-3"}>
      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {warn ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          <p>{warn}</p>
          <button
            type="button"
            className="mt-1 text-xs underline hover:text-white"
            onClick={() => setToolTab("audio")}
          >
            {t2.tabAudio}
          </button>
        </div>
      ) : null}
      {note && !hasWorkspace ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {note}
        </p>
      ) : null}
      {note && hasWorkspace ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-xl border border-emerald-400/40 bg-emerald-950/95 px-4 py-2.5 text-center text-sm text-emerald-50 shadow-lg">
          {note}
        </div>
      ) : null}

      {!hasWorkspace ? (
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h2 className="text-lg font-semibold text-white">{t.uploadTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{t2.importHint}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {busy ? "…" : t.chooseFile}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setLibraryPickMode("replace");
                setLibraryOpen(true);
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {t.chooseFromLibrary}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onPickFile(f);
              }}
            />
          </div>
        </section>
      ) : null}

      {hasWorkspace ? (
        <div className="c2-capcut">
          <div className="c2-capcut-top">
            {/* CapCut: media bin (left) */}
            <aside className="c2-capcut-media space-y-2 p-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t2.mediaBin}
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-cyan-500 px-2 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-50"
                >
                  {t.chooseFile}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setLibraryPickMode("replace");
                    setLibraryOpen(true);
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-white disabled:opacity-50"
                >
                  {t.chooseFromLibrary}
                </button>
                <p className="px-0.5 pt-1 text-[9px] uppercase tracking-wide text-slate-600">
                  {t2.addClip}
                </p>
                <button
                  type="button"
                  disabled={busy || timelineClips.length >= 8}
                  onClick={() => {
                    setLibraryPickMode("append");
                    setLibraryOpen(true);
                  }}
                  className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-100 disabled:opacity-50"
                >
                  {t2.addClipFromLibrary}
                </button>
                <button
                  type="button"
                  disabled={busy || timelineClips.length >= 8}
                  onClick={() => mediaAddInputRef.current?.click()}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
                >
                  {t2.addClipFromFile}
                </button>
              </div>
              <ul className="mt-2 space-y-1.5">
                {timelineClips.map((clip, i) => {
                  const active = clip.id === selectedClipId;
                  return (
                    <li key={clip.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClipId(clip.id);
                          setPlayheadSec(
                            packClipsMagnetically(timelineClips)[i]
                              ?.timelineStartSec ?? 0,
                          );
                          setToolTab("edit");
                        }}
                        className={`w-full rounded-lg border px-2 py-2 text-left ${
                          active
                            ? "border-cyan-400/60 bg-cyan-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <p className="truncate text-[11px] font-medium text-white">
                          {clip.label || t2.clipN(i + 1)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(clip.sourceOutSec - clip.sourceInSec).toFixed(1)}s
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <input
                ref={mediaAddInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void uploadVideoFileToLibrary(
                    f,
                    t.uploadNeedCorsOrLibrary,
                  ).then((url) => addTimelineClip(url, f.name || t2.clipN(timelineClips.length + 1)));
                }}
              />
              <button
                type="button"
                className="px-1 text-[10px] text-slate-500 underline"
                onClick={clearWorkspace}
              >
                {t.changeVideo}
              </button>
            </aside>

            {/* CapCut: preview (center) */}
            <section className="c2-capcut-preview">
              <div className="mb-1 flex w-full shrink-0 items-center justify-between gap-2 px-1">
                <p className="truncate text-xs text-slate-400">
                  {playheadSec.toFixed(1)}s / {projectDur.toFixed(1)}s
                </p>
                {processedVideoUrl || originalSourceUrl ? (
                  <button
                    type="button"
                    className="text-[10px] text-slate-400 underline"
                    onClick={() => setShowOriginal((v) => !v)}
                  >
                    {showOriginal ? t2.showProcessed : t.showOriginal}
                  </button>
                ) : null}
              </div>
              <div className="c2-capcut-preview-stage relative">
                {flatPreviewSrc || playheadSource || localPreviewUrl || sourceUrl ? (
                  <div
                    className="relative h-full max-h-full w-auto"
                    style={{ aspectRatio: "9 / 16" }}
                  >
                    <CaptionProgramMonitor
                      ref={previewVideoRef}
                      clips={timelineClips}
                      playheadSec={playheadSec}
                      projectDur={projectDur}
                      flatSrc={flatPreviewSrc}
                      showOriginal={showOriginal}
                      onPlayhead={setPlayheadSec}
                    />
                    {!showOriginal ? (
                      <CaptionLiveOverlay
                        lines={captionLines}
                        playheadSec={playheadSec}
                        selectedIndex={selectedCaptionIndex}
                        defaultStylePreset={defaultStylePreset}
                        onSelect={(i) => {
                          setSelectedCaptionIndex(i);
                          setToolTab("captions");
                        }}
                        onUpdate={(index, patch) => {
                          pushUndo();
                          setCaptionLines((prev) =>
                            prev.map((line, i) =>
                              i === index ? { ...line, ...patch } : line,
                            ),
                          );
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {/* CapCut: properties (right) */}
            <aside className="c2-capcut-props space-y-2 p-2">
              <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
                {(
                  [
                    ["edit", t2.tabEdit],
                    ["captions", t2.tabCaptions],
                    ["audio", t2.tabAudio],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setToolTab(id)}
                    className={
                      toolTab === id
                        ? "flex-1 rounded-md bg-white/15 px-1.5 py-1.5 text-[10px] font-semibold text-white"
                        : "flex-1 rounded-md px-1.5 py-1.5 text-[10px] text-slate-400 hover:text-slate-200"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {toolTab === "edit" ? (
                <CaptionPicturePhase
                  labels={{
                    pictureTitle: t2.pictureTitle,
                    pictureHint: t2.pictureHintSelected,
                    jobProduct: t2.jobProduct,
                    jobScene: t2.jobScene,
                    jobStyle: t2.jobStyle,
                    refPhoto: t2.refPhoto,
                    refHint: t2.refHint,
                    noteLabel: t2.editNoteLabel,
                    notePlaceholder: t2.editNotePlaceholder,
                    generate: t2.editGenerate,
                    generating: t2.editGenerating,
                    skipPicture: t2.tabCaptions,
                    costHint: t2.editCostHint,
                    needRefOrNote: t2.needRefOrNote,
                    downloadEdited: t2.downloadEdited,
                    downloadingEdited: t2.downloadingEdited,
                    continueStructure: t2.tabCaptions,
                    cancelEdit: t2.editCancel,
                  }}
                  disabled={busy}
                  busy={editBusy}
                  durationSec={selectedEditDurationSec}
                  progressLabel={
                    editStage === "trim"
                      ? t2.editStageTrim
                      : editStage === "generate"
                        ? t2.editStageGenerate
                        : null
                  }
                  job={editJob}
                  note={editNote}
                  refImageUrl={refImageUrl}
                  editedVideoUrl={editedVideoUrl}
                  downloadBusy={editDownloadBusy}
                  onJob={setEditJob}
                  onNote={setEditNote}
                  onRefImage={(url) => setRefImageUrl(url)}
                  onGenerate={() => void runPictureEdit()}
                  onCancel={() => editAbortRef.current?.abort()}
                  onSkip={() => setToolTab("captions")}
                  onDownloadEdited={() => void downloadEditedClip()}
                  uploadImage={uploadImageFile}
                />
              ) : null}

              {toolTab === "captions" ? (
                <div className="space-y-2 rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCaptionMode("pure")}
                      className={
                        captionMode === "pure"
                          ? "rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-bold text-slate-950"
                          : "rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-slate-200"
                      }
                    >
                      {t2.modePure}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionMode("speech")}
                      className={
                        captionMode === "speech"
                          ? "rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-bold text-slate-950"
                          : "rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-slate-200"
                      }
                    >
                      {t2.modeSpeech}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionMode("ai")}
                      className={
                        captionMode === "ai"
                          ? "rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-bold text-slate-950"
                          : "rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-slate-200"
                      }
                    >
                      {t2.modeAi}
                    </button>
                  </div>
                  <p className="text-[11px] text-cyan-100/75">
                    {captionMode === "speech"
                      ? t2.autoHint
                      : captionMode === "ai"
                        ? t2.aiPlanHint
                        : t2.pureHint}
                  </p>
                  {captionMode === "speech" ? (
                    <button
                      type="button"
                      disabled={transcribeBusy || !asrSourceUrl}
                      onClick={() => void runAutoTranscribe()}
                      className="w-full rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                    >
                      {transcribeBusy ? t2.transcribing : t2.autoCta}
                    </button>
                  ) : null}
                  {captionMode === "ai" ? (
                    <div className="space-y-2 rounded-lg border border-cyan-800/50 bg-cyan-950/40 p-2">
                      <div className="flex flex-wrap gap-1">
                        {(
                          [
                            ["hk", t.audioLocaleHk],
                            ["cn", t.audioLocaleCn],
                            ["en", t.audioLocaleEn],
                          ] as const
                        ).map(([loc, label]) => (
                          <button
                            key={`cap-ai-loc-${loc}`}
                            type="button"
                            disabled={planCaptionVoiceBusy}
                            onClick={() => setVoiceoverLocale(loc)}
                            className={
                              voiceoverLocale === loc
                                ? "rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] text-white"
                                : "rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-slate-300"
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={musicTopic}
                        disabled={planCaptionVoiceBusy}
                        onChange={(e) => setMusicTopic(e.target.value)}
                        placeholder={t.planCaptionVoiceTopicPlaceholder}
                        className="w-full rounded-lg border border-cyan-800/60 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        disabled={
                          planCaptionVoiceBusy ||
                          !musicTopic.trim() ||
                          timelineClips.length === 0
                        }
                        onClick={() => void planCaptionsAndVoiceFromTopic()}
                        className="w-full rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                      >
                        {planCaptionVoiceBusy
                          ? t.planningCaptionVoice
                          : t.planCaptionVoice}
                      </button>
                      <button
                        type="button"
                        disabled={
                          planCaptionVoiceBusy ||
                          !musicTopic.trim() ||
                          timelineClips.length === 0
                        }
                        onClick={() => void planCaptionForSelectedSection()}
                        className="w-full rounded-lg border border-cyan-400/50 bg-cyan-950/50 px-3 py-2 text-xs font-medium text-cyan-100 disabled:opacity-50"
                      >
                        {planCaptionVoiceBusy
                          ? t.planningCaptionVoice
                          : (t2.sectionAiCaption ?? "AI caption this section")}
                      </button>
                      <button
                        type="button"
                        disabled={
                          voicePreviewBusy ||
                          audioBusy ||
                          timelineClips.length === 0
                        }
                        onClick={() => void generateVoForSelectedSection()}
                        className="w-full rounded-lg border border-violet-400/50 bg-violet-950/40 px-3 py-2 text-xs font-medium text-violet-100 disabled:opacity-50"
                      >
                        {voicePreviewBusy
                          ? t.audioApplyingVoice
                          : (t2.sectionAiVo ?? "Generate VO for this section")}
                      </button>
                      <p className="text-[10px] text-cyan-100/60">
                        {t2.sectionAiHint ??
                          "Select a clip or caption on the timeline first — one caption + one continuous VO for that range."}
                      </p>
                      <button
                        type="button"
                        className="w-full text-center text-[10px] text-cyan-200/80 underline"
                        onClick={() => setToolTab("audio")}
                      >
                        {t2.openAudioForVo}
                      </button>
                    </div>
                  ) : null}
                  <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                    {captionLines.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-500">
                        {t2.emptyLinesHint}
                      </p>
                    ) : (
                      captionLines.map((line, index) => (
                        <div
                          key={`line-${index}`}
                          className={
                            index === selectedCaptionIndex
                              ? "rounded-lg ring-1 ring-cyan-400/50"
                              : ""
                          }
                          onClick={() => {
                            setSelectedCaptionIndex(index);
                            seekPreviewTo(line.startSec);
                          }}
                        >
                          <CaptionLineEditor
                            line={line}
                            index={index}
                            timingLabel={t.timingLabel}
                            positionLabel={t.positionLabel}
                            positionOptions={t.positionOptions}
                            styleLabel={t.styleLabel}
                            multilineHint={t.multilineHint}
                            removeLabel={t.removeLine}
                            styleOptions={styleOptions}
                            defaultStylePreset={defaultStylePreset}
                            locale={locale}
                            onChange={(patch) => updateLine(index, patch)}
                            onRemove={() => {
                              pushUndo();
                              setCaptionLines((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-white/15 px-2 py-1.5 text-[11px] text-white"
                    onClick={() => {
                      pushUndo();
                      setCaptionLines((prev) => [
                        ...prev,
                        {
                          startSec: Math.max(0, projectDur - 2),
                          endSec: projectDur,
                          text: "",
                          position: "bottom",
                        },
                      ]);
                    }}
                  >
                    {t.addLine}
                  </button>
                </div>
              ) : null}

              {toolTab === "audio" ? (
                <div className="space-y-2">
                  <CaptionAudioSection
                    embedded
                    preferMusicOpen={toolTab === "audio"}
                    disabled={timelineClips.length === 0}
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
                    replaceSourceAudio={replaceSourceAudio}
                    onReplaceSourceAudioChange={setReplaceSourceAudio}
                    onApplyBgm={() => void applyBgm()}
                    bgmVolume={bgmVolume}
                    onBgmVolumeChange={setBgmVolume}
                    matchMusicToVideo={matchMusicToVideo}
                    onMatchMusicToVideoChange={setMatchMusicToVideo}
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
                    voClipCount={voClips.filter((v) => Boolean(v.audioUrl)).length}
                    costHints={{
                      applyBgm: t2.audioCostBgm(TOKEN_COST.bgm),
                      applyVoice: t2.audioCostVoice(
                        TOKEN_COST.voiceover *
                          Math.max(
                            1,
                            voClips.filter((v) => Boolean(v.audioUrl)).length || 1,
                          ),
                      ),
                      generateMusic: t2.audioCostMusic(TOKEN_COST.music),
                      voicePreview: t2.audioCostVoicePreview(TOKEN_COST.voiceover),
                    }}
                    voiceVolume={voiceVolume}
                    onVoiceVolumeChange={setVoiceVolume}
                    underVoiceBgmVolume={underVoiceBgmVolume}
                    onUnderVoiceBgmVolumeChange={setUnderVoiceBgmVolume}
                    onFillVoiceFromCaptions={fillVoiceFromCaptions}
                    captionLineCount={usableLineCount}
                    audioNote={audioNote}
                    audioError={error}
                    onOpenCaptionsPlan={() => {
                      setToolTab("captions");
                      setCaptionMode("ai");
                    }}
                    openCaptionsPlanLabel={t2.planOnCaptionsTab}
                    labels={{
                      title: t.audioTitle,
                      hint: t2.finishHint,
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
                      bgmVolumeLabel: t.bgmVolumeLabel,
                      matchVideoMusic: t.matchVideoMusic,
                      matchVideoMusicHint: t.matchVideoMusicHint,
                      audioReplaceOriginal: t.audioReplaceOriginal,
                      audioReplaceOriginalHint: t.audioReplaceOriginalHint,
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
                      voiceVolumeLabel: t.voiceVolumeLabel,
                      underVoiceBgmLabel: t.underVoiceBgmLabel,
                      localeHk: t.audioLocaleHk,
                      localeCn: t.audioLocaleCn,
                      localeEn: t.audioLocaleEn,
                      fillVoiceFromCaptions: t.fillVoiceFromCaptions,
                    }}
                  />
                  <p className="px-1 text-[10px] text-slate-500">{t2.bgmDragHint}</p>
                  <details className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 open:pb-2">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-200 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        {t.applyBtn}
                        <span className="text-[10px] opacity-70">+/−</span>
                      </span>
                    </summary>
                    <div className="space-y-2 px-3 pb-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void exportTimelinePlate()}
                    className="w-full rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-1.5 text-[11px] font-medium text-cyan-100 disabled:opacity-50"
                  >
                    {busy ? t2.exportingPlate : t2.exportPlate}
                  </button>
                  <button
                    type="button"
                    disabled={busy || usableLineCount === 0}
                    onClick={() => void burnCaptions()}
                    className="w-full rounded-lg bg-cyan-400 px-2 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {busy ? t.applying : t.applyBtn}
                  </button>
                  {usableLineCount > 0 ? (
                    <p className="text-center text-[10px] text-cyan-200/70">
                      {t2.audioCostBurn(TOKEN_COST.caption_burn)}
                    </p>
                  ) : null}
                  {usableLineCount === 0 ? (
                    <p className="text-[10px] text-slate-500">{t2.burnNeedLines}</p>
                  ) : null}
                  {processedVideoUrl ? (
                    <button
                      type="button"
                      disabled={downloadBusy}
                      onClick={() => void onDownload()}
                      className="w-full rounded-lg border border-emerald-400/40 px-2 py-1.5 text-[11px] text-emerald-200 disabled:opacity-50"
                    >
                      {downloadBusy ? t.downloading : t.downloadBtn}
                    </button>
                  ) : null}
                    </div>
                  </details>
                </div>
              ) : null}
            </aside>
          </div>

          {/* CapCut: drag to grow/shrink timeline vs preview */}
          <div
            className="c2-capcut-timeline-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize timeline"
            onPointerDown={(e) => {
              e.preventDefault();
              timelineDragRef.current = {
                startY: e.clientY,
                startH: timelinePx,
              };
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
            }}
          />
          {/* CapCut: full-width timeline (bottom) */}
          <div
            className="c2-capcut-timeline"
            id="c2-timeline"
            style={
              {
                ["--c2-timeline-h" as string]: `${timelinePx}px`,
              } as CSSProperties
            }
          >
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3 py-1">
                <p className="text-[10px] text-slate-500">{t2.stickyBoardHint}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void exportTimelinePlate()}
                    className="rounded-md border border-cyan-400/40 px-2.5 py-1 text-[10px] text-cyan-100 disabled:opacity-50"
                  >
                    {busy ? t2.exportingPlate : t2.exportPlate}
                  </button>
                  <button
                    type="button"
                    disabled={busy || usableLineCount === 0}
                    onClick={() => void burnCaptions()}
                    className="rounded-md bg-cyan-400 px-2.5 py-1 text-[10px] font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {busy ? t.applying : t.applyBtn}
                  </button>
                  {processedVideoUrl ? (
                    <button
                      type="button"
                      disabled={downloadBusy}
                      onClick={() => void onDownload()}
                      className="rounded-md border border-emerald-400/40 px-2.5 py-1 text-[10px] text-emerald-200 disabled:opacity-50"
                    >
                      {t.downloadBtn}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
                <CaptionNleTimeline
                  clips={timelineClips}
                  captions={captionLines}
                  selectedClipId={selectedClipId}
                  selectedCaptionIndex={selectedCaptionIndex}
                  playheadSec={playheadSec}
                  bgmStartSec={bgmStartSec}
                  bgmDurationSec={effectiveBgmDuration}
                  bgmLabel={bgmLabel}
                  voClips={voClips}
                  pxPerSec={pxPerSec}
                  canUndo={undoStack.length > 0}
                  labels={{
                    title: t2.nleTitle,
                    hint: t2.nleHint,
                    shortcuts: t2.nleShortcuts,
                    videoTrack: t.videoTrack,
                    captionTrack: t.captionTrack,
                    audioTrack: t2.nleAudioTrack,
                    split: t2.nleSplit,
                    deleteClip: t2.nleDelete,
                    undo: t2.nleUndo,
                    zoomIn: t2.nleZoomIn,
                    zoomOut: t2.nleZoomOut,
                    zoomFit: t2.nleZoomFit,
                    zoomLabel: t2.nleZoomLabel,
                    cutAt: t2.nleCutAt,
                    emptyVideo: t2.nleEmptyVideo,
                    emptyCaption: t2.nleEmptyCaption,
                    bgmLane: t2.nleBgmLane,
                    voLane: t2.nleVoLane,
                    selected: t2.nleSelected,
                  }}
                  onPlayhead={setPlayheadSec}
                  onSelectClip={(id) => {
                    setSelectedClipId(id);
                    setToolTab("edit");
                  }}
                  onSelectCaption={(i) => {
                    setSelectedCaptionIndex(i);
                    setToolTab("captions");
                    const line = captionLines[i];
                    if (line) seekPreviewTo(line.startSec);
                  }}
                  onHistoryCheckpoint={pushUndo}
                  onTrimClip={(clipId, edge, sourceSec) => {
                    setClipsLive((prev) =>
                      prev.map((c) =>
                        c.id === clipId ? trimClipEdge(c, edge, sourceSec) : c,
                      ),
                    );
                  }}
                  onReorderClip={(from, to) => {
                    setClipsLive((prev) => reorderClips(prev, from, to));
                  }}
                  onSplit={doSplitAtPlayhead}
                  onDeleteSelected={doDeleteSelectedClip}
                  onUndo={onUndo}
                  onUpdateCaption={(index, patch) => {
                    updateLine(index, patch);
                  }}
                  onBgmRange={(start, duration) => {
                    setBgmRange(start, duration);
                    setToolTab("audio");
                  }}
                  onVoStart={(id, sec) => {
                    setVoClips((prev) =>
                      prev.map((v) => (v.id === id ? { ...v, startSec: sec } : v)),
                    );
                    setSelectedVoId(id);
                    setToolTab("audio");
                  }}
                  onSelectVo={(id) => {
                    setSelectedVoId(id);
                    setToolTab("audio");
                  }}
                  onSelectAudio={() => setToolTab("audio")}
                  onPxPerSec={setPxPerSec}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <LibraryAssetPicker
        open={libraryOpen}
        kinds={["video"]}
        onClose={() => setLibraryOpen(false)}
        onPick={(asset) => {
          setLibraryOpen(false);
          if (!asset.downloadUrl) return;
          void (async () => {
            // redirect:manual — don't download the whole video; detect missing R2.
            const check = await fetch(asset.downloadUrl, {
              credentials: "include",
              redirect: "manual",
            }).catch(() => null);
            const status = check?.status ?? 0;
            const ok =
              status === 200 ||
              status === 302 ||
              status === 301 ||
              status === 307 ||
              status === 308;
            if (!ok) {
              setError(
                status === 404
                  ? t2.libraryFileMissing
                  : t.libraryPickerLoadError,
              );
              return;
            }
            if (libraryPickMode === "append") {
              await addTimelineClip(
                asset.downloadUrl,
                asset.name || t2.clipN(timelineClips.length + 1),
              );
              return;
            }
            const d = await probeVideoDuration(asset.downloadUrl);
            applySource(
              asset.downloadUrl,
              asset.name || t.sourceFromLibrary,
              undefined,
              d,
            );
            setNote(t2.readyPicture);
          })();
        }}
        labels={{
          title: t.libraryPickerTitle,
          loading: t.libraryPickerLoading,
          empty: t.libraryPickerEmpty,
          loadError: t.libraryPickerLoadError,
          cancel: t.libraryPickerCancel,
          useThis: t.libraryPickerUse,
          close: t.libraryPickerClose,
          missingFile: t.libraryPickerMissingFile,
        }}
      />
    </div>
    </>
  );
}
