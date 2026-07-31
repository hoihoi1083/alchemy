"use client";

import { useLocale } from "@/components/LocaleProvider";

/**
 * Final-step progress strip for the image review screen.
 * Matches the path-phase rail used on other wizard start steps:
 * steps 1–4 complete, step 5 “Generate content” active.
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
}
.image-review-phase-dot--active {
  background: #7c3aed;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.16);
}
.image-review-phase-dot--done {
  background: #7c3aed;
  color: #fff;
}
.image-review-phase-dot--idle {
  background: #f1f5f9;
  color: #94a3b8;
}
.image-review-phase-label {
  font-size: 11px;
  line-height: 1.25;
  max-width: 7.5rem;
  font-weight: 500;
  color: #94a3b8;
}
.image-review-phase-item.is-active .image-review-phase-label {
  font-weight: 600;
  color: #6d28d9;
}
@media (min-width: 640px) {
  .image-review-phase-rail {
    gap: 0.35rem;
    padding: 0.35rem 0.25rem 0.85rem;
  }
  .image-review-phase-line {
    top: calc(0.35rem + 16px);
    left: calc(0.25rem + 16px);
    right: calc(0.25rem + 16px);
  }
  .image-review-phase-dot {
    height: 2rem;
    width: 2rem;
    font-size: 12px;
  }
  .image-review-phase-item {
    gap: 0.45rem;
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
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.16);
  }
  .image-review-phase-label { display: none; }
  .image-review-phase-item.is-active .image-review-phase-label {
    display: block;
    max-width: 4.25rem;
    font-size: 10px;
  }
}
`;

export function ImageReviewStepper() {
  const { m } = useLocale();
  const steps = m.wizard.imageReviewSteps;
  if (!steps?.length) return null;

  const activeIndex = steps.length - 1;

  return (
    <nav aria-label="Progress" className="w-full border-b border-slate-100">
      <style dangerouslySetInnerHTML={{ __html: REVIEW_STEPPER_CSS }} />
      <ol className="image-review-phase-rail">
        <span className="image-review-phase-line" aria-hidden />
        {steps.map((label, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
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
