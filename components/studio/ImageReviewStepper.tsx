"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  imageReviewPhaseIndex,
  studioPhasesForMode,
  videoReviewPhaseIndex,
} from "@/lib/studio-phases";
import type { WorkflowMode } from "@/lib/workflow-mode";

/**
 * Progress strip for wait + image/video review — path-aware phase labels.
 */
const REVIEW_STEPPER_CSS = `
.image-review-phase-rail {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.25rem;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0.35rem 0.15rem 0.85rem;
}
.image-review-phase-line {
  position: absolute;
  top: calc(0.35rem + 14px);
  left: calc(0.15rem + 14px);
  right: calc(0.15rem + 14px);
  border-top: 2px dotted #cbd5e1;
  z-index: 0;
  pointer-events: none;
}
.image-review-phase-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
}
.image-review-phase-dot {
  display: flex;
  height: 1.75rem;
  width: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.image-review-phase-dot--active {
  background: #6c3bff;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(108, 59, 255, 0.16);
}
.image-review-phase-dot--done {
  background: #6c3bff;
  color: #fff;
}
.image-review-phase-dot--idle {
  background: #e2e8f0;
  color: #94a3b8;
}
.image-review-phase-label {
  font-size: 11px;
  line-height: 1.25;
  max-width: 7.5rem;
  color: #64748b;
}
.image-review-phase-item.is-active .image-review-phase-label {
  color: #5b2fe0;
  font-weight: 600;
}
@media (min-width: 640px) {
  .image-review-phase-rail {
    padding: 0.55rem 0.25rem 1rem;
  }
  .image-review-phase-line {
    top: calc(0.55rem + 14px);
    left: calc(0.25rem + 14px);
    right: calc(0.25rem + 14px);
  }
  .image-review-phase-dot {
    height: 2rem;
    width: 2rem;
    font-size: 12px;
  }
  .image-review-phase-label {
    font-size: 12px;
  }
}
@media (max-width: 639px) {
  .image-review-phase-rail {
    padding: 0.25rem 0.1rem 0.7rem;
  }
  .image-review-phase-line {
    top: calc(0.25rem + 14px);
    left: calc(0.1rem + 14px);
    right: calc(0.1rem + 14px);
  }
  .image-review-phase-dot--active {
    box-shadow: 0 0 0 3px rgba(108, 59, 255, 0.16);
  }
  .image-review-phase-label { display: none; }
  .image-review-phase-item.is-active .image-review-phase-label {
    display: block;
    max-width: 4.25rem;
    font-size: 10px;
  }
}
`;

type Props = {
  /** Override index; otherwise derived from workflowMode + kind. */
  activeIndex?: number;
  workflowMode?: WorkflowMode | null;
  kind?: "image" | "storyboard" | "video";
};

export function ImageReviewStepper({
  activeIndex,
  workflowMode = null,
  kind = "image",
}: Props) {
  const { m } = useLocale();
  const steps = studioPhasesForMode(m.start, workflowMode);
  if (!steps?.length) return null;

  const derived =
    activeIndex != null
      ? activeIndex
      : kind === "video"
        ? videoReviewPhaseIndex()
        : imageReviewPhaseIndex(workflowMode, {
            isStoryboard: kind === "storyboard",
          });

  const safeIndex = Math.min(Math.max(derived, 0), steps.length - 1);

  return (
    <nav aria-label="Progress" className="w-full border-b border-slate-100">
      <style dangerouslySetInnerHTML={{ __html: REVIEW_STEPPER_CSS }} />
      <ol className="image-review-phase-rail">
        <span className="image-review-phase-line" aria-hidden />
        {steps.map((label, i) => {
          const done = i < safeIndex;
          const active = i === safeIndex;
          return (
            <li
              key={`${label}-${i}`}
              className={`image-review-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              <span
                className={`image-review-phase-dot ${
                  active
                    ? "image-review-phase-dot--active"
                    : done
                      ? "image-review-phase-dot--done"
                      : "image-review-phase-dot--idle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="image-review-phase-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
