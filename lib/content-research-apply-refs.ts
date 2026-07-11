import type { ContentPlatform } from "@/lib/content-research-types";
import { fetchResearchImagesAsFiles } from "@/lib/fetch-research-cover";
import { fetchResearchVideoAsFile } from "@/lib/fetch-research-video";
import { resolveResearchPostVideo } from "@/lib/resolve-research-video";

export type ResearchRefWizard = {
  setImageCreativeMode: (mode: "reference-concept") => void;
  setImageRefPhoto: (file: File | null) => void;
  setExtraKitPhotos?: (files: File[]) => void;
  onImageInputModeChange?: (mode: "reference" | "product-ad" | "describe") => void;
  onVideoCreativeModeChange: (mode: "reference-concept") => void;
  onReferenceAdFile: (file: File | null) => void;
  setReferenceCarouselSlideCount?: (count: number) => void;
};

export type ResearchRefDeps = {
  fetchResearchImagesAsFiles: typeof fetchResearchImagesAsFiles;
  fetchResearchVideoAsFile: typeof fetchResearchVideoAsFile;
  resolveResearchPostVideo: typeof resolveResearchPostVideo;
};

export type ResearchRefAttachResult = {
  coverAttached: boolean;
  videoRequested: boolean;
  videoAttached: boolean;
  videoError?: "no_url" | "resolve_failed" | "download_failed";
};

const defaultDeps: ResearchRefDeps = {
  fetchResearchImagesAsFiles,
  fetchResearchVideoAsFile,
  resolveResearchPostVideo,
};

export async function applyResearchPostReferences(
  input: {
    platform: ContentPlatform;
    promotionMode: "physical" | "concept";
    imageUrls?: string[];
    coverUrl?: string;
    videoUrl?: string;
    postId?: string;
    postUrl?: string;
    carouselSlideCount?: number;
    loadVideo?: boolean;
  },
  wizard: ResearchRefWizard,
  deps: ResearchRefDeps = defaultDeps,
): Promise<ResearchRefAttachResult> {
  let coverAttached = false;
  const urls =
    input.imageUrls ??
    (input.coverUrl ? [input.coverUrl] : undefined);

  async function attachCoverImages(): Promise<void> {
    if (!urls?.length) return;
    const files = await deps.fetchResearchImagesAsFiles(urls, input.platform);
    if (files[0]) {
      wizard.setImageCreativeMode("reference-concept");
      if (input.promotionMode === "concept" && wizard.onImageInputModeChange) {
        wizard.onImageInputModeChange("reference");
      }
      if (input.carouselSlideCount && wizard.setReferenceCarouselSlideCount) {
        wizard.setReferenceCarouselSlideCount(input.carouselSlideCount);
      }
      wizard.setImageRefPhoto(files[0]);
      coverAttached = true;
      if (files.length > 1 && wizard.setExtraKitPhotos) {
        wizard.setExtraKitPhotos(files.slice(1));
      }
    }
  }

  if (!input.loadVideo) {
    await attachCoverImages();
    return { coverAttached, videoRequested: false, videoAttached: false };
  }

  let videoUrl = input.videoUrl?.trim();
  const triedResolve = !videoUrl && Boolean(input.postId || input.postUrl);
  if (!videoUrl && triedResolve) {
    videoUrl =
      (await deps.resolveResearchPostVideo(
        input.platform,
        input.postId ?? "",
        input.postUrl,
      )) ?? undefined;
  }

  if (!videoUrl) {
    await attachCoverImages();
    return {
      coverAttached,
      videoRequested: true,
      videoAttached: false,
      videoError: triedResolve ? "resolve_failed" : "no_url",
    };
  }

  wizard.onVideoCreativeModeChange("reference-concept");
  const [videoFile] = await Promise.all([
    deps.fetchResearchVideoAsFile(
      videoUrl,
      input.platform,
      `${input.platform}-reference.mp4`,
    ),
    attachCoverImages(),
  ]);

  if (!videoFile) {
    return {
      coverAttached,
      videoRequested: true,
      videoAttached: false,
      videoError: "download_failed",
    };
  }

  wizard.onReferenceAdFile(videoFile);
  return { coverAttached, videoRequested: true, videoAttached: true };
}
