"use client";

import { useEffect, useRef } from "react";
import type { ProgressInfo } from "@/hooks/useWizardProgress";

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
const CARD_H = 240;

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
 */
export function GenerationWaitPlaceholder({
  message,
  hint,
  previewUrl,
  className = "",
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
    let h = CARD_H;

    const rebuild = () => {
      const rect = frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = CARD_H;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.max(40, Math.floor(w / 10)));
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

      // True center of the card (logo sits here)
      const cx = w * 0.5;
      const cy = h * 0.5;
      // Reach both side edges on a full-width card (elliptical field)
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

  return (
    <div
      ref={frameRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-violet-800/50 bg-[#1a1528] shadow-lg shadow-violet-950/30 ${className}`}
      style={{ height: CARD_H }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-15 blur-[1px]"
        />
      ) : null}

      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />

      {/* Logo dead-center of the full-width card */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src="/alchemy-logo.png"
          alt=""
          className="h-16 w-16 object-contain mix-blend-screen drop-shadow-[0_0_14px_rgba(192,132,252,0.5)]"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#1a1528] via-[#1a1528]/90 to-transparent px-4 pb-4 pt-12">
        <p className="text-center text-sm font-medium leading-snug text-violet-50">{message}</p>
        {hint ? (
          <p className="mt-1 text-center text-xs leading-snug text-slate-400">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function waitAspectFromString(value: string | null | undefined): WaitAspectRatio {
  if (value === "4:5" || value === "1:1" || value === "16:9" || value === "9:16") return value;
  return "9:16";
}
