export type ImageUploadWarning = "very-small" | "low-resolution";

export type ImageUploadQualityResult = {
  width: number;
  height: number;
  warnings: ImageUploadWarning[];
};

const MIN_EDGE_HARD = 512;
const MIN_EDGE_SOFT = 800;

export async function analyzeProductImageFile(file: File): Promise<ImageUploadQualityResult> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close?.();
  return buildImageUploadQualityResult(width, height);
}

export async function analyzeImageUrl(url: string): Promise<ImageUploadQualityResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch image for analysis");
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close?.();
  return buildImageUploadQualityResult(width, height);
}

function buildImageUploadQualityResult(width: number, height: number): ImageUploadQualityResult {
  const warnings: ImageUploadWarning[] = [];
  if (width < MIN_EDGE_HARD || height < MIN_EDGE_HARD) {
    warnings.push("very-small");
  } else if (width < MIN_EDGE_SOFT || height < MIN_EDGE_SOFT) {
    warnings.push("low-resolution");
  }
  return { width, height, warnings };
}
