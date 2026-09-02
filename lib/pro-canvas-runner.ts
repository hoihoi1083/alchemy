import { BANANA2_EDIT_ENDPOINT, BANANA2_TEXT_ENDPOINT } from "@/lib/image-endpoints";
import { buildImageRefinePrompt } from "@/lib/image-refine-prompt";
import { buildCanvasComposePrompt } from "@/lib/pro-canvas-compose";
import type { CanvasImageSource } from "@/lib/pro-canvas-types";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import {
  appendUltraProToPrompt,
  DEFAULT_ULTRA_IMAGE_PRO,
  type UltraImageProControls,
} from "@/lib/ultra-pro-controls";
import {
  notifyCreditBalance,
  readCreditBalanceFromResponse,
} from "@/lib/credits-client";

function syncCreditsFromResponse(data: unknown): void {
  const balance = readCreditBalanceFromResponse(data);
  if (balance != null) notifyCreditBalance(balance);
}

export async function uploadCanvasAsset(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/upload-canvas-asset", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Upload failed");
  const url = (data as { url?: string }).url;
  if (!isHttpOrLibraryMediaUrl(url)) throw new Error("No URL in upload response");
  return url;
}

async function resolveSourceUrls(sources: CanvasImageSource[]): Promise<{
  urls: string[];
  aliases: string[];
}> {
  const urls: string[] = [];
  const aliases: string[] = [];
  for (const src of sources) {
    let url: string | undefined;
    if (src.file) {
      url = await uploadCanvasAsset(src.file);
    } else if (isHttpOrLibraryMediaUrl(src.url)) {
      url = src.url;
    }
    if (url) {
      urls.push(url);
      aliases.push(src.alias);
    }
  }
  return { urls, aliases };
}

export type CanvasImageRunOpts = {
  sources: CanvasImageSource[];
  prompt: string;
  /** Single-image reframe / small edit (camera node). */
  refine?: boolean;
  pro?: Partial<UltraImageProControls>;
};

function resolveImagePro(pro?: Partial<UltraImageProControls>): UltraImageProControls {
  return { ...DEFAULT_ULTRA_IMAGE_PRO, ...pro };
}

export async function runCanvasImageNode(opts: CanvasImageRunOpts): Promise<string> {
  const rawPrompt = opts.prompt.trim();
  if (!rawPrompt) throw new Error("Enter an image prompt.");

  const pro = resolveImagePro(opts.pro);
  const enhancedPrompt = appendUltraProToPrompt(rawPrompt, pro);
  const { urls, aliases } = await resolveSourceUrls(opts.sources);

  const jsonBase = {
    aspect_ratio: pro.aspectRatio,
    resolution: pro.resolution,
    art_style: pro.artStyleId,
    num_images: 1,
  };

  if (urls.length === 0) {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...jsonBase,
        prompt: enhancedPrompt,
        endpoint: BANANA2_TEXT_ENDPOINT,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Image generation failed");
    syncCreditsFromResponse(data);
    const url = (data as { imageUrl?: string }).imageUrl;
    if (!isHttpOrLibraryMediaUrl(url)) throw new Error("No image URL in response");
    return url;
  }

  if (opts.refine && urls.length === 1) {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...jsonBase,
        mode: "refine",
        prompt: buildImageRefinePrompt(enhancedPrompt),
        endpoint: BANANA2_EDIT_ENDPOINT,
        aspect_ratio: "auto",
        image_urls: urls,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Image edit failed");
    syncCreditsFromResponse(data);
    const url = (data as { imageUrl?: string }).imageUrl;
    if (!isHttpOrLibraryMediaUrl(url)) throw new Error("No image URL in response");
    return url;
  }

  const composePrompt = buildCanvasComposePrompt(enhancedPrompt, aliases);
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...jsonBase,
      mode: "compose",
      prompt: composePrompt,
      endpoint: BANANA2_EDIT_ENDPOINT,
      aspect_ratio: urls.length > 1 ? "auto" : pro.aspectRatio,
      image_urls: urls,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Image compose failed");
  syncCreditsFromResponse(data);
  const url = (data as { imageUrl?: string }).imageUrl;
  if (!isHttpOrLibraryMediaUrl(url)) throw new Error("No image URL in response");
  return url;
}

export async function runCanvasCameraNode(opts: {
  sourceUrl: string;
  cameraSuffix: string;
}): Promise<string> {
  const suffix = opts.cameraSuffix.trim();
  const prompt = suffix
    ? `Reframe this image with new camera angle. ${suffix}`
    : "Reframe with a new camera angle, same subject and style.";
  return runCanvasImageNode({
    sources: [{ nodeId: "camera", alias: "source", url: opts.sourceUrl }],
    prompt,
    refine: true,
  });
}

import {
  appendUltraVideoProToPrompt,
  type UltraVideoProControls,
  videoProFromPartial,
} from "@/lib/ultra-pro-controls";

export type CanvasVideoRunOpts = {
  imageUrl?: string;
  prompt: string;
  pro?: Partial<UltraVideoProControls>;
  /** Text-to-video uses static camera internally. */
  textOnly?: boolean;
};

export async function runCanvasVideoNode(opts: CanvasVideoRunOpts): Promise<string> {
  const pro = videoProFromPartial(opts.pro);
  const prompt = appendUltraVideoProToPrompt(opts.prompt, pro.artStyleId);
  if (!prompt.trim()) throw new Error("Enter a video prompt.");

  const fd = new FormData();
  if (isHttpOrLibraryMediaUrl(opts.imageUrl)) {
    fd.set("mode", "image");
    fd.set("image_start_url", opts.imageUrl);
  } else {
    fd.set("mode", "text");
  }
  fd.set("prompt", prompt);
  fd.set("fast", pro.fast ? "true" : "false");
  fd.set("resolution", pro.resolution);
  fd.set("duration", pro.duration);
  fd.set("aspect_ratio", pro.aspectRatio);
  fd.set("camera", opts.textOnly ? "Static Locked Shot" : pro.camera);
  fd.set("avoid_on_screen_text", "true");
  fd.set("generate_audio", pro.generateAudio ? "true" : "false");
  if (pro.motionStrength != null) {
    fd.set("motion_strength", String(pro.motionStrength));
  }

  const res = await fetch("/api/generate", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Video generation failed");
  syncCreditsFromResponse(data);
  const url = (data as { videoUrl?: string }).videoUrl;
  if (!isHttpOrLibraryMediaUrl(url)) throw new Error("No video URL in response");
  return url;
}

export async function runCanvasTextVideoNode(opts: {
  prompt: string;
  pro?: Partial<UltraVideoProControls>;
}): Promise<string> {
  return runCanvasVideoNode({
    prompt: opts.prompt,
    pro: { ...opts.pro, camera: "Static Locked Shot" },
    textOnly: true,
  });
}

export async function runCanvasScriptNode(opts: { brief: string }): Promise<{
  scriptText: string;
  scenePrompts: string[];
}> {
  const brief = opts.brief.trim();
  if (!brief) throw new Error("Enter a creative brief for script planning.");

  const res = await fetch("/api/plan-cinematic-reel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creativeBrief: brief, sceneCount: 3 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Script planning failed");

  const plan = (data as { plan?: { scenes?: { videoMotionPrompt?: string; sceneDescriptionZh?: string; imagePrompt?: string }[] } }).plan;
  const scenes = plan?.scenes ?? [];
  const scenePrompts = scenes
    .map((s) => s.videoMotionPrompt?.trim() || s.imagePrompt?.trim())
    .filter((p): p is string => !!p);
  const lines = scenes.map((s, i) => {
    const parts = [`Scene ${i + 1}:`];
    if (s.sceneDescriptionZh) parts.push(s.sceneDescriptionZh);
    if (s.videoMotionPrompt) parts.push(`[${s.videoMotionPrompt}]`);
    return parts.join(" ");
  });
  const scriptText = lines.join("\n\n");
  if (!scriptText) throw new Error("No script returned from planner.");
  return { scriptText, scenePrompts };
}

export async function runCanvasSpliceNode(opts: {
  videoUrls: string[];
  musicUrl?: string;
}): Promise<string> {
  const urls = opts.videoUrls.filter((u) => isHttpOrLibraryMediaUrl(u));
  if (urls.length < 1) throw new Error("Connect at least one video node with output.");

  let videoUrl: string;
  if (urls.length === 1) {
    videoUrl = urls[0];
  } else {
    const res = await fetch("/api/stitch-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_urls: urls }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Video splice failed");
    videoUrl = (data as { videoUrl?: string }).videoUrl ?? "";
    if (!isHttpOrLibraryMediaUrl(videoUrl)) throw new Error("No video URL from splice");
  }

  if (isHttpOrLibraryMediaUrl(opts.musicUrl)) {
    const res = await fetch("/api/add-bgm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, music_url: opts.musicUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Add music failed");
    syncCreditsFromResponse(data);
    const withBgm = (data as { videoUrl?: string }).videoUrl;
    if (isHttpOrLibraryMediaUrl(withBgm)) return withBgm;
  }

  return videoUrl;
}
