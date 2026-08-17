"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  MOTION_POSTER_DIALECT_IDS,
  motionPosterDialectPreviewSrc,
  type MotionPosterDialectPick,
} from "@/lib/motion-poster-dialects";

const PREVIEW_CSS = `
.mpd-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 480px) {
  .mpd-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.mpd-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  border-radius: 0.85rem;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  padding: 0.45rem 0.45rem 0.55rem;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.mpd-card:hover { border-color: #ddd6fe; }
.mpd-card.is-selected {
  border-color: #6c3bff;
  background: #faf5ff;
  box-shadow: 0 0 0 3px rgba(108, 59, 255, 0.12);
}
.mpd-card--dark {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(69, 26, 3, 0.35);
  color: #fffbeb;
}
.mpd-card--dark:hover { border-color: rgba(252, 211, 77, 0.55); background: rgba(120, 53, 15, 0.4); }
.mpd-card--dark.is-selected {
  border-color: #fde68a;
  background: #fef3c7;
  color: #451a03;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2);
}
.mpd-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0.5rem;
  overflow: hidden;
  background: linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%);
  flex-shrink: 0;
}
.mpd-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mpd-card--dark .mpd-preview {
  background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
}
.mpd-title {
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  padding: 0 0.1rem;
}
.mpd-card--dark .mpd-title { color: #fffbeb; }
.mpd-card--dark.is-selected .mpd-title { color: #451a03; }
.mpd-desc {
  font-size: 0.6rem;
  line-height: 1.3;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding: 0 0.1rem;
}
.mpd-card--dark .mpd-desc { color: rgba(254, 243, 199, 0.75); }
.mpd-card--dark.is-selected .mpd-desc { color: #78350f; }

.mpd-auto-dot {
  position: absolute;
  top: 50%;
  width: 0.4rem;
  height: 0.4rem;
  margin-top: -0.2rem;
  border-radius: 999px;
  background: #8b5cf6;
}
.mpd-auto-dot:nth-child(1) { left: 28%; animation: mpd-auto 1.8s ease-in-out infinite; }
.mpd-auto-dot:nth-child(2) { left: 46%; animation: mpd-auto 1.8s ease-in-out 0.2s infinite; }
.mpd-auto-dot:nth-child(3) { left: 64%; animation: mpd-auto 1.8s ease-in-out 0.4s infinite; }
@keyframes mpd-auto {
  0%, 100% { transform: translateY(0); opacity: 0.35; }
  50% { transform: translateY(-0.25rem); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .mpd-auto-dot { animation: none !important; opacity: 0.85; }
}
`;

export function MotionPosterDialectPicker({
  value,
  onChange,
  variant = "light",
}: {
  value: MotionPosterDialectPick;
  onChange: (pick: MotionPosterDialectPick) => void;
  variant?: "light" | "dark";
}) {
  const { m } = useLocale();
  const labels = m.wizard.motionPosterDialects;
  const dark = variant === "dark";
  const options: Array<{ id: MotionPosterDialectPick; title: string; desc?: string }> = [
    { id: "auto", title: m.wizard.motionPosterDialectAuto },
    ...MOTION_POSTER_DIALECT_IDS.map((id) => ({
      id,
      title: labels[id].title,
      desc: labels[id].desc,
    })),
  ];

  return (
    <div className="space-y-2">
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_CSS }} />
      <p className={`text-[11px] leading-snug ${dark ? "text-amber-100/80" : "text-slate-500"}`}>
        {m.wizard.motionPosterDialectHint}
      </p>
      <div className="mpd-grid" role="listbox" aria-label={m.wizard.motionPosterDialectTitle}>
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={selected}
              title={opt.desc}
              onClick={() => onChange(opt.id)}
              className={`mpd-card${dark ? " mpd-card--dark" : ""}${selected ? " is-selected" : ""}`}
            >
              <div className="mpd-preview" aria-hidden>
                {opt.id === "auto" ? (
                  <>
                    <span className="mpd-auto-dot" />
                    <span className="mpd-auto-dot" />
                    <span className="mpd-auto-dot" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={motionPosterDialectPreviewSrc(opt.id)} alt="" />
                )}
              </div>
              <span className="mpd-title">{opt.title}</span>
              {opt.id !== "auto" ? <span className="mpd-desc">{opt.desc}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
