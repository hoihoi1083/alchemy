"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import {
  isVideoOutputPathLocked,
  resolveVideoOutputPresentation,
  type VideoOutputPresentationId,
} from "@/lib/video-output-presentation";

const ICONS: Record<VideoOutputPresentationId, string> = {
  "storyboard-reel": "🎞️",
  "animate-keyframe": "📷→🎬",
  "reference-motion": "🎬↔️",
  "text-reel": "✍️→🎬",
  "product-assistant": "🤖",
  "cinematic-reel": "🎥",
  "digital-presenter": "🎙️",
};

type Variant = "setup" | "image" | "video";

type Props = {
  variant: Variant;
  className?: string;
};

export function VideoOutputSourceCard({ variant, className = "" }: Props) {
  const { m } = useLocale();
  const w = useWizard();

  const presentationId = resolveVideoOutputPresentation({
    workflowMode: w.workflowMode,
    usesCompositor: w.usesCompositor,
    isStoryboardOutput: w.isStoryboardOutput,
    isUgcPresenterOutput: w.isUgcPresenterOutput,
    shouldCinematicStitch:
      w.isCinematicStitchOutput ||
      (w.cinematicSceneCount > 1 && w.cinematicScenes.length >= w.cinematicSceneCount),
    isConceptCinematicSingleOutput: w.isConceptCinematicSingleOutput,
    usesProductAssistant: w.usesProductAssistant,
    conceptTextVideoReady:
      w.usesConceptTextVideo && Boolean(w.videoPrompt.trim()),
    videoCreativeMode: w.videoCreativeMode,
    useReferenceVideo: w.useReferenceVideo,
    hasReferenceAd: Boolean(w.referenceAd),
  });

  if (!presentationId) return null;

  const copy = m.wizard.videoOutputTypes[presentationId];
  const locked = isVideoOutputPathLocked(presentationId);
  const sceneCount =
    presentationId === "storyboard-reel" ? w.storyboardScenes.length : 0;
  const pipeline =
    presentationId === "storyboard-reel" && sceneCount > 0
      ? copy.pipelineReady.replace("{count}", String(sceneCount))
      : variant === "image" && presentationId === "storyboard-reel"
        ? copy.pipelineImageStep
        : copy.pipeline;

  const tone =
    presentationId === "storyboard-reel"
      ? "border-teal-700/50 bg-teal-950/30 text-teal-50"
      : presentationId === "digital-presenter"
        ? "border-rose-700/50 bg-rose-950/30 text-rose-50"
      : presentationId === "animate-keyframe"
        ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-50"
        : presentationId === "reference-motion"
          ? "border-amber-700/50 bg-amber-950/30 text-amber-50"
          : "border-violet-700/50 bg-violet-950/30 text-violet-50";

  const setupTone =
    variant === "setup"
      ? "border-slate-200 bg-violet-50/90 text-violet-950"
      : tone;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${variant === "setup" ? setupTone : tone} ${className}`}
      data-testid="video-output-source-card"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {ICONS[presentationId]}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
            {m.wizard.videoOutputLabel}
          </p>
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className={`text-xs leading-relaxed ${variant === "setup" ? "text-violet-800" : "opacity-90"}`}>
            {pipeline}
          </p>
          <p className={`text-[11px] leading-relaxed ${variant === "setup" ? "text-violet-700" : "opacity-75"}`}>
            {copy.confidence}
          </p>
          {locked && variant !== "setup" && (
            <p className="text-[10px] opacity-60">{m.wizard.videoOutputPathLockedHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
