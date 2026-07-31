import { captionImageToVisionJson } from "@/lib/vision-json-repair";

/** Per-slide style DNA from a reference carousel frame. */
export type CarouselSlideVision = {
  index: number;
  sceneSummary: string;
  layoutStyle: string;
  colorPalette: string;
  typographyStyle: string;
  mood: string;
  compositionHint: string;
  stagingPose: string;
};

/** Batch vision result for an ordered reference carousel (cover = slide 1). */
export type CarouselReferenceVision = {
  seriesSummary: string;
  sharedColorPalette: string;
  sharedTypography: string;
  sharedMood: string;
  sharedLayoutFamily: string;
  contentType: string;
  slides: CarouselSlideVision[];
};

function normalizeSlide(
  raw: Partial<CarouselSlideVision>,
  fallbackIndex: number,
): CarouselSlideVision {
  return {
    index: Math.max(1, Number(raw.index) || fallbackIndex),
    sceneSummary: String(raw.sceneSummary ?? "").trim(),
    layoutStyle: String(raw.layoutStyle ?? "").trim(),
    colorPalette: String(raw.colorPalette ?? "").trim(),
    typographyStyle: String(raw.typographyStyle ?? "").trim(),
    mood: String(raw.mood ?? "").trim(),
    compositionHint: String(raw.compositionHint ?? "").trim(),
    stagingPose: String(raw.stagingPose ?? "").trim(),
  };
}

type CoverParsed = {
  seriesSummary?: string;
  sharedColorPalette?: string;
  sharedTypography?: string;
  sharedMood?: string;
  sharedLayoutFamily?: string;
  contentType?: string;
  sceneSummary?: string;
  layoutStyle?: string;
  colorPalette?: string;
  typographyStyle?: string;
  mood?: string;
  compositionHint?: string;
  stagingPose?: string;
};

const COVER_SCHEMA =
  '{"seriesSummary":"","sharedColorPalette":"","sharedTypography":"","sharedMood":"","sharedLayoutFamily":"","contentType":"social-carousel","sceneSummary":"","layoutStyle":"","colorPalette":"","typographyStyle":"","mood":"","compositionHint":"","stagingPose":""}';

function slideSchema(index: number): string {
  return `{"index":${index},"sceneSummary":"","layoutStyle":"","colorPalette":"","typographyStyle":"","mood":"","compositionHint":"","stagingPose":""}`;
}

async function analyzeCoverSlide(
  imageUrl: string,
  slideCount: number,
  conceptIdea?: string,
): Promise<{ series: CoverParsed; slide: CarouselSlideVision }> {
  const parsed = await captionImageToVisionJson<CoverParsed>({
    imageUrl,
    schemaExample: COVER_SCHEMA,
    label: "Carousel cover vision",
    extraInstructions: [
      `This is cover / slide 1 of a ${slideCount}-slide carousel.`,
      "Borrow VISUAL STYLE and LAYOUT only.",
      conceptIdea ? `User campaign hint: ${conceptIdea}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  return {
    series: parsed,
    slide: normalizeSlide(parsed, 1),
  };
}

async function analyzeExtraSlide(
  imageUrl: string,
  index: number,
  slideCount: number,
  conceptIdea?: string,
): Promise<CarouselSlideVision> {
  const parsed = await captionImageToVisionJson<Partial<CarouselSlideVision>>({
    imageUrl,
    schemaExample: slideSchema(index),
    label: `Carousel slide ${index} vision`,
    extraInstructions: [
      `This is slide ${index} of ${slideCount}.`,
      "Borrow VISUAL STYLE and LAYOUT only.",
      conceptIdea ? `User campaign hint: ${conceptIdea}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  return normalizeSlide({ ...parsed, index }, index);
}

export async function analyzeCarouselReferenceImages(input: {
  imageUrls: string[];
  conceptIdea?: string;
}): Promise<CarouselReferenceVision> {
  if (input.imageUrls.length < 2) {
    throw new Error("Carousel analysis requires at least two reference images.");
  }

  const slideCount = input.imageUrls.length;
  const [cover, ...rest] = await Promise.all([
    analyzeCoverSlide(input.imageUrls[0], slideCount, input.conceptIdea),
    ...input.imageUrls
      .slice(1)
      .map((url, i) =>
        analyzeExtraSlide(url, i + 2, slideCount, input.conceptIdea),
      ),
  ]);

  return {
    seriesSummary: String(cover.series.seriesSummary ?? "").trim(),
    sharedColorPalette: String(cover.series.sharedColorPalette ?? "").trim(),
    sharedTypography: String(cover.series.sharedTypography ?? "").trim(),
    sharedMood: String(cover.series.sharedMood ?? "").trim(),
    sharedLayoutFamily: String(cover.series.sharedLayoutFamily ?? "").trim(),
    contentType: String(cover.series.contentType ?? "social-carousel").trim(),
    slides: [cover.slide, ...rest],
  };
}
