/**
 * Sample live-text style from a text-layer crop (RGBA).
 * Pure / testable — no DOM. Used by sampleTextStyleFromCrop in the client.
 */

import type { LiveTextEffect } from "@/lib/edit-image-2-live-text";

export type SampledTextStyle = {
  fill: string;
  fontBold: boolean;
  /** Outline / neon stroke when present. */
  strokeColor: string;
  /** Shadow / glow colour when present. */
  effectColor: string;
  /** Best-guess Konva effect from the crop. */
  textEffect: Exclude<LiveTextEffect, "shadow">;
};

const DEFAULT_STYLE: SampledTextStyle = {
  fill: "#111827",
  fontBold: true,
  strokeColor: "#ffffff",
  effectColor: "#000000",
  textEffect: "none",
};

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sat(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 1) return 0;
  return (max - min) / max;
}

function dist(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function toHex(rgb: [number, number, number]): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

function bucketKey(r: number, g: number, b: number): number {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

type Vote = { key: number; n: number; r: number; g: number; b: number };

function topVotes(map: Map<number, Vote>, limit = 4): Vote[] {
  return [...map.values()].sort((a, b) => b.n - a.n).slice(0, limit);
}

function addVote(
  map: Map<number, Vote>,
  r: number,
  g: number,
  b: number,
  weight = 1,
): void {
  const key = bucketKey(r, g, b);
  const cur = map.get(key);
  if (cur) {
    cur.n += weight;
    cur.r += r * weight;
    cur.g += g * weight;
    cur.b += b * weight;
  } else {
    map.set(key, { key, n: weight, r: r * weight, g: g * weight, b: b * weight });
  }
}

function meanRgb(v: Vote): [number, number, number] {
  if (v.n <= 0) return [0, 0, 0];
  return [v.r / v.n, v.g / v.n, v.b / v.n];
}

/**
 * Chebyshev distance to nearest transparent / empty pixel.
 * Core glyph pixels score high; outline rings score low.
 */
function distanceToClear(
  data: Uint8ClampedArray | Buffer | Uint8Array,
  width: number,
  height: number,
  alphaMin: number,
): Float32Array {
  const n = width * height;
  const distMap = new Float32Array(n);
  const INF = width + height;
  for (let i = 0; i < n; i++) {
    distMap[i] = data[i * 4 + 3]! >= alphaMin ? INF : 0;
  }
  // Forward
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (distMap[i] === 0) continue;
      if (x > 0) distMap[i] = Math.min(distMap[i]!, distMap[i - 1]! + 1);
      if (y > 0) distMap[i] = Math.min(distMap[i]!, distMap[i - width]! + 1);
    }
  }
  // Backward
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (distMap[i] === 0) continue;
      if (x + 1 < width) distMap[i] = Math.min(distMap[i]!, distMap[i + 1]! + 1);
      if (y + 1 < height) distMap[i] = Math.min(distMap[i]!, distMap[i + width]! + 1);
    }
  }
  return distMap;
}

/**
 * Analyse raw RGBA pixels from a text crop.
 * Core ink (far from alpha) → fill; rim ink that differs → stroke; dark offset → shadow.
 */
export function sampleTextStyleFromRgba(
  data: Uint8ClampedArray | Buffer | Uint8Array,
  width: number,
  height: number,
): SampledTextStyle {
  if (!width || !height || data.length < width * height * 4) {
    return { ...DEFAULT_STYLE };
  }

  const alphaMin = 80;
  const distMap = distanceToClear(data, width, height, alphaMin);

  let maxDist = 0;
  let inkN = 0;
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3]! < alphaMin) continue;
    inkN += 1;
    if (distMap[i]! > maxDist) maxDist = distMap[i]!;
  }
  if (inkN < 6) return { ...DEFAULT_STYLE };

  const coreThreshold = Math.max(2, Math.ceil(maxDist * 0.45));
  const rimThreshold = Math.max(1, Math.ceil(maxDist * 0.28));

  const core = new Map<number, Vote>();
  const rim = new Map<number, Vote>();
  const darkOffset = new Map<number, Vote>();
  let darkN = 0;
  let lightN = 0;
  let rimN = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const i = idx * 4;
      const a = data[i + 3]!;
      if (a < alphaMin) continue;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const d = distMap[idx]!;
      const L = lum(r, g, b);
      if (L < 128) darkN += 1;
      else lightN += 1;

      if (d >= coreThreshold) {
        // Weight deep core more so thin outline rings don't win fill.
        addVote(core, r, g, b, 1 + Math.floor(d));
      }
      if (d <= rimThreshold) {
        rimN += 1;
        addVote(rim, r, g, b, 1);
      }

      if (L < 90 && d >= 1) {
        const upIdx = y >= 2 ? (y - 2) * width + x : -1;
        const leftIdx = x >= 2 ? y * width + (x - 2) : -1;
        const upOk = upIdx >= 0 && data[upIdx * 4 + 3]! >= alphaMin;
        const leftOk = leftIdx >= 0 && data[leftIdx * 4 + 3]! >= alphaMin;
        if (upOk || leftOk) addVote(darkOffset, r, g, b, 1);
      }
    }
  }

  const fillVotes = topVotes(core.size ? core : rim, 4);
  if (!fillVotes.length) return { ...DEFAULT_STYLE };

  let fillVote = fillVotes[0]!;
  let bestScore = -1;
  for (const v of fillVotes) {
    const rgb = meanRgb(v);
    const score = v.n * (1 + sat(rgb[0], rgb[1], rgb[2]));
    if (score > bestScore) {
      bestScore = score;
      fillVote = v;
    }
  }
  const fillRgb = meanRgb(fillVote);
  const fill = toHex(fillRgb);
  const fillL = lum(fillRgb[0], fillRgb[1], fillRgb[2]);

  let strokeRgb: [number, number, number] | null = null;
  let strokeCount = 0;
  for (const v of topVotes(rim, 6)) {
    const rgb = meanRgb(v);
    if (dist(rgb, fillRgb) < 55) continue;
    if (v.n > strokeCount) {
      strokeCount = v.n;
      strokeRgb = rgb;
    }
  }

  let effectRgb: [number, number, number] | null = null;
  for (const v of topVotes(darkOffset, 3)) {
    const rgb = meanRgb(v);
    if (lum(rgb[0], rgb[1], rgb[2]) > fillL - 15) continue;
    if (dist(rgb, fillRgb) < 30) continue;
    effectRgb = rgb;
    break;
  }
  if (
    !effectRgb &&
    strokeRgb &&
    lum(strokeRgb[0], strokeRgb[1], strokeRgb[2]) < fillL - 40
  ) {
    effectRgb = strokeRgb;
  }

  const strokeColor = strokeRgb
    ? toHex(strokeRgb)
    : fillL > 160
      ? "#111827"
      : "#ffffff";
  const effectColor = effectRgb ? toHex(effectRgb) : "#000000";

  const rimRatio = rimN / Math.max(1, inkN);
  const hasStroke =
    Boolean(strokeRgb) && strokeCount >= Math.max(3, Math.floor(inkN * 0.03));
  const hasShadow = Boolean(effectRgb);
  const strokeSat = strokeRgb
    ? sat(strokeRgb[0], strokeRgb[1], strokeRgb[2])
    : 0;
  const strokeL = strokeRgb ? lum(strokeRgb[0], strokeRgb[1], strokeRgb[2]) : 0;

  let textEffect: SampledTextStyle["textEffect"] = "none";
  if (hasStroke && hasShadow && dist(strokeRgb!, effectRgb!) > 40) {
    textEffect = "outlineShadow";
  } else if (hasStroke && strokeSat > 0.35 && strokeL > 140 && fillL < 200) {
    textEffect = "neon";
  } else if (hasStroke && rimRatio > 0.5 && maxDist >= 4) {
    textEffect = "heavyOutline";
  } else if (hasStroke) {
    textEffect = "outline";
  } else if (hasShadow && fillL > 100) {
    textEffect = "softShadow";
  } else if (hasShadow) {
    textEffect = "hardShadow";
  } else if (
    strokeRgb &&
    fillL < 100 &&
    strokeL > fillL + 50
  ) {
    textEffect = "outline";
  }

  const fontBold = darkN >= lightN * 0.4 || rimRatio < 0.6;

  return {
    fill,
    fontBold,
    strokeColor,
    effectColor,
    textEffect,
  };
}

export { DEFAULT_STYLE as DEFAULT_SAMPLED_TEXT_STYLE };
