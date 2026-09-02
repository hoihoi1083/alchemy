"use client";

type Props = {
  label: string;
  sublabel?: string;
  pct: number;
  className?: string;
  /** Rendered inside the dark wait frame — tighter, no outer margin. */
  embedded?: boolean;
};

const BAR_CSS = `
@keyframes gen-progress-shimmer {
  0% { transform: translateX(-100%); opacity: 0; }
  25% { opacity: 0.45; }
  100% { transform: translateX(180%); opacity: 0; }
}
.gen-progress-bar {
  position: relative;
  overflow: hidden;
  border-radius: 0.65rem;
  border: 1px solid rgba(124, 58, 237, 0.45);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.07) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35),
    0 4px 20px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
}
.gen-progress-bar--embedded {
  border-radius: 0.6rem;
  border-color: rgba(139, 92, 246, 0.5);
}
.gen-progress-fill {
  pointer-events: none;
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    #3b0764 0%,
    #4c1d95 28%,
    #5b21b6 58%,
    #6d28d9 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 18px rgba(91, 33, 182, 0.65);
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.gen-progress-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 65%
  );
  animation: gen-progress-shimmer 3s ease-in-out infinite;
}
.gen-progress-inner {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.75rem;
}
.gen-progress-bar--embedded .gen-progress-inner {
  min-height: 2.5rem;
  padding: 0.45rem 0.7rem;
}
@media (min-width: 640px) {
  .gen-progress-inner {
    min-height: 2.85rem;
    padding: 0.55rem 0.85rem;
  }
}
.gen-progress-copy {
  min-width: 0;
  flex: 1;
}
.gen-progress-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.96);
}
@media (min-width: 640px) {
  .gen-progress-label { font-size: 0.8125rem; }
}
.gen-progress-sublabel {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 0.08rem;
  font-size: 0.625rem;
  line-height: 1.35;
  color: rgba(196, 181, 253, 0.78);
}
@media (min-width: 640px) {
  .gen-progress-sublabel { font-size: 0.6875rem; }
}
.gen-progress-pct {
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: #f5f3ff;
}
@media (min-width: 640px) {
  .gen-progress-pct { font-size: 1.125rem; }
}
@media (prefers-reduced-motion: reduce) {
  .gen-progress-fill::after {
    animation: none;
  }
  .gen-progress-fill {
    transition: none;
  }
}
`;

/**
 * Dark-glass progress bar — deep violet fill on the wait-frame backdrop.
 * Sits inside the generation preview card so unfilled area stays dark, not grey.
 */
export function GenerationProgressBar({
  label,
  sublabel,
  pct,
  className = "",
  embedded = false,
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const fillWidth = clamped <= 0 ? 0 : Math.max(3, clamped);

  return (
    <div
      className={`gen-progress-bar${embedded ? " gen-progress-bar--embedded" : ""} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <style dangerouslySetInnerHTML={{ __html: BAR_CSS }} />
      <div className="gen-progress-fill" style={{ width: `${fillWidth}%` }} aria-hidden />
      <div className="gen-progress-inner">
        <div className="gen-progress-copy">
          <span className="gen-progress-label">{label}</span>
          {sublabel ? <span className="gen-progress-sublabel">{sublabel}</span> : null}
        </div>
        <span className="gen-progress-pct">{clamped}%</span>
      </div>
    </div>
  );
}
