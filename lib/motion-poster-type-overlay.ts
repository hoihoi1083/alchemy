import type { MotionPosterDialectId } from "@/lib/motion-poster-dialects";

export type MotionPosterTypeOverlayKind = "fade" | "slide-up" | "wipe-up";

export type MotionPosterTypeOverlayPlan = {
  headline: string;
  subline: string;
  cta: string;
  kind: MotionPosterTypeOverlayKind;
  headStartSec: number;
  headDurSec: number;
  ctaStartSec: number;
  ctaDurSec: number;
};

const OVERLAY_BY_DIALECT: Record<
  MotionPosterDialectId,
  { kind: MotionPosterTypeOverlayKind; headStart: number; headDur: number; ctaLag: number }
> = {
  "card-warp": { kind: "fade", headStart: 0.25, headDur: 1.15, ctaLag: 0.45 },
  "kinetic-type": { kind: "slide-up", headStart: 0.12, headDur: 0.95, ctaLag: 0.35 },
  parallax: { kind: "fade", headStart: 0.35, headDur: 1.3, ctaLag: 0.4 },
  "light-sweep": { kind: "fade", headStart: 0.2, headDur: 1.05, ctaLag: 0.4 },
  "liquid-reveal": { kind: "wipe-up", headStart: 0.45, headDur: 1.45, ctaLag: 0.35 },
  "scene-breathe": { kind: "fade", headStart: 0.5, headDur: 1.8, ctaLag: 0.4 },
  "designed-poster": { kind: "fade", headStart: 0.2, headDur: 1.2, ctaLag: 0.4 },
};

export function planMotionPosterTypeOverlay(input: {
  headline?: string;
  subline?: string;
  offer?: string;
  product?: string;
  dialect?: MotionPosterDialectId;
  durationSec: number;
}): MotionPosterTypeOverlayPlan | null {
  const headline =
    input.headline?.trim() || input.product?.trim() || "";
  const subline = input.subline?.trim() || "";
  const cta = input.offer?.trim() || "";
  if (!headline && !subline && !cta) return null;

  const dialect = input.dialect ?? "card-warp";
  const spec = OVERLAY_BY_DIALECT[dialect] ?? OVERLAY_BY_DIALECT["card-warp"];
  const dur = Math.min(15, Math.max(4, Number(input.durationSec) || 6));
  const headStart = Math.min(spec.headStart, Math.max(0, dur - 1.2));
  const headDur = Math.min(spec.headDur, Math.max(0.4, dur - headStart - 0.15));
  const ctaStart = Math.min(headStart + spec.ctaLag, Math.max(0, dur - 1.0));
  const ctaDur = Math.min(0.95, Math.max(0.35, dur - ctaStart - 0.1));

  return {
    headline,
    subline,
    cta,
    kind: spec.kind,
    headStartSec: headStart,
    headDurSec: headDur,
    ctaStartSec: ctaStart,
    ctaDurSec: ctaDur,
  };
}

function fadePad(label: string, start: number, dur: number): string {
  return `[${label}:v]format=rgba,fade=t=in:st=${start.toFixed(2)}:d=${dur.toFixed(2)}:alpha=1[${label}f]`;
}

function overlayExpr(
  kind: MotionPosterTypeOverlayKind,
  start: number,
  dur: number,
): { x: string; y: string } {
  const st = start.toFixed(2);
  const d = Math.max(0.2, dur).toFixed(2);
  if (kind === "slide-up") {
    return {
      x: "0",
      y: `(1-min(1\\,max(0\\,(t-${st})/${d})))*72`,
    };
  }
  if (kind === "wipe-up") {
    return {
      x: "0",
      y: `(1-min(1\\,max(0\\,(t-${st})/${d})))*h*0.12`,
    };
  }
  return { x: "0", y: "0" };
}

/** ffmpeg filter_complex: 0 = video, optional 1 = headline PNG, optional 2 = CTA PNG. */
export function buildMotionPosterTypeFilter(plan: {
  kind: MotionPosterTypeOverlayKind;
  hasHeadline: boolean;
  hasCta: boolean;
  headStartSec: number;
  headDurSec: number;
  ctaStartSec: number;
  ctaDurSec: number;
}): string {
  const parts: string[] = [];
  let current = "0:v";
  let nextIdx = 1;

  if (plan.hasHeadline) {
    const src = String(nextIdx);
    nextIdx += 1;
    parts.push(fadePad(src, plan.headStartSec, plan.headDurSec));
    const pos = overlayExpr(plan.kind, plan.headStartSec, plan.headDurSec);
    const out = plan.hasCta ? "vhead" : "vout";
    parts.push(
      `[${current}][${src}f]overlay=x=${pos.x}:y=${pos.y}:format=auto[${out}]`,
    );
    current = out;
  }

  if (plan.hasCta) {
    const src = String(nextIdx);
    parts.push(fadePad(src, plan.ctaStartSec, plan.ctaDurSec));
    parts.push(`[${current}][${src}f]overlay=0:0:format=auto[vout]`);
  }

  if (!plan.hasHeadline && !plan.hasCta) return "";
  return parts.join(";");
}
