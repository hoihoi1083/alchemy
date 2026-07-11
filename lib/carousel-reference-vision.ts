import { fal } from "@fal-ai/client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";

const VISION_ENDPOINT = "fal-ai/any-llm/vision";
const VISION_MODEL = "google/gemini-2.5-flash-lite";

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

function extractVisionText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.output === "string") return d.output.trim();
  if (typeof d.text === "string") return d.text.trim();
  if (typeof d.response === "string") return d.response.trim();
  const choices = d.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return "";
}

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

function normalizeCarouselVision(
  parsed: Partial<CarouselReferenceVision>,
  slideCount: number,
): CarouselReferenceVision {
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const slides = rawSlides.slice(0, slideCount).map((s, i) => normalizeSlide(s, i + 1));
  while (slides.length < slideCount) {
    slides.push(normalizeSlide({}, slides.length + 1));
  }
  return {
    seriesSummary: String(parsed.seriesSummary ?? "").trim(),
    sharedColorPalette: String(parsed.sharedColorPalette ?? "").trim(),
    sharedTypography: String(parsed.sharedTypography ?? "").trim(),
    sharedMood: String(parsed.sharedMood ?? "").trim(),
    sharedLayoutFamily: String(parsed.sharedLayoutFamily ?? "").trim(),
    contentType: String(parsed.contentType ?? "social-carousel").trim(),
    slides,
  };
}

function buildCarouselVisionPrompt(slideCount: number, conceptIdea?: string): string {
  const imageLines = Array.from({ length: slideCount }, (_, i) => `IMAGE ${i + 1} (slide ${i + 1})`).join(
    "\n",
  );
  return [
    `Analyze these ${slideCount} carousel slides from a social post IN ORDER (slide 1 = cover).`,
    "The user wants to borrow VISUAL STYLE and LAYOUT — not copy subject matter or on-image text.",
    "Return JSON only:",
    '{"seriesSummary":"","sharedColorPalette":"","sharedTypography":"","sharedMood":"","sharedLayoutFamily":"","contentType":"","slides":[{"index":1,"sceneSummary":"","layoutStyle":"","colorPalette":"","typographyStyle":"","mood":"","compositionHint":"","stagingPose":""}]}',
    "",
    "Rules:",
    "- seriesSummary: one sentence on the carousel's shared visual identity (photography vs infographic, brand feel)",
    "- sharedColorPalette: dominant colors across ALL slides (e.g. dark leather + white serif labels)",
    "- sharedTypography: headline/label treatment repeated across slides",
    "- sharedMood: lighting and emotional tone shared across the series",
    "- sharedLayoutFamily: grid type or carousel structure (2x2 collage, annotated flat lay, wrist lifestyle…)",
    '- contentType: "social-carousel" | "product-ad" | "lifestyle-photo" | "infographic" | "other"',
    "- slides: one entry per image below, index 1…N in order",
    "- sceneSummary: what is visible on that slide (composition, props, background surface)",
    "- layoutStyle: that slide's panel structure (centered circle bracelet, split text/image, 4-up grid cell…)",
    "- compositionHint: planner-ready phrase for recreating this slide's layout with a different product",
    "- stagingPose: product presentation (flat lay circle, on wrist, in box, 2x2 grid cell, annotated callouts…)",
    "- colorPalette / typographyStyle / mood: slide-specific overrides when they differ from shared fields",
    "- visibleText: do NOT transcribe — only note if handwritten labels or brand header exist",
    "- Do NOT invent elements not visible",
    conceptIdea ? `User campaign hint: ${conceptIdea}` : "",
    "",
    "Images in order:",
    imageLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analyzeCarouselReferenceImages(input: {
  imageUrls: string[];
  conceptIdea?: string;
}): Promise<CarouselReferenceVision> {
  if (input.imageUrls.length < 2) {
    throw new Error("Carousel analysis requires at least two reference images.");
  }

  const result = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      image_urls: input.imageUrls,
      system_prompt:
        "You analyze social carousel reference slides for marketing recreation. Extract shared visual DNA and per-slide layout. Output valid JSON only.",
      prompt: buildCarouselVisionPrompt(input.imageUrls.length, input.conceptIdea),
    },
    logs: false,
  });

  const raw = extractVisionText(result.data);
  if (!raw) throw new Error("Vision model returned an empty carousel analysis.");
  return normalizeCarouselVision(
    parseLlmJsonObject<Partial<CarouselReferenceVision>>(raw, "Carousel reference vision"),
    input.imageUrls.length,
  );
}
