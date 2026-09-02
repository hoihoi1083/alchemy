"use client";

import { useEffect, useRef } from "react";
import type { ProgressInfo } from "@/hooks/useWizardProgress";
import { GenerationProgressBar } from "@/components/studio/GenerationProgressBar";

export type WaitAspectRatio = "9:16" | "4:5" | "1:1" | "16:9" | "auto";

type GenerationWaitPlaceholderProps = {
  message: string;
  hint?: string;
  progress?: ProgressInfo | null;
  aspectRatio?: WaitAspectRatio;
  previewUrl?: string | null;
  className?: string;
  compact?: boolean;
};

const BEAT_HZ = 4;
const BEAT_CYCLE = 8;

const WAIT_FRAME_CSS = `
.gen-wait-stack {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
}
.gen-wait-frame {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: #1a1528;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  height: 200px;
}
.gen-wait-frame--compact { height: 190px; }
.gen-wait-logo {
  height: 3rem;
  width: 3rem;
  object-fit: contain;
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 14px rgba(192, 132, 252, 0.5));
}
.gen-wait-msg {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  color: #f5f3ff;
  padding: 0 0.25rem;
}
.gen-wait-hint {
  margin-top: 0.25rem;
  text-align: center;
  font-size: 11px;
  line-height: 1.35;
  color: #94a3b8;
  padding: 0 0.25rem;
}
.gen-wait-fade {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  background: linear-gradient(to top, #1a1528, rgba(26, 21, 40, 0.9), transparent);
  padding: 2.5rem 0.85rem 0.85rem;
}
@media (min-width: 640px) {
  .gen-wait-stack { gap: 0.75rem; }
  .gen-wait-frame { height: 240px; border-radius: 1rem; }
  .gen-wait-frame--compact { height: 220px; }
  .gen-wait-logo { height: 3.5rem; width: 3.5rem; }
  .gen-wait-msg { font-size: 14px; }
  .gen-wait-fade { padding: 3rem 1rem 1rem; }
}
@media (min-width: 1024px) {
  .gen-wait-frame { height: 300px; border-radius: 1.15rem; }
  .gen-wait-frame--compact { height: 280px; }
  .gen-wait-logo { height: 4rem; width: 4rem; }
}
`;

const STAR_RGB: ReadonlyArray<readonly [number, number, number]> = [
  [216, 180, 254],
  [129, 140, 248],
  [96, 165, 250],
  [244, 114, 182],
  [251, 113, 133],
];

type Star = {
  angle: number;
  radiusNorm: number;
  inward: number;
  r: number;
  blinkMask: number;
  onAlpha: number;
  rgb: readonly [number, number, number];
};

function spawnStar(preferOuter = true): Star {
  const patterns = [0b1000_0000, 0b0010_0000, 0b0000_1000, 0b1000_1000, 0b0100_0100, 0b0001_0001];
  return {
    angle: Math.random() * Math.PI * 2,
    radiusNorm: preferOuter ? 0.55 + Math.random() * 0.45 : 0.28 + Math.random() * 0.55,
    inward: 0.14 + Math.random() * 0.18,
    r: 1.4 + Math.random() * 1.6,
    blinkMask: patterns[(Math.random() * patterns.length) | 0]!,
    onAlpha: 0.55 + Math.random() * 0.35,
    rgb: STAR_RGB[(Math.random() * STAR_RGB.length) | 0]!,
  };
}

/**
 * Full-width dark wait card: centered logo + fine dots + status at bottom.
 * Progress bar sits below the card on the light page surface.
 */
export function GenerationWaitPlaceholder({
  message,
  hint,
  previewUrl,
  progress,
  className = "",
  compact = false,
}: GenerationWaitPlaceholderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let stars: Star[] = [];
    let lastT = 0;
    let w = 0;
    let h = 200;

    const rebuild = () => {
      const rect = frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.max(36, Math.floor(w / 10)));
      stars = Array.from({ length: count }, () => spawnStar(Math.random() > 0.2));
    };

    rebuild();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(rebuild) : null;
    ro?.observe(frame);

    const draw = (t: number) => {
      if (!running) return;
      const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
      lastT = t;

      ctx.fillStyle = "#1a1528";
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxRX = w * 0.52;
      const maxRY = h * 0.46;

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(maxRX, maxRY));
      g.addColorStop(0, "rgba(192, 132, 252, 0.28)");
      g.addColorStop(0.45, "rgba(59, 130, 246, 0.12)");
      g.addColorStop(1, "rgba(26, 21, 40, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const beatFloat = (t / 1000) * BEAT_HZ;
      const beatIndex = Math.floor(beatFloat) % BEAT_CYCLE;
      const beatPhase = beatFloat - Math.floor(beatFloat);
      const gateOpen = beatPhase < 0.4;

      for (const s of stars) {
        s.radiusNorm -= s.inward * dt;
        if (s.radiusNorm < 0.28) {
          Object.assign(s, spawnStar(true));
          s.radiusNorm = 0.95 + Math.random() * 0.05;
        }

        const onBeat = ((s.blinkMask >> beatIndex) & 1) === 1;
        const lit = onBeat && gateOpen;
        const focus = 1 - s.radiusNorm;
        const a = lit ? s.onAlpha : s.onAlpha * (0.28 + focus * 0.18);
        if (a < 0.08) continue;

        const px = cx + Math.cos(s.angle) * s.radiusNorm * maxRX;
        const py = cy + Math.sin(s.angle) * s.radiusNorm * maxRY;
        const [cr, cg, cb] = s.rgb;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
        ctx.arc(px, py, lit ? s.r : s.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  const pct =
    progress && typeof progress.pct === "number"
      ? Math.max(0, Math.min(100, Math.round(progress.pct)))
      : null;

  return (
    <div className={`gen-wait-stack${className ? ` ${className}` : ""}`.trim()}>
      <style dangerouslySetInnerHTML={{ __html: WAIT_FRAME_CSS }} />
      <div
        ref={frameRef}
        className={`gen-wait-frame${compact ? " gen-wait-frame--compact" : ""}`.trim()}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15 blur-[1px]"
          />
        ) : null}

        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img src="/alchemy-logo.png" alt="" className="gen-wait-logo" />
        </div>

        <div className="gen-wait-fade">
          <p className="gen-wait-msg">{message}</p>
          {hint ? <p className="gen-wait-hint">{hint}</p> : null}
        </div>
      </div>

      {pct != null ? (
        <GenerationProgressBar
          label={progress?.label?.trim() || message}
          sublabel={progress?.eta || undefined}
          pct={pct}
        />
      ) : null}
    </div>
  );
}

export function waitAspectFromString(value: string | null | undefined): WaitAspectRatio {
  if (value === "4:5" || value === "1:1" || value === "16:9" || value === "9:16") return value;
  return "9:16";
}
