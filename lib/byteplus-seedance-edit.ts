/**
 * BytePlus ModelArk — Seedance video edit (contents/generations/tasks).
 * Same key as Seedream: BYTEPLUS_API_KEY / ARK_API_KEY.
 * Default model: Seedance 2.0 Fast @ 720p (SMB cost).
 */

import { byteplusApiKey, byteplusArkBaseUrl } from "@/lib/byteplus-ark";

const DEFAULT_EDIT_MODEL = "dreamina-seedance-2-0-fast-260128";
const POLL_MS = 4000;
const MAX_POLLS = 90; // ~6 min

export type CaptionEditJob = "product" | "scene" | "style";

export function byteplusSeedanceEditModel(): string {
  return (
    process.env.BYTEPLUS_SEEDANCE_EDIT_MODEL?.trim() ||
    process.env.BYTEPLUS_SEEDANCE_MODEL?.trim() ||
    DEFAULT_EDIT_MODEL
  );
}

export function buildCaptionEditPrompt(opts: {
  job: CaptionEditJob;
  note?: string;
  hasRefImage: boolean;
}): string {
  const note = (opts.note || "").trim();
  const noteBit = note ? ` Extra note: ${note}.` : "";
  const ref = opts.hasRefImage
    ? "Use the reference image for the replacement look."
    : "Follow the text note only; keep subjects and motion from the reference video.";

  switch (opts.job) {
    case "product":
      return (
        `Edit video: replace the main product in the reference video with the product from the reference image. ` +
        `Keep all original motion, camera, timing, and composition. No subtitles. No watermark. ${ref}${noteBit}`
      );
    case "scene":
      return (
        `Edit video: replace the background / environment in the reference video with the scene from the reference image. ` +
        `Keep people, products, actions, and camera motion unchanged. No subtitles. No watermark. ${ref}${noteBit}`
      );
    case "style":
      return (
        `Edit video: restyle the reference video to match the look of the reference image (or the note). ` +
        `Keep subjects, actions, and camera motion. Change lighting/style only. No subtitles. No watermark. ${ref}${noteBit}`
      );
  }
}

type ArkContentItem =
  | { type: "text"; text: string }
  | { type: "video_url"; video_url: { url: string }; role?: string }
  | { type: "image_url"; image_url: { url: string }; role?: string };

export type ByteplusSeedanceEditInput = {
  videoUrl: string;
  imageUrl?: string;
  prompt: string;
  resolution?: "480p" | "720p" | "1080p";
  signal?: AbortSignal;
};

export type ByteplusSeedanceEditResult = {
  videoUrl: string;
  taskId: string;
  model: string;
  provider: "byteplus-modelark";
};

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Create + poll ModelArk Seedance edit task.
 * Requires BYTEPLUS_API_KEY and an activated dreamina-seedance-* model.
 */
export async function runByteplusSeedanceEdit(
  opts: ByteplusSeedanceEditInput,
): Promise<ByteplusSeedanceEditResult> {
  const key = byteplusApiKey();
  if (!key) {
    throw new Error(
      "BYTEPLUS_API_KEY (or ARK_API_KEY) is not configured for ModelArk Seedance edit.",
    );
  }

  const model = byteplusSeedanceEditModel();
  const content: ArkContentItem[] = [
    { type: "text", text: opts.prompt },
    {
      type: "video_url",
      video_url: { url: opts.videoUrl },
      role: "reference_video",
    },
  ];
  if (opts.imageUrl?.trim()) {
    content.push({
      type: "image_url",
      image_url: { url: opts.imageUrl.trim() },
      role: "reference_image",
    });
  }

  const body = {
    model,
    content,
    ratio: "adaptive",
    duration: -1,
    resolution: opts.resolution || "720p",
    generate_audio: false,
    omni_reference_task_type: "edit",
  };

  const base = byteplusArkBaseUrl();
  const createRes = await fetch(`${base}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
    cache: "no-store",
  });
  const createRaw = await createRes.text();
  let created: { id?: string; error?: { message?: string } } = {};
  try {
    created = JSON.parse(createRaw) as typeof created;
  } catch {
    throw new Error(
      `ModelArk Seedance create failed (${createRes.status}): ${createRaw.slice(0, 240)}`,
    );
  }
  if (!createRes.ok || !created.id) {
    throw new Error(
      created.error?.message?.trim() ||
        `ModelArk Seedance create failed (${createRes.status}).`,
    );
  }

  const taskId = created.id;
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_MS, opts.signal);
    const pollRes = await fetch(`${base}/contents/generations/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: opts.signal,
      cache: "no-store",
    });
    const pollRaw = await pollRes.text();
    let task: {
      status?: string;
      content?: { video_url?: string };
      error?: { message?: string };
    } = {};
    try {
      task = JSON.parse(pollRaw) as typeof task;
    } catch {
      throw new Error(
        `ModelArk Seedance poll failed (${pollRes.status}): ${pollRaw.slice(0, 240)}`,
      );
    }
    const status = (task.status || "").toLowerCase();
    if (status === "succeeded") {
      const videoUrl = task.content?.video_url?.trim();
      if (!videoUrl) {
        throw new Error("ModelArk Seedance succeeded but returned no video_url.");
      }
      return { videoUrl, taskId, model, provider: "byteplus-modelark" };
    }
    if (status === "failed" || status === "expired") {
      throw new Error(
        task.error?.message?.trim() ||
          `ModelArk Seedance task ${status} (${taskId}).`,
      );
    }
  }
  throw new Error(`ModelArk Seedance timed out waiting for task ${taskId}.`);
}
