/**
 * BytePlus ModelArk (intl) — Seedream image APIs.
 * Auth: BYTEPLUS_API_KEY or ARK_API_KEY
 * Base: https://ark.ap-southeast.bytepluses.com/api/v3
 */

const DEFAULT_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
const DEFAULT_SEEDREAM_MODEL = "dola-seedream-5-0-pro-260628";

export function byteplusApiKey(): string | null {
  const key =
    process.env.BYTEPLUS_API_KEY?.trim() ||
    process.env.ARK_API_KEY?.trim() ||
    "";
  return key || null;
}

export function byteplusArkBaseUrl(): string {
  const raw =
    process.env.BYTEPLUS_ARK_BASE_URL?.trim() ||
    process.env.ARK_BASE_URL?.trim() ||
    DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export function byteplusSeedreamModel(): string {
  return (
    process.env.BYTEPLUS_SEEDREAM_MODEL?.trim() ||
    process.env.ARK_SEEDREAM_MODEL?.trim() ||
    DEFAULT_SEEDREAM_MODEL
  );
}

export type ByteplusLayerBoundingBox = {
  absolute?: number[];
  normalized?: number[];
};

export type ByteplusImageDataItem = {
  url?: string;
  b64_json?: string;
  size?: string;
  z_index?: number;
  name?: string;
  description?: string;
  bounding_box?: ByteplusLayerBoundingBox;
  error?: { code?: string; message?: string };
};

export type ByteplusImageGenerationResponse = {
  model?: string;
  created?: number;
  data?: ByteplusImageDataItem[];
  error?: { code?: string; message?: string };
  usage?: { generated_images?: number };
};

export type SeedreamLayerizeOptions = {
  /** Public https URL or data:image/...;base64,... */
  imageUrl: string;
  prompt?: string;
  /** Prefer 1K for cheaper layer-separation COGS. */
  size?: string;
  signal?: AbortSignal;
};

/** Seedream layer-decomp input limits (vendor + common mirrors). */
const SEEDREAM_MIN_PIXELS = 512 * 512;
const SEEDREAM_MAX_PIXELS = 36_000_000;
const SEEDREAM_MAX_EDGE = 4096;
const SEEDREAM_MIN_EDGE = 512;

/**
 * Normalize a source buffer into a JPEG Seedream can ingest:
 * - JPEG (not WebP/HEIC)
 * - edge length and pixel count within vendor bounds
 * Returns a data URL (BytePlus fetches our fal URLs unreliably from their side).
 */
export async function prepareSeedreamLayerInputDataUrl(
  source: Buffer,
): Promise<{ dataUrl: string; width: number; height: number; bytes: number }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(source).rotate().metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Could not read image size for Seedream.");

  const pixels = w * h;
  let scale = 1;
  if (pixels > SEEDREAM_MAX_PIXELS) {
    scale = Math.sqrt(SEEDREAM_MAX_PIXELS / pixels);
  }
  const longEdge = Math.max(w, h);
  if (longEdge * scale > SEEDREAM_MAX_EDGE) {
    scale = Math.min(scale, SEEDREAM_MAX_EDGE / longEdge);
  }
  const shortEdge = Math.min(w, h);
  if (shortEdge * scale < SEEDREAM_MIN_EDGE && shortEdge > 0) {
    scale = Math.max(scale, SEEDREAM_MIN_EDGE / shortEdge);
  }

  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  if (tw * th < SEEDREAM_MIN_PIXELS) {
    throw new Error(
      `Image too small for Seedream layer split (${w}×${h}). Use at least ~512×512.`,
    );
  }

  const jpeg = await sharp(source)
    .rotate()
    .resize(tw, th, { fit: "fill", kernel: "lanczos3" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  if (jpeg.byteLength > 28 * 1024 * 1024) {
    const tighter = await sharp(source)
      .rotate()
      .resize(tw, th, { fit: "fill", kernel: "lanczos3" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return {
      dataUrl: `data:image/jpeg;base64,${tighter.toString("base64")}`,
      width: tw,
      height: th,
      bytes: tighter.byteLength,
    };
  }

  return {
    dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
    width: tw,
    height: th,
    bytes: jpeg.byteLength,
  };
}

/**
 * Seedream 5.0 Pro layer separation via images/generations + layer_decomposition.
 * Returns data[]: base at z_index 0, then transparent layers with metadata.
 */
export async function seedreamLayerDecomposition(
  opts: SeedreamLayerizeOptions,
): Promise<ByteplusImageGenerationResponse> {
  const key = byteplusApiKey();
  if (!key) {
    throw new Error(
      "BYTEPLUS_API_KEY (or ARK_API_KEY) is not configured. Add it to .env.local and restart.",
    );
  }

  const model = byteplusSeedreamModel();
  const prompt =
    (opts.prompt || "").trim() ||
    "Separate background, main subjects, products, logos, and text into independent layers. Return English names.";

  const imageRef = opts.imageUrl.trim();
  if (!imageRef) throw new Error("Seedream image is required.");

  const body = {
    model,
    prompt,
    image: [imageRef],
    layer_decomposition: true,
    size: opts.size || "1K",
    response_format: "url",
    watermark: false,
    output_format: "png",
    optimize_prompt_options: { mode: "fast" },
  };

  const res = await fetch(`${byteplusArkBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
    cache: "no-store",
  });

  const raw = await res.text();
  let parsed: ByteplusImageGenerationResponse = {};
  try {
    parsed = JSON.parse(raw) as ByteplusImageGenerationResponse;
  } catch {
    throw new Error(
      `BytePlus Seedream failed (${res.status}): ${raw.slice(0, 240) || res.statusText}`,
    );
  }

  if (!res.ok || parsed.error?.message) {
    const msg =
      parsed.error?.message?.trim() ||
      `BytePlus Seedream failed (${res.status}).`;
    const err = new Error(msg) as Error & { code?: string; status?: number };
    err.status = res.status;
    if (/copyright/i.test(msg)) err.code = "copyright_restricted";
    else if (/could not be processed|not valid|invalid.*image|image content/i.test(msg)) {
      err.code = "image_unprocessable";
    }
    throw err;
  }

  return parsed;
}

/** True when BytePlus refused the job for IP / brand / likeness filters. */
export function isSeedreamCopyrightError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; message?: string };
  if (err.code === "copyright_restricted") return true;
  return /copyright/i.test(err.message || String(e));
}

/** True when the source image itself was rejected (format/size/fetch), not policy. */
export function isSeedreamImageUnprocessableError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; message?: string };
  if (err.code === "image_unprocessable") return true;
  return /could not be processed|not valid|invalid.*image|image content/i.test(
    err.message || String(e),
  );
}
