import type { ContentPlatform } from "@/lib/content-research-types";
import { fetchResearchImagesAsFiles } from "@/lib/fetch-research-cover";
import { fetchResearchVideoAsFile } from "@/lib/fetch-research-video";
import { resolveResearchPostVideo } from "@/lib/resolve-research-video";

type ResearchRefWizard = {
  setImageCreativeMode: (mode: "reference-concept") => void;
  setImageRefPhoto: (file: File | null) => void;
  setExtraKitPhotos?: (files: File[]) => void;
  onImageInputModeChange?: (mode: "reference" | "product-ad" | "describe") => void;
  onVideoCreativeModeChange: (mode: "reference-concept") => void;
  onReferenceAdFile: (file: File | null) => void;
  setReferenceCarouselSlideCount?: (count: number) => void;
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
): Promise<void> {
  const urls =
    input.imageUrls ??
    (input.coverUrl ? [input.coverUrl] : undefined);

  if (urls?.length) {
    wizard.setImageCreativeMode("reference-concept");
    if (input.promotionMode === "concept" && wizard.onImageInputModeChange) {
      wizard.onImageInputModeChange("reference");
    }
    if (input.carouselSlideCount && wizard.setReferenceCarouselSlideCount) {
      wizard.setReferenceCarouselSlideCount(input.carouselSlideCount);
    }
    const files = await fetchResearchImagesAsFiles(urls, input.platform);
    if (files[0]) wizard.setImageRefPhoto(files[0]);
    if (files.length > 1 && wizard.setExtraKitPhotos) {
      wizard.setExtraKitPhotos(files.slice(1));
    }
  }

  if (!input.loadVideo) return;

  let videoUrl = input.videoUrl;
  if (!videoUrl && input.postId) {
    videoUrl =
      (await resolveResearchPostVideo(input.platform, input.postId, input.postUrl)) ?? undefined;
  }
  if (!videoUrl) return;

  wizard.onVideoCreativeModeChange("reference-concept");
  const videoFile = await fetchResearchVideoAsFile(
    videoUrl,
    input.platform,
    `${input.platform}-reference.mp4`,
  );
  if (videoFile) wizard.onReferenceAdFile(videoFile);
}
