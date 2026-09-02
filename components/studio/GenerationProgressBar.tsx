"use client";

type Props = {
  label: string;
  sublabel?: string;
  pct: number;
  className?: string;
};

const BAR_CSS = `
@keyframes gen-progress-stripes {
  0% { background-position: 0 0; }
  100% { background-position: 28px 0; }
}
@keyframes gen-progress-sheen {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
}
@keyframes gen-progress-glow {
  0%, 100% { opacity: 0.55; transform: scaleY(1); }
  50% { opacity: 1; transform: scaleY(1.15); }
}
@keyframes gen-progress-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.35); }
  50% { box-shadow: 0 0 0 4px rgba(139, 92, 246, 0); }
}

.gen-progress {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  min-width: 0;
}
.gen-progress-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
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
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #4c1d95;
}
.gen-progress-sublabel {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 0.1rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: #7c3aed;
}
.gen-progress-pct {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(139, 92, 246, 0.35);
  background: linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%);
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: #5b21b6;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
@media (min-width: 640px) {
  .gen-progress-label { font-size: 0.875rem; }
  .gen-progress-sublabel { font-size: 0.75rem; }
  .gen-progress-pct { font-size: 0.875rem; min-width: 3.25rem; }
}

.gen-progress-track {
  position: relative;
  overflow: hidden;
  height: 0.85rem;
  border-radius: 999px;
  border: 1px solid #ddd6fe;
  background:
    linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%);
  box-shadow:
    inset 0 1px 2px rgba(91, 33, 182, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.8);
}
@media (min-width: 640px) {
  .gen-progress-track { height: 0.95rem; }
}

.gen-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(
    105deg,
    #4c1d95 0%,
    #6d28d9 22%,
    #7c3aed 48%,
    #a855f7 72%,
    #e879f9 100%
  );
  background-size: 200% 100%;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 0 12px rgba(168, 85, 247, 0.45),
    0 0 2px rgba(124, 58, 237, 0.5);
  transition: width 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  animation: gen-progress-pulse 2.4s ease-in-out infinite;
}
.gen-progress-fill::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    -55deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0) 8px,
    rgba(255, 255, 255, 0.18) 8px,
    rgba(255, 255, 255, 0.18) 14px
  );
  background-size: 28px 28px;
  animation: gen-progress-stripes 0.85s linear infinite;
  opacity: 0.9;
}
.gen-progress-fill::after {
  content: "";
  position: absolute;
  top: -40%;
  bottom: -40%;
  width: 42%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 35%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(255, 255, 255, 0.08) 65%,
    transparent 100%
  );
  animation: gen-progress-sheen 2.1s ease-in-out infinite;
}

.gen-progress-tip {
  position: absolute;
  top: 50%;
  right: 0;
  width: 0.7rem;
  height: 140%;
  transform: translate(35%, -50%);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(233, 213, 255, 0.7) 35%,
    rgba(168, 85, 247, 0) 70%
  );
  animation: gen-progress-glow 1.6s ease-in-out infinite;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .gen-progress-fill {
    animation: none;
    transition: none;
  }
  .gen-progress-fill::before,
  .gen-progress-fill::after,
  .gen-progress-tip {
    animation: none;
  }
}
`;

/**
 * Generation progress — label/ETA above a slim animated track
 * (gradient + marching stripes + sheen + tip glow).
 */
export function GenerationProgressBar({
  label,
  sublabel,
  pct,
  className = "",
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const fillWidth = clamped <= 0 ? 0 : Math.max(4, clamped);

  return (
    <div
      className={`gen-progress ${className}`.trim()}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <style dangerouslySetInnerHTML={{ __html: BAR_CSS }} />
      <div className="gen-progress-meta">
        <div className="gen-progress-copy">
          <span className="gen-progress-label">{label}</span>
          {sublabel ? <span className="gen-progress-sublabel">{sublabel}</span> : null}
        </div>
        <span className="gen-progress-pct">{clamped}%</span>
      </div>
      <div className="gen-progress-track" aria-hidden>
        <div className="gen-progress-fill" style={{ width: `${fillWidth}%` }}>
          {clamped > 2 && clamped < 100 ? <span className="gen-progress-tip" /> : null}
        </div>
      </div>
    </div>
  );
}
