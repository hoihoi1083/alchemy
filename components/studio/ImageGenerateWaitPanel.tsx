"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  GenerationWaitPlaceholder,
  waitAspectFromString,
  type WaitAspectRatio,
} from "@/components/studio/GenerationWaitPlaceholder";
import { ImageReviewStepper } from "@/components/studio/ImageReviewStepper";
import type { ProgressInfo } from "@/hooks/useWizardProgress";
import { generateWaitPhaseIndex } from "@/lib/studio-phases";
import type { WorkflowMode } from "@/lib/workflow-mode";

const WAIT_PANEL_CSS = `
.igw-page {
  background: #ffffff;
  color: #0f172a;
  min-width: 0;
  max-width: 100%;
}
.igw-panel {
  border-radius: 1.25rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  min-width: 0;
}
.igw-panel-body { padding: 1.15rem 1rem 1.25rem; }
.igw-title {
  margin-top: 0.25rem;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #0f172a;
  text-wrap: balance;
}
.igw-hint {
  margin-top: 0.4rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #64748b;
}
.igw-progress-track {
  height: 0.5rem;
  width: 100%;
  border-radius: 9999px;
  background: #f5f3ff;
  overflow: hidden;
}
.igw-progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: #6c3bff;
  box-shadow: 0 0 0 1px rgba(108,59,255,0.08);
  transition: width 0.4s ease;
}
@media (max-width: 639px) {
  .igw-page { margin-left: 0; margin-right: 0; }
  .igw-panel { border-radius: 1rem; }
  .igw-panel-body { padding: 0.95rem 0.85rem 1.05rem; }
  .igw-title { font-size: 1.125rem; }
}
@media (min-width: 640px) {
  .igw-title { font-size: 1.5rem; }
  .igw-panel-body { padding: 1.25rem 1.15rem 1.35rem; }
}
@media (min-width: 768px) {
  .igw-panel-body { padding: 1.35rem 1.5rem 1.5rem; }
}
`;

type Props = {
  message: string;
  progress?: ProgressInfo | null;
  aspectRatio?: string | WaitAspectRatio | null;
  previewUrl?: string | null;
  /** Hide the 5-step rail (rare). */
  showStepper?: boolean;
  /** Override default “Generate image” title (e.g. video wait). */
  title?: string;
  workflowMode?: WorkflowMode | null;
  /** Which generate wait this is — drives path-aware phase highlight. */
  waitKind?: "image" | "video" | "storyboard";
};

/**
 * Violet chrome wait screen for image/video generation — matches CreationPath /
 * ProductName / review steps (stepper + white panel, no cyan ScreenShell).
 */
export function ImageGenerateWaitPanel({
  message,
  progress,
  aspectRatio,
  previewUrl,
  showStepper = true,
  title,
  workflowMode = null,
  waitKind = "image",
}: Props) {
  const { m } = useLocale();
  const mw = m.microWizard;
  const pct =
    progress && typeof progress.pct === "number"
      ? Math.max(0, Math.min(100, Math.round(progress.pct)))
      : null;

  return (
    <div className="igw-page w-full min-w-0">
      <style dangerouslySetInnerHTML={{ __html: WAIT_PANEL_CSS }} />

      {showStepper ? (
        <ImageReviewStepper
          workflowMode={workflowMode}
          kind={waitKind === "video" ? "video" : waitKind === "storyboard" ? "storyboard" : "image"}
          activeIndex={generateWaitPhaseIndex(workflowMode, waitKind)}
        />
      ) : null}

      <div className={`igw-panel${showStepper ? " mt-3" : ""}`}>
        <div className="igw-panel-body">
          <p className="text-[13px] font-bold tracking-[0.12em] text-violet-600 sm:text-[15px]">
            {mw.generateWaitEyebrow}
          </p>
          <h2 className="igw-title">{title ?? mw.generateImageTitle}</h2>
          <p className="igw-hint">{m.wizard.generationWaitHint}</p>

          <div className="mt-3 min-w-0 sm:mt-4">
            <GenerationWaitPlaceholder
              message={progress?.label?.trim() || message}
              aspectRatio={waitAspectFromString(
                typeof aspectRatio === "string" ? aspectRatio : aspectRatio ?? undefined,
              )}
              previewUrl={previewUrl}
              progress={progress}
              compact
            />
          </div>

          {pct != null ? (
            <div className="mt-3 space-y-2 sm:mt-4">
              <div className="igw-progress-track" aria-hidden>
                <div className="igw-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-center text-[11px] font-medium text-violet-700 sm:text-xs">
                {pct}%
                {progress?.eta ? (
                  <span className="font-normal text-slate-500"> · {progress.eta}</span>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
