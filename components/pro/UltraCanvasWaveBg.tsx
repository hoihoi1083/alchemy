"use client";

import { useEffect, useRef } from "react";

/**
 * Ultra-2 background: dense cyan→magenta particle mesh with flow + twist.
 * Canvas keeps dots pin-sized on any screen (SVG was scaling them up).
 */
export function UltraCanvasWaveBg({
  intensity = "canvas",
}: {
  intensity?: "canvas" | "picker";
}) {
  const strong = intensity === "picker";
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let alive = true;

    const paint = () => {
      if (!alive) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w < 2 || h < 2) return;

      const cw = Math.floor(w * dpr);
      const ch = Math.floor(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Soft ambient glows (match picker atmosphere)
      const gL = ctx.createRadialGradient(w * 0.12, h * 0.05, 0, w * 0.12, h * 0.05, w * 0.55);
      gL.addColorStop(0, strong ? "rgba(34,211,238,0.18)" : "rgba(34,211,238,0.1)");
      gL.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gL;
      ctx.fillRect(0, 0, w, h);

      const gR = ctx.createRadialGradient(w * 0.9, h * 0.08, 0, w * 0.9, h * 0.08, w * 0.5);
      gR.addColorStop(0, strong ? "rgba(255,45,149,0.22)" : "rgba(255,45,149,0.12)");
      gR.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gR;
      ctx.fillRect(0, 0, w, h);

      // Particle field occupies lower ~55% — rolling twisted mesh
      const cols = strong ? 160 : 140;
      const rows = strong ? 36 : 30;
      const baseY = h * 0.42;
      const bandH = h * 0.52;

      for (let r = 0; r < rows; r++) {
        const v = r / (rows - 1); // 0 front … 1 back
        // Perspective: back rows denser/higher, thinner spacing
        const depth = 0.55 + v * 0.45;
        const rowY0 = baseY + v * bandH * 0.22;

        for (let c = 0; c < cols; c++) {
          const u = c / (cols - 1);

          // Flowing hills (reference terrain, not a thin belt)
          const flow =
            Math.sin(u * Math.PI * 2.05) * 0.34 +
            Math.sin(u * Math.PI * 4.1 + 0.6) * 0.16 +
            Math.sin(u * Math.PI * 0.9 - 0.3) * 0.12;

          // Twist / fold — phase shifts with depth so layers cross
          const twist =
            Math.sin(u * Math.PI * 3.2 + v * 2.4) * 0.2 +
            Math.sin(u * Math.PI * 1.4 - v * 1.8) * 0.14;

          const fold = Math.sin((u + v * 0.35) * Math.PI * 2.6) * (0.18 - v * 0.06);

          const y =
            rowY0 +
            (flow + twist + fold) * bandH * depth +
            (v - 0.5) * 8;

          // Slight lateral shear for 3D twist
          const x =
            u * w +
            Math.sin(v * Math.PI * 2.1 + u * 3) * (6 + v * 10) * (0.5 - Math.abs(u - 0.5));

          if (x < -4 || x > w + 4 || y < 0 || y > h + 4) continue;

          const { r: cr, g: cg, b: cb, a } = colorAt(u, v, strong);

          // Pinprick size in CSS pixels — stays small on retina
          const radius = (strong ? 0.55 : 0.48) + (1 - v) * 0.25;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Soft bloom wash on magenta side (reference glow)
      ctx.globalCompositeOperation = "screen";
      const bloom = ctx.createRadialGradient(
        w * 0.82,
        h * 0.72,
        0,
        w * 0.82,
        h * 0.72,
        w * 0.38,
      );
      bloom.addColorStop(0, strong ? "rgba(255,60,160,0.16)" : "rgba(255,60,160,0.1)");
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      const bloomL = ctx.createRadialGradient(
        w * 0.18,
        h * 0.68,
        0,
        w * 0.18,
        h * 0.68,
        w * 0.32,
      );
      bloomL.addColorStop(0, strong ? "rgba(34,211,238,0.12)" : "rgba(34,211,238,0.07)");
      bloomL.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloomL;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    };

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };

    paint();
    const ro = new ResizeObserver(onResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [strong]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{ backgroundColor: "#070b14" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

function colorAt(
  u: number,
  v: number,
  strong: boolean,
): { r: number; g: number; b: number; a: number } {
  // Cyan → blue → violet → hot magenta (brighter toward right + front)
  let r: number;
  let g: number;
  let b: number;
  if (u < 0.35) {
    const k = u / 0.35;
    r = lerp(34, 59, k);
    g = lerp(211, 130, k);
    b = lerp(238, 246, k);
  } else if (u < 0.58) {
    const k = (u - 0.35) / 0.23;
    r = lerp(59, 168, k);
    g = lerp(130, 85, k);
    b = lerp(246, 247, k);
  } else if (u < 0.78) {
    const k = (u - 0.58) / 0.2;
    r = lerp(168, 236, k);
    g = lerp(85, 72, k);
    b = lerp(247, 153, k);
  } else {
    const k = (u - 0.78) / 0.22;
    r = lerp(236, 255, k);
    g = lerp(72, 45, k);
    b = lerp(153, 149, k);
  }

  const front = 1 - v * 0.35;
  const rightBoost = 0.75 + Math.pow(u, 1.15) * 0.55;
  const a = Math.min(
    1,
    (strong ? 0.78 : 0.62) * front * rightBoost * (0.85 + (1 - Math.abs(v - 0.35)) * 0.2),
  );
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
