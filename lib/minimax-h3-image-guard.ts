/**
 * MiniMax H3 reference stills must be ≥256×256 and aspect ratio 0.4–2.5.
 * Upscale tiny thumbs and letterbox wide logos before fal.subscribe.
 */

import sharp from "sharp";
import { fal } from "@fal-ai/client";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const MINIMAX_H3_MIN_IMAGE_EDGE = 256;
export const MINIMAX_H3_MIN_ASPECT = 0.4;
export const MINIMAX_H3_MAX_ASPECT = 2.5;

const LETTERBOX_BG = { r: 245, g: 245, b: 247, alpha: 1 } as const;

export async function ensureMinimaxH3ImageBytes(
  input: Buffer | Uint8Array,
  minEdge = MINIMAX_H3_MIN_IMAGE_EDGE,
): Promise<{ bytes: Buffer; changed: boolean; width: number; height: number }> {
  const raw = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const meta = await sharp(raw, { failOn: "none" }).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 1 || h < 1) {
    throw new Error("Reference image could not be read (invalid dimensions).");
  }

  const scale = Math.max(1, minEdge / w, minEdge / h);
  const rw = Math.ceil(w * scale);
  const rh = Math.ceil(h * scale);

  let cw = rw;
  let ch = rh;
  const ratio = rw / rh;
  if (ratio < MINIMAX_H3_MIN_ASPECT) {
    cw = Math.ceil(rh * MINIMAX_H3_MIN_ASPECT);
  } else if (ratio > MINIMAX_H3_MAX_ASPECT) {
    ch = Math.ceil(rw / MINIMAX_H3_MAX_ASPECT);
  }
  cw = Math.max(cw, minEdge);
  ch = Math.max(ch, minEdge);

  const changed = scale > 1 || cw !== w || ch !== h;
  if (!changed) {
    return { bytes: raw, changed: false, width: w, height: h };
  }

  const left = Math.floor((cw - rw) / 2);
  const top = Math.floor((ch - rh) / 2);
  const right = cw - rw - left;
  const bottom = ch - rh - top;

  let pipeline = sharp(raw, { failOn: "none" });
  if (scale > 1) {
    pipeline = pipeline.resize(rw, rh, { fit: "fill", kernel: "lanczos3" });
  }

  const bytes = await pipeline
    .extend({
      top,
      bottom,
      left,
      right,
      background: LETTERBOX_BG,
    })
    .png()
    .toBuffer();

  return { bytes, changed: true, width: cw, height: ch };
}

export async function ensureMinimaxH3ImageFile(file: File): Promise<File> {
  const raw = Buffer.from(await file.arrayBuffer());
  const ensured = await ensureMinimaxH3ImageBytes(raw);
  if (!ensured.changed) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "h3-ref";
  return new File([new Uint8Array(ensured.bytes)], `${base}.png`, {
    type: "image/png",
  });
}

/** Fetch/mirror already done — ensure size + ratio, re-upload to fal if changed. */
export async function ensureMinimaxH3FalImageUrl(falUrl: string): Promise<string> {
  const trimmed = falUrl.trim();
  if (!trimmed) return trimmed;
  const res = await fetch(trimmed, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch reference image (${res.status}).`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ensured = await ensureMinimaxH3ImageBytes(buf);
  if (!ensured.changed) return trimmed;
  const file = new File([new Uint8Array(ensured.bytes)], "h3-ref.png", {
    type: "image/png",
  });
  return fal.storage.upload(file);
}

/** Post-process generated stills before returning to the wizard / library. */
export async function persistMinimaxH3ReadyImages(input: {
  clerkId: string;
  sourceUrls: string[];
  fallbackUrls: string[];
  prompt?: string | null;
}): Promise<string[]> {
  const n = Math.min(input.sourceUrls.length, input.fallbackUrls.length);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const res = await fetch(input.sourceUrls[i], { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not fetch generated still (${res.status}).`);
    }
    const raw = Buffer.from(await res.arrayBuffer());
    const ensured = await ensureMinimaxH3ImageBytes(raw);
    out.push(
      await persistAndDurablize({
        clerkId: input.clerkId,
        kind: "image",
        sourceUrl: input.sourceUrls[i],
        fallbackUrl: input.fallbackUrls[i],
        prompt: input.prompt,
        bytes: ensured.bytes,
        contentType: "image/png",
      }),
    );
  }
  return out;
}
