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
  imageUrl: string;
  prompt?: string;
  /** Prefer 1K for cheaper layer-separation COGS. */
  size?: string;
  signal?: AbortSignal;
};

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

  const body = {
    model,
    prompt,
    image: [opts.imageUrl],
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
    // Preserve vendor wording; callers map copyright / policy codes for UI.
    const err = new Error(msg) as Error & { code?: string; status?: number };
    err.status = res.status;
    if (/copyright/i.test(msg)) err.code = "copyright_restricted";
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
