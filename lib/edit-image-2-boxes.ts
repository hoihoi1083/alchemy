/** Florence / detection box parsing + NMS for edit-image-2 decompose. */

export type LayerBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: "text" | "object";
  score: number;
};

export type PixelBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function asLabel(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

/** Normalize a 4-number xyxy or xywh, or 8-number quad, into x,y,w,h. */
function numsToXywh(nums: number[]): { x: number; y: number; w: number; h: number } | null {
  if (nums.length === 4) {
    const [a, b, c, d] = nums;
    if (a == null || b == null || c == null || d == null) return null;
    // Prefer xyxy when c>a and d>b and looks like corners
    if (c > a && d > b && (c - a) < Math.max(a, c) * 4) {
      return { x: a, y: b, w: c - a, h: d - b };
    }
    // Already xywh
    return { x: a, y: b, w: c, h: d };
  }
  if (nums.length >= 8) {
    const xs = [nums[0]!, nums[2]!, nums[4]!, nums[6]!];
    const ys = [nums[1]!, nums[3]!, nums[5]!, nums[7]!];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return null;
}

function readCoords(row: Record<string, unknown>): { x: number; y: number; w: number; h: number } | null {
  const x = asNum(row.x);
  const y = asNum(row.y);
  const w = asNum(row.w ?? row.width);
  const h = asNum(row.h ?? row.height);
  if (x != null && y != null && w != null && h != null) return { x, y, w, h };

  const x1 = asNum(row.x1 ?? row.x_min ?? row.left);
  const y1 = asNum(row.y1 ?? row.y_min ?? row.top);
  const x2 = asNum(row.x2 ?? row.x_max ?? row.right);
  const y2 = asNum(row.y2 ?? row.y_max ?? row.bottom);
  if (x1 != null && y1 != null && x2 != null && y2 != null) {
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  for (const key of ["bbox", "box", "bounding_box", "quad", "quad_box", "points"] as const) {
    const raw = row[key];
    if (Array.isArray(raw)) {
      const nums = raw.map(asNum).filter((n): n is number => n != null);
      const parsed = numsToXywh(nums);
      if (parsed) return parsed;
    }
  }
  return null;
}

function collectList(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const results =
    root.results && typeof root.results === "object"
      ? (root.results as Record<string, unknown>)
      : root;

  for (const key of [
    "quad_boxes",
    "bboxes",
    "boxes",
    "regions",
    "detections",
    "objects",
  ] as const) {
    const v = results[key] ?? root[key];
    if (Array.isArray(v) && v.length) return v;
  }

  // Some payloads nest under data / output
  for (const nestKey of ["data", "output"] as const) {
    const nest = root[nestKey];
    if (nest && typeof nest === "object") {
      const found = collectList(nest);
      if (found.length) return found;
    }
  }
  return [];
}

function collectParallelLabels(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const results =
    root.results && typeof root.results === "object"
      ? (root.results as Record<string, unknown>)
      : root;
  for (const key of ["labels", "label_names", "texts", "phrases"] as const) {
    const v = results[key] ?? root[key];
    if (Array.isArray(v)) return v.map((x) => asLabel(x, ""));
  }
  return [];
}

function collectParallelScores(raw: unknown): number[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const results =
    root.results && typeof root.results === "object"
      ? (root.results as Record<string, unknown>)
      : root;
  for (const key of ["scores", "confidences", "confidence"] as const) {
    const v = results[key] ?? root[key];
    if (Array.isArray(v)) {
      return v.map((x) => asNum(x) ?? 0);
    }
  }
  return [];
}

/**
 * Parse Florence OCR / object-detection payloads into xywh boxes.
 * Supports object rows, [x1,y1,x2,y2], quads, and parallel labels/scores.
 */
export function parseBoxes(raw: unknown, kind: "text" | "object"): LayerBox[] {
  const list = collectList(raw);
  const labels = collectParallelLabels(raw);
  const scores = collectParallelScores(raw);
  const out: LayerBox[] = [];

  list.forEach((item, i) => {
    let coords: { x: number; y: number; w: number; h: number } | null = null;
    let label = "";
    let score = 1;

    if (Array.isArray(item)) {
      const nums = item.map(asNum).filter((n): n is number => n != null);
      coords = numsToXywh(nums);
      label = labels[i] ?? "";
      score = scores[i] ?? 1;
    } else if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      coords = readCoords(row);
      label = asLabel(row.label ?? row.text ?? row.phrase ?? row.name, labels[i] ?? "");
      score = asNum(row.score ?? row.confidence ?? row.prob) ?? scores[i] ?? 1;
    }

    if (!coords) return;
    const { x, y, w, h } = coords;
    if (!(w > 0 && h > 0)) return;
    // Pixel boxes: drop dust (<4px). Normalized 0–1 boxes stay (toPixelBox scales later).
    const looksNormalized = x <= 1.5 && y <= 1.5 && w <= 1.5 && h <= 1.5;
    if (!looksNormalized && (w < 4 || h < 4)) return;
    out.push({
      x,
      y,
      w,
      h,
      label: label || (kind === "text" ? "Text" : "Object"),
      kind,
      score,
    });
  });

  return out;
}

/** Drop OCR labels that look like keyboard smash / empty noise (not real copy). */
export function isWeakOcrLabel(label: string): boolean {
  const s = label.trim();
  if (s.length < 1) return true;
  if (/^[\s\-_.|/\\]+$/.test(s)) return true;
  const letters = s.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 8) {
    const lower = letters.toLowerCase();
    const uniq = new Set(lower).size;
    // asdfasdf / sadfsadf style
    if (uniq <= 5) return true;
    const vowels = (lower.match(/[aeiou]/g) || []).length;
    if (vowels / letters.length < 0.12 && !/[\u4e00-\u9fff]/.test(s)) return true;
  }
  return false;
}

/** Florence sometimes returns normalized 0–1 or pixel coords. */
export function toPixelBox(box: LayerBox, imgW: number, imgH: number): PixelBox {
  let { x, y, w, h } = box;
  if (x <= 1.5 && y <= 1.5 && w <= 1.5 && h <= 1.5) {
    x *= imgW;
    y *= imgH;
    w *= imgW;
    h *= imgH;
  }
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const width = Math.max(1, Math.min(imgW - left, Math.ceil(w)));
  const height = Math.max(1, Math.min(imgH - top, Math.ceil(h)));
  return { left, top, width, height };
}

export function iou(a: PixelBox, b: PixelBox): number {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.left + a.width, b.left + b.width);
  const y2 = Math.min(a.top + a.height, b.top + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

/** Best OCR label for a Qwen layer box (by IoU / containment). */
export function matchOcrToLayerBox(
  layer: PixelBox,
  ocrItems: Array<{ px: PixelBox; label: string; score: number }>,
): { label: string; score: number } | null {
  let best: { label: string; score: number; metric: number } | null = null;
  const layerArea = Math.max(1, layer.width * layer.height);
  for (const o of ocrItems) {
    const overlap = iou(layer, o.px);
    // Also reward OCR boxes mostly inside the layer.
    const ox2 = o.px.left + o.px.width;
    const oy2 = o.px.top + o.px.height;
    const ix1 = Math.max(layer.left, o.px.left);
    const iy1 = Math.max(layer.top, o.px.top);
    const ix2 = Math.min(layer.left + layer.width, ox2);
    const iy2 = Math.min(layer.top + layer.height, oy2);
    const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
    const oArea = Math.max(1, o.px.width * o.px.height);
    const contained = inter / oArea;
    const metric = Math.max(overlap, contained * 0.85) + Math.min(0.15, o.score * 0.1);
    // Ignore tiny OCR crumbs relative to huge photo layers.
    if (oArea / layerArea < 0.02 && contained < 0.5) continue;
    if (metric < 0.25) continue;
    if (!best || metric > best.metric) {
      best = { label: o.label, score: o.score, metric };
    }
  }
  return best ? { label: best.label, score: best.score } : null;
}

/** Greedy NMS — keep higher score (tie-break larger area). */
export function nmsBoxes<T extends { px: PixelBox; score: number }>(
  items: T[],
  threshold = 0.55,
): T[] {
  const ranked = [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.px.width * b.px.height - a.px.width * a.px.height;
  });
  const kept: T[] = [];
  for (const cand of ranked) {
    if (kept.some((k) => iou(k.px, cand.px) > threshold)) continue;
    kept.push(cand);
  }
  return kept;
}

type TextItem = { box: LayerBox; px: PixelBox; score: number };

/** Short brand / logo OCR that must not glue to long body copy (e.g. CR7 + paragraph). */
export function looksLikeLogoLabel(label: string): boolean {
  const t = label.trim().replace(/\s+/g, "");
  if (!t) return false;
  if (/^CR\d+$/i.test(t)) return true;
  // Latin brand marks (CR7, Nike…) — not a lone digit (those merge into titles).
  if (t.length >= 2 && t.length <= 8 && /^[A-Za-z][A-Za-z0-9]*$/i.test(t)) return true;
  return false;
}

function shouldAvoidTextMerge(a: string, b: string): boolean {
  const la = a.trim();
  const lb = b.trim();
  if (looksLikeLogoLabel(la) && lb.length >= 8 && !looksLikeLogoLabel(lb)) return true;
  if (looksLikeLogoLabel(lb) && la.length >= 8 && !looksLikeLogoLabel(la)) return true;
  // Pill formula vs long body
  if (/[=＝]/.test(la) && lb.length > la.length * 1.5 && lb.length >= 10) return true;
  if (/[=＝]/.test(lb) && la.length > lb.length * 1.5 && la.length >= 10) return true;
  return false;
}

/**
 * Merge OCR fragments on the same visual line (e.g. red "7" + Chinese title)
 * into one editable text layer. Does not glue logos (CR7) onto body copy.
 */
export function mergeAdjacentTextBoxes(items: TextItem[]): TextItem[] {
  if (items.length <= 1) return items;
  const sorted = [...items].sort(
    (a, b) => a.px.top + a.px.height / 2 - (b.px.top + b.px.height / 2) || a.px.left - b.px.left,
  );
  const used = new Set<number>();
  const out: TextItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    let cur = sorted[i]!;
    used.add(i);
    let grew = true;
    while (grew) {
      grew = false;
      for (let j = 0; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const o = sorted[j]!;
        if (shouldAvoidTextMerge(cur.box.label, o.box.label)) continue;
        const cy1 = cur.px.top + cur.px.height / 2;
        const cy2 = o.px.top + o.px.height / 2;
        const maxH = Math.max(cur.px.height, o.px.height);
        const sameLine = Math.abs(cy1 - cy2) <= maxH * 0.55;
        if (!sameLine) continue;
        const curR = cur.px.left + cur.px.width;
        const oR = o.px.left + o.px.width;
        const gap = Math.max(o.px.left - curR, cur.px.left - oR);
        const close = gap <= maxH * 1.35;
        const overlapX = !(oR < cur.px.left || curR < o.px.left);
        if (!close && !overlapX) continue;

        const left = Math.min(cur.px.left, o.px.left);
        const top = Math.min(cur.px.top, o.px.top);
        const right = Math.max(curR, oR);
        const bottom = Math.max(cur.px.top + cur.px.height, o.px.top + o.px.height);
        const leftFirst = cur.px.left <= o.px.left;
        const a = leftFirst ? cur.box.label : o.box.label;
        const b = leftFirst ? o.box.label : cur.box.label;
        // Chinese / mixed: no space; Latin-ish fragments get a space if both look spaced.
        const needSpace =
          /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b) && !a.endsWith(" ") && !b.startsWith(" ");
        const label = `${a}${needSpace ? " " : ""}${b}`;
        cur = {
          box: {
            ...cur.box,
            label,
            x: left,
            y: top,
            w: right - left,
            h: bottom - top,
          },
          px: { left, top, width: right - left, height: bottom - top },
          score: Math.max(cur.score, o.score),
        };
        used.add(j);
        grew = true;
      }
    }
    out.push(cur);
  }
  return out;
}
