"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  MOTION_POSTER_DIALECT_IDS,
  type MotionPosterDialectId,
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
  padding: 0.55rem 0.5rem 0.6rem;
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
  height: 2.75rem;
  border-radius: 0.55rem;
  overflow: hidden;
  background: linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%);
  flex-shrink: 0;
}
.mpd-card--dark .mpd-preview {
  background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
}
.mpd-card.is-selected .mpd-preview,
.mpd-card--dark.is-selected .mpd-preview {
  background: linear-gradient(160deg, #ede9fe 0%, #ddd6fe 100%);
}
.mpd-title {
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
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
}
.mpd-card--dark .mpd-desc { color: rgba(254, 243, 199, 0.75); }
.mpd-card--dark.is-selected .mpd-desc { color: #78350f; }

/* Shared poster plate */
.mpd-plate {
  position: absolute;
  left: 50%;
  top: 52%;
  width: 1.35rem;
  height: 1.7rem;
  margin-left: -0.675rem;
  margin-top: -0.85rem;
  border-radius: 0.2rem;
  background: linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.15);
}
.mpd-card.is-selected .mpd-plate,
.mpd-card--dark.is-selected .mpd-plate {
  background: linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 100%);
}
.mpd-hero {
  position: absolute;
  left: 50%;
  bottom: 0.28rem;
  width: 0.55rem;
  height: 0.7rem;
  margin-left: -0.275rem;
  border-radius: 0.12rem;
  background: #475569;
}
.mpd-card.is-selected .mpd-hero,
.mpd-card--dark.is-selected .mpd-hero {
  background: #5b21b6;
}
.mpd-type {
  position: absolute;
  left: 18%;
  right: 18%;
  top: 0.28rem;
  height: 0.18rem;
  border-radius: 999px;
  background: #0f172a;
  opacity: 0;
}
.mpd-type-sm {
  position: absolute;
  left: 28%;
  right: 28%;
  top: 0.55rem;
  height: 0.12rem;
  border-radius: 999px;
  background: #64748b;
  opacity: 0;
}

/* Auto — soft pulse / shuffle hint */
.mpd-auto-dot {
  position: absolute;
  top: 50%;
  width: 0.35rem;
  height: 0.35rem;
  margin-top: -0.175rem;
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

/* 3D card warp */
.mpd-preview--card-warp .mpd-plate {
  transform-origin: center bottom;
  animation: mpd-card-warp 2.4s ease-in-out infinite;
}
.mpd-preview--card-warp .mpd-type {
  animation: mpd-fade-late 2.4s ease-in-out infinite;
}
@keyframes mpd-card-warp {
  0%, 100% { transform: perspective(48px) rotateY(0deg) rotateX(0deg) skewY(0deg); }
  50% { transform: perspective(48px) rotateY(-18deg) rotateX(6deg) skewY(-4deg); }
}

/* Type reveal — zoom + type bloom */
.mpd-preview--kinetic-type .mpd-plate {
  animation: mpd-push-in 2.6s ease-in-out infinite;
}
.mpd-preview--kinetic-type .mpd-type,
.mpd-preview--kinetic-type .mpd-type-sm {
  animation: mpd-fade-late 2.6s ease-in-out infinite;
}
.mpd-preview--kinetic-type .mpd-type-sm { animation-delay: 0.08s; }
@keyframes mpd-push-in {
  0%, 12% { transform: scale(0.82); }
  50%, 72% { transform: scale(1); }
  100% { transform: scale(0.82); }
}

/* Parallax — layers drift opposite */
.mpd-bg {
  position: absolute;
  inset: 0.2rem;
  border-radius: 0.35rem;
  background: linear-gradient(120deg, #e2e8f0, #cbd5e1);
  opacity: 0.7;
}
.mpd-card.is-selected .mpd-bg,
.mpd-card--dark.is-selected .mpd-bg {
  background: linear-gradient(120deg, #ddd6fe, #c4b5fd);
}
.mpd-preview--parallax .mpd-bg {
  animation: mpd-parallax-bg 2.5s ease-in-out infinite;
}
.mpd-preview--parallax .mpd-plate {
  width: 1.1rem;
  height: 1.4rem;
  margin-left: -0.55rem;
  animation: mpd-parallax-fg 2.5s ease-in-out infinite;
}
.mpd-preview--parallax .mpd-type {
  animation: mpd-fade-late 2.5s ease-in-out infinite;
}
@keyframes mpd-parallax-bg {
  0%, 100% { transform: translateX(0.2rem) scale(1.05); }
  50% { transform: translateX(-0.25rem) scale(1.05); }
}
@keyframes mpd-parallax-fg {
  0%, 100% { transform: translateX(-0.2rem) scale(0.9); }
  50% { transform: translateX(0.22rem) scale(1.05); }
}

/* Light sweep */
.mpd-preview--light-sweep .mpd-plate {
  filter: brightness(0.55);
  animation: mpd-lit 2.4s ease-in-out infinite;
}
.mpd-beam {
  position: absolute;
  top: -20%;
  bottom: -20%;
  width: 0.55rem;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent);
  transform: skewX(-18deg);
  animation: mpd-beam 2.4s ease-in-out infinite;
}
.mpd-preview--light-sweep .mpd-type {
  animation: mpd-fade-late 2.4s ease-in-out infinite;
}
@keyframes mpd-beam {
  0% { left: -20%; opacity: 0; }
  20% { opacity: 1; }
  55% { left: 90%; opacity: 0.9; }
  100% { left: 110%; opacity: 0; }
}
@keyframes mpd-lit {
  0%, 25% { filter: brightness(0.5); }
  45%, 100% { filter: brightness(1.15); }
}

/* Liquid reveal */
.mpd-liquid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 35%;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.55), rgba(14, 165, 233, 0.85));
  border-radius: 40% 40% 0 0 / 30% 30% 0 0;
  animation: mpd-liquid 2.5s ease-in-out infinite;
}
.mpd-preview--liquid-reveal .mpd-plate {
  animation: mpd-tilt-soft 2.5s ease-in-out infinite;
}
.mpd-preview--liquid-reveal .mpd-type {
  animation: mpd-fade-late 2.5s ease-in-out infinite;
}
@keyframes mpd-liquid {
  0%, 100% { height: 12%; transform: translateY(0.15rem); }
  55% { height: 48%; transform: translateY(0); }
}
@keyframes mpd-tilt-soft {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(8deg) translateY(-0.08rem); }
}

/* Atmosphere breathe */
.mpd-mote {
  position: absolute;
  width: 0.18rem;
  height: 0.18rem;
  border-radius: 999px;
  background: #94a3b8;
  opacity: 0.5;
}
.mpd-mote:nth-child(1) { left: 18%; top: 30%; animation: mpd-mote 2.8s ease-in-out infinite; }
.mpd-mote:nth-child(2) { left: 72%; top: 22%; animation: mpd-mote 2.8s ease-in-out 0.4s infinite; }
.mpd-mote:nth-child(3) { left: 58%; top: 55%; animation: mpd-mote 2.8s ease-in-out 0.8s infinite; }
.mpd-preview--scene-breathe .mpd-plate {
  animation: mpd-breathe 2.8s ease-in-out infinite;
}
.mpd-preview--scene-breathe .mpd-type {
  animation: mpd-fade-late 2.8s ease-in-out infinite;
}
@keyframes mpd-breathe {
  0%, 100% { transform: scale(0.96) translateY(0.06rem); }
  50% { transform: scale(1.04) translateY(-0.06rem); }
}
@keyframes mpd-mote {
  0%, 100% { transform: translateY(0.2rem); opacity: 0.2; }
  50% { transform: translateY(-0.35rem); opacity: 0.85; }
}

/* Designed poster — chrome bloom */
.mpd-seal {
  position: absolute;
  right: 0.35rem;
  top: 0.85rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  border: 1.5px solid #7c3aed;
  opacity: 0;
  animation: mpd-fade-late 2.6s ease-in-out infinite;
}
.mpd-brush {
  position: absolute;
  left: 0.3rem;
  bottom: 0.35rem;
  width: 0.22rem;
  height: 0.9rem;
  border-radius: 0.08rem;
  background: #7c3aed;
  opacity: 0;
  transform: rotate(-12deg);
  animation: mpd-fade-late 2.6s ease-in-out 0.1s infinite;
}
.mpd-preview--designed-poster .mpd-plate {
  animation: mpd-tilt-soft 2.6s ease-in-out infinite;
}
.mpd-preview--designed-poster .mpd-type,
.mpd-preview--designed-poster .mpd-type-sm {
  animation: mpd-fade-late 2.6s ease-in-out infinite;
}

@keyframes mpd-fade-late {
  0%, 35% { opacity: 0; }
  55%, 100% { opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
  .mpd-preview *,
  .mpd-auto-dot {
    animation: none !important;
  }
  .mpd-type, .mpd-type-sm, .mpd-seal, .mpd-brush { opacity: 0.85; }
  .mpd-liquid { height: 40%; }
  .mpd-preview--card-warp .mpd-plate { transform: perspective(48px) rotateY(-12deg); }
  .mpd-preview--light-sweep .mpd-plate { filter: brightness(1.1); }
}
`;

function DialectPreview({ id }: { id: MotionPosterDialectId | "auto" }) {
  if (id === "auto") {
    return (
      <div className="mpd-preview" aria-hidden>
        <span className="mpd-auto-dot" />
        <span className="mpd-auto-dot" />
        <span className="mpd-auto-dot" />
      </div>
    );
  }

  if (id === "parallax") {
    return (
      <div className={`mpd-preview mpd-preview--${id}`} aria-hidden>
        <span className="mpd-bg" />
        <span className="mpd-plate">
          <span className="mpd-hero" />
        </span>
        <span className="mpd-type" />
      </div>
    );
  }

  if (id === "light-sweep") {
    return (
      <div className={`mpd-preview mpd-preview--${id}`} aria-hidden>
        <span className="mpd-plate">
          <span className="mpd-hero" />
        </span>
        <span className="mpd-beam" />
        <span className="mpd-type" />
      </div>
    );
  }

  if (id === "liquid-reveal") {
    return (
      <div className={`mpd-preview mpd-preview--${id}`} aria-hidden>
        <span className="mpd-liquid" />
        <span className="mpd-plate">
          <span className="mpd-hero" />
        </span>
        <span className="mpd-type" />
      </div>
    );
  }

  if (id === "scene-breathe") {
    return (
      <div className={`mpd-preview mpd-preview--${id}`} aria-hidden>
        <span className="mpd-mote" />
        <span className="mpd-mote" />
        <span className="mpd-mote" />
        <span className="mpd-plate">
          <span className="mpd-hero" />
        </span>
        <span className="mpd-type" />
      </div>
    );
  }

  if (id === "designed-poster") {
    return (
      <div className={`mpd-preview mpd-preview--${id}`} aria-hidden>
        <span className="mpd-plate">
          <span className="mpd-hero" />
        </span>
        <span className="mpd-type" />
        <span className="mpd-type-sm" />
        <span className="mpd-seal" />
        <span className="mpd-brush" />
      </div>
    );
  }

  // card-warp | kinetic-type
  return (
    <div className={`mpd-preview mpd-preview--${id}`} aria-hidden>
      <span className="mpd-plate">
        <span className="mpd-hero" />
      </span>
      <span className="mpd-type" />
      {id === "kinetic-type" ? <span className="mpd-type-sm" /> : null}
    </div>
  );
}

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
              <DialectPreview id={opt.id} />
              <span className="mpd-title">{opt.title}</span>
              {opt.id !== "auto" ? <span className="mpd-desc">{opt.desc}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
