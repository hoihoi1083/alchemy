import { BANANA2_EDIT_ENDPOINT, BANANA2_TEXT_ENDPOINT } from "@/lib/image-endpoints";
import { buildImageRefinePrompt } from "@/lib/image-refine-prompt";
import {
  buildCanvasComposePrompt,
  buildCanvasVideoReferencePrompt,
  ULTRA_VIDEO_MAX_REF_IMAGES,
} from "@/lib/pro-canvas-compose";
import { buildScriptBriefWithBeats, clampUltraScriptSceneCount, mergeSceneBeatsFromCinematicScenes, type ScriptSceneBeat } from "@/lib/pro-canvas-script-plan";
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
  ultraVideoCameraForApi,
  videoProFromPartial,
} from "@/lib/ultra-pro-controls";

export type CanvasVideoRunOpts = {
  /** Single start frame (legacy). Prefer imageUrls when multiple refs. */
  imageUrl?: string;
  /** Up to ULTRA_VIDEO_MAX_REF_IMAGES stills — 2+ uses Seedance/H3 reference-to-video. */
  imageUrls?: string[];
  /** Aliases in the same order as imageUrls (@Hero → @Image1). */
  aliases?: string[];
  prompt: string;
  pro?: Partial<UltraVideoProControls>;
  /** Text-to-video uses static camera internally. */
  textOnly?: boolean;
};

export async function runCanvasVideoNode(opts: CanvasVideoRunOpts): Promise<string> {
  const pro = videoProFromPartial(opts.pro);
  if (!opts.prompt.trim()) throw new Error("Enter a video prompt.");

  const urls = (
    opts.imageUrls?.length
      ? opts.imageUrls
      : isHttpOrLibraryMediaUrl(opts.imageUrl)
        ? [opts.imageUrl!]
        : []
  )
    .filter((u) => isHttpOrLibraryMediaUrl(u))
    .slice(0, ULTRA_VIDEO_MAX_REF_IMAGES);
  const aliases = (opts.aliases ?? []).slice(0, urls.length);
  while (aliases.length < urls.length) {
    aliases.push(`Ref${aliases.length + 1}`);
  }

  const fd = new FormData();
  let promptBody = opts.prompt;
  if (urls.length >= 2) {
    fd.set("mode", "reference");
    fd.set("reference_image_urls", urls.join("\n"));
    promptBody = buildCanvasVideoReferencePrompt(opts.prompt, aliases);
  } else if (urls.length === 1) {
    fd.set("mode", "image");
    fd.set("image_start_url", urls[0]!);
    // Keep @Alias names readable even on single-image I2V (avoid「图片」collapse).
    promptBody = buildCanvasVideoReferencePrompt(opts.prompt, aliases).replace(
      /@Image1\b/g,
      aliases[0] ? `@${aliases[0]}` : "@Image1",
    );
  } else {
    fd.set("mode", "text");
  }

  const prompt = appendUltraVideoProToPrompt(promptBody, pro.artStyleId);
  fd.set("prompt", prompt);
  fd.set("fast", pro.fast ? "true" : "false");
  fd.set("resolution", pro.resolution);
  fd.set("duration", pro.duration);
  fd.set("aspect_ratio", pro.aspectRatio);
  const cameraForApi = opts.textOnly
    ? "Static Locked Shot"
    : ultraVideoCameraForApi(pro.camera);
  if (cameraForApi) {
    fd.set("camera", cameraForApi);
  } else {
    fd.set("camera", "Auto");
  }
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

export async function runCanvasScriptNode(opts: {
  brief: string;
  sceneCount?: number;
  sceneBeats?: ScriptSceneBeat[];
}): Promise<{
  scriptText: string;
  scenePrompts: string[];
  sceneImagePrompts: string[];
  sceneBeats: ScriptSceneBeat[];
}> {
  const brief = buildScriptBriefWithBeats(opts.brief, opts.sceneBeats);
  if (!brief.trim()) throw new Error("Enter a creative brief for script planning.");

  const sceneCount = clampUltraScriptSceneCount(opts.sceneCount);

  const res = await fetch("/api/plan-cinematic-reel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creativeBrief: brief, sceneCount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Script planning failed");

  const plan = (
    data as {
      plan?: {
        scenes?: {
          videoMotionPrompt?: string;
          sceneDescriptionZh?: string;
          imagePrompt?: string;
          spokenLine?: string;
          speaker?: string;
          role?: string;
          startSec?: number;
          endSec?: number;
        }[];
      };
    }
  ).plan;
  const scenes = plan?.scenes ?? [];
  const sceneImagePrompts = scenes
    .map((s) => s.imagePrompt?.trim() || s.sceneDescriptionZh?.trim())
    .filter((p): p is string => !!p);
  const scenePrompts = scenes
    .map((s) => s.videoMotionPrompt?.trim())
    .filter((p): p is string => !!p);
  // Fallback: if planner skipped image stills, derive a short still line (never prefer motion for images).
  while (sceneImagePrompts.length < scenePrompts.length) {
    const i = sceneImagePrompts.length;
    const motion = scenePrompts[i] ?? "";
    sceneImagePrompts.push(stillPromptFromMotion(motion) || `Scene ${i + 1} keyframe still`);
  }
  const sceneBeats = mergeSceneBeatsFromCinematicScenes(
    scenes.map((s, i) => ({
      spokenLine: s.spokenLine,
      speaker: s.speaker,
      role: s.role ?? `scene-${i + 1}`,
      startSec: typeof s.startSec === "number" ? s.startSec : i * 8,
      endSec: typeof s.endSec === "number" ? s.endSec : i * 8 + 8,
      sceneDescriptionZh: s.sceneDescriptionZh ?? "",
    })),
    opts.sceneBeats,
  );
  const lines = scenes.map((s, i) => {
    const parts = [`Scene ${i + 1}:`];
    if (s.sceneDescriptionZh) parts.push(s.sceneDescriptionZh);
    if (s.spokenLine) {
      parts.push(
        s.speaker ? `(${s.speaker}: "${s.spokenLine}")` : `("${s.spokenLine}")`,
      );
    }
    if (s.videoMotionPrompt) parts.push(`[${s.videoMotionPrompt}]`);
    return parts.join(" ");
  });
  const scriptText = lines.join("\n\n");
  if (!scriptText) throw new Error("No script returned from planner.");
  return { scriptText, scenePrompts, sceneImagePrompts, sceneBeats };
}

/** Collapse a Seedance motion paragraph into one still-friendly sentence. */
function stillPromptFromMotion(motion: string): string {
  const first = motion
    .split(/[,.]/)
    .map((s) => s.trim())
    .find((s) => s.length > 12 && !/rings|rises and falls|intensifies|drift|track|push-in|handheld/i.test(s));
  if (first) return `Single still: ${first}. No multi-panel, no comic grid, no on-image text.`;
  const clipped = motion.trim().slice(0, 140);
  return clipped
    ? `Single still capturing: ${clipped}. One frame only — no comic strip or storyboard grid.`
    : "";
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

export async function runCanvasVoiceNode(opts: {
  script: string;
  locale: "hk" | "en" | "cn";
  voicePresetId: string;
}): Promise<string> {
  const script = opts.script.trim();
  if (!script) throw new Error("Voice script is empty.");
  const res = await fetch("/api/ultra-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      script,
      locale: opts.locale,
      voice_preset: opts.voicePresetId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Voice generation failed");
  syncCreditsFromResponse(data);
  const audioUrl = (data as { audioUrl?: string }).audioUrl ?? "";
  if (!isHttpOrLibraryMediaUrl(audioUrl)) throw new Error("No audio URL from voice generation");
  return audioUrl;
}
