/**
 * Structure pass for Magic Layers OCR:
 * line-merge → role classify (title / body / pill) → vertical body blocks.
 * Fewer shreds, more Canva-like text groups.
 */

import type { LayerBox } from "@/lib/edit-image-2-boxes";
import { mergeAdjacentTextBoxes } from "@/lib/edit-image-2-boxes";

export type PixelBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TextRole = "title" | "body" | "pill" | "label";

export type StructuredTextItem = {
  px: PixelBox;
  label: string;
  score: number;
  role: TextRole;
  /** Individual OCR lines (joined with \\n in label for body blocks). */
  lines: string[];
};

type TextItem = { box: LayerBox; px: PixelBox; score: number };

function joinLabels(a: string, b: string): string {
  const needSpace =
    /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b) && !a.endsWith(" ") && !b.startsWith(" ");
  return `${a}${needSpace ? " " : ""}${b}`;
}

/** Heuristic role from geometry + label shape. */
export function classifyTextRole(
  px: PixelBox,
  imgW: number,
  imgH: number,
  label: string,
): TextRole {
  const aspect = px.width / Math.max(1, px.height);
  const relH = px.height / Math.max(1, imgH);
  const relW = px.width / Math.max(1, imgW);
  const yRel = px.top / Math.max(1, imgH);
  const t = label.trim();

  // Callouts like "7号 = 巨星起点" — require equals-style formula, not just wide boxes.
  if (/[=＝]/.test(t) && aspect >= 2.0 && relH < 0.07) return "pill";

  if (/^[0-9一二三四五六七八九十]{1,2}$/.test(t) && aspect < 1.8 && relW < 0.12) {
    return "label";
  }

  if (yRel < 0.2 && (relH >= 0.032 || relW >= 0.32)) return "title";
  if (relH >= 0.05 && relW >= 0.28) return "title";

  return "body";
}

/**
 * Stack left-aligned body lines into multi-line blocks (bullet groups).
 * Titles / pills / labels stay as single items.
 */
export function mergeVerticalBodyBlocks(
  items: StructuredTextItem[],
  imgW: number,
  imgH: number,
): StructuredTextItem[] {
  if (items.length <= 1) return items;
  const sorted = [...items].sort(
    (a, b) => a.px.top - b.px.top || a.px.left - b.px.left,
  );
  const used = new Set<number>();
  const out: StructuredTextItem[] = [];
  const xTol = Math.max(8, imgW * 0.06);
  const gapTol = Math.max(10, imgH * 0.028);

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    let cur = sorted[i]!;
    used.add(i);

    if (cur.role === "body") {
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < sorted.length; j++) {
          if (used.has(j)) continue;
          const o = sorted[j]!;
          if (o.role !== "body") continue;
          const leftAlign = Math.abs(o.px.left - cur.px.left) <= xTol;
          if (!leftAlign) continue;
          const curBottom = cur.px.top + cur.px.height;
          const gap = o.px.top - curBottom;
          if (gap < -o.px.height * 0.35 || gap > gapTol) continue;
          const avgH = cur.px.height / Math.max(1, cur.lines.length);
          if (o.px.height > avgH * 1.85 || o.px.height < avgH * 0.45) continue;

          const left = Math.min(cur.px.left, o.px.left);
          const top = Math.min(cur.px.top, o.px.top);
          const right = Math.max(cur.px.left + cur.px.width, o.px.left + o.px.width);
          const bottom = Math.max(cur.px.top + cur.px.height, o.px.top + o.px.height);
          const aboveFirst = cur.px.top <= o.px.top;
          const lines = aboveFirst
            ? [...cur.lines, ...o.lines]
            : [...o.lines, ...cur.lines];
          cur = {
            px: { left, top, width: right - left, height: bottom - top },
            label: lines.join("\n"),
            score: Math.max(cur.score, o.score),
            role: "body",
            lines,
          };
          used.add(j);
          grew = true;
        }
      }
    }

    out.push(cur);
  }

  return out.sort((a, b) => a.px.top - b.px.top || a.px.left - b.px.left);
}

/**
 * Full structure pass: horizontal line merge → roles → vertical body merge → cap.
 */
export function structureTextLayers(
  items: TextItem[],
  imgW: number,
  imgH: number,
  opts?: { maxLayers?: number },
): StructuredTextItem[] {
  const maxLayers = opts?.maxLayers ?? 12;
  const lined = mergeAdjacentTextBoxes(items);
  const classified: StructuredTextItem[] = lined.map((it) => {
    const label = (it.box.label || "").trim();
    const role = classifyTextRole(it.px, imgW, imgH, label);
    return {
      px: it.px,
      label,
      score: it.score,
      role,
      lines: label ? [label] : [],
    };
  });

  let structured = mergeVerticalBodyBlocks(classified, imgW, imgH);

  // Prefer keeping titles + pills; drop tiny leftover labels if over cap
  if (structured.length > maxLayers) {
    structured = [...structured].sort((a, b) => {
      const rank = (r: TextRole) =>
        r === "title" ? 0 : r === "pill" ? 1 : r === "body" ? 2 : 3;
      if (rank(a.role) !== rank(b.role)) return rank(a.role) - rank(b.role);
      return b.px.width * b.px.height - a.px.width * a.px.height;
    });
    structured = structured.slice(0, maxLayers);
    structured.sort((a, b) => a.px.top - b.px.top || a.px.left - b.px.left);
  }

  return structured;
}

/** Soften line-merge for structure by re-exporting join helper for tests. */
export { joinLabels };
