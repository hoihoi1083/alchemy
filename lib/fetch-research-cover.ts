import type { ContentPlatform } from "@/lib/content-research-types";
import { MAX_TEACHING_CAROUSEL_SLIDE_COUNT } from "@/lib/teaching-carousel-types";

/** Fetch platform post images through our proxy and return Files for the wizard. */
export async function fetchResearchImagesAsFiles(
  imageUrls: string[],
  platform: ContentPlatform,
  max = MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
): Promise<File[]> {
  const urls = imageUrls.filter(Boolean).slice(0, max);
  const files: File[] = [];
  for (let i = 0; i < urls.length; i++) {
    const file = await fetchResearchCoverAsFile(
      urls[i],
      platform,
      `${platform}-reference-${i + 1}.jpg`,
    );
    if (file) files.push(file);
  }
  return files;
}

/** Fetch a platform post cover through our image proxy and return a File for the wizard. */
export async function fetchResearchCoverAsFile(
  coverUrl: string,
  platform: ContentPlatform,
  filename = "platform-reference.jpg",
): Promise<File | null> {
  try {
    const proxy = `/api/research-post-image?url=${encodeURIComponent(coverUrl)}&platform=${platform}`;
    const res = await fetch(proxy);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    return new File([blob], filename, { type });
  } catch {
    return null;
  }
}
