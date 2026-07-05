import { BANANA2_EDIT_ENDPOINT, BANANA2_TEXT_ENDPOINT } from "@/lib/image-endpoints";
import { buildImageRefinePrompt } from "@/lib/image-refine-prompt";
import { buildCanvasComposePrompt } from "@/lib/pro-canvas-compose";
import { cameraPromptSuffix } from "@/lib/pro-canvas-camera";
import type { CanvasImageSource } from "@/lib/pro-canvas-types";

export async function uploadCanvasAsset(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/upload-canvas-asset", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Upload failed");
  const url = (data as { url?: string }).url;
  if (!url?.startsWith("http")) throw new Error("No URL in upload response");
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
    } else if (src.url?.startsWith("http")) {
      url = src.url;
    }
    if (url) {
      urls.push(url);
      aliases.push(src.alias);
    }
  }
  return { urls, aliases };
}

export async function runCanvasImageNode(opts: {
  sources: CanvasImageSource[];
  prompt: string;
  /** Single-image reframe / small edit (camera node). */
  refine?: boolean;
}): Promise<string> {
  const rawPrompt = opts.prompt.trim();
  if (!rawPrompt) throw new Error("Enter an image prompt.");

  const { urls, aliases } = await resolveSourceUrls(opts.sources);

  if (urls.length === 0) {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: rawPrompt,
        endpoint: BANANA2_TEXT_ENDPOINT,
        aspect_ratio: "9:16",
        num_images: 1,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Image generation failed");
    const url = (data as { imageUrl?: string }).imageUrl;
    if (!url?.startsWith("http")) throw new Error("No image URL in response");
    return url;
  }

  if (opts.refine && urls.length === 1) {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "refine",
        prompt: buildImageRefinePrompt(rawPrompt),
        endpoint: BANANA2_EDIT_ENDPOINT,
        aspect_ratio: "auto",
        num_images: 1,
        image_urls: urls,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Image edit failed");
    const url = (data as { imageUrl?: string }).imageUrl;
    if (!url?.startsWith("http")) throw new Error("No image URL in response");
    return url;
  }

  const composePrompt = buildCanvasComposePrompt(rawPrompt, aliases);
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "compose",
      prompt: composePrompt,
      endpoint: BANANA2_EDIT_ENDPOINT,
      aspect_ratio: urls.length > 1 ? "auto" : "9:16",
      num_images: 1,
      image_urls: urls,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Image compose failed");
  const url = (data as { imageUrl?: string }).imageUrl;
  if (!url?.startsWith("http")) throw new Error("No image URL in response");
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

export async function runCanvasVideoNode(opts: {
  imageUrl?: string;
  prompt: string;
  camera: string;
  duration: string;
  resolution: "480p" | "720p";
  fast: boolean;
}): Promise<string> {
  const prompt = opts.prompt.trim();
  if (!prompt) throw new Error("Enter a video prompt.");

  const fd = new FormData();
  if (opts.imageUrl?.startsWith("http")) {
    fd.set("mode", "image");
    fd.set("image_start_url", opts.imageUrl);
  } else {
    fd.set("mode", "text");
  }
  fd.set("prompt", prompt);
  fd.set("fast", opts.fast ? "true" : "false");
  fd.set("resolution", opts.resolution);
  fd.set("duration", opts.duration);
  fd.set("aspect_ratio", "9:16");
  fd.set("camera", opts.camera);
  fd.set("avoid_on_screen_text", "true");
  fd.set("generate_audio", "false");

  const res = await fetch("/api/generate", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Video generation failed");
  const url = (data as { videoUrl?: string }).videoUrl;
  if (!url?.startsWith("http")) throw new Error("No video URL in response");
  return url;
}

export async function runCanvasTextVideoNode(opts: {
  prompt: string;
  duration: string;
  resolution: "480p" | "720p";
  fast: boolean;
}): Promise<string> {
  return runCanvasVideoNode({
    prompt: opts.prompt,
    camera: "Static Locked Shot",
    duration: opts.duration,
    resolution: opts.resolution,
    fast: opts.fast,
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
  const urls = opts.videoUrls.filter((u) => u.startsWith("http"));
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
    if (!videoUrl.startsWith("http")) throw new Error("No video URL from splice");
  }

  if (opts.musicUrl?.startsWith("http")) {
    const res = await fetch("/api/add-bgm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, music_url: opts.musicUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Add music failed");
    const withBgm = (data as { videoUrl?: string }).videoUrl;
    if (withBgm?.startsWith("http")) return withBgm;
  }

  return videoUrl;
}
