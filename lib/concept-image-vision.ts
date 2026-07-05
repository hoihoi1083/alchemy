import { fal } from "@fal-ai/client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";

const VISION_ENDPOINT = "fal-ai/any-llm/vision";
const VISION_MODEL = "google/gemini-2.5-flash-lite";

export type ConceptImageVision = {
  sceneSummary: string;
  /** Main topic/subject of the image. */
  topic: string;
  subjects: string;
  /** Legible on-image text — preserve wording. */
  visibleText: string;
  contentType: string;
  /** Layout grid, composition, panel structure. */
  layoutStyle: string;
  colorPalette: string;
  typographyStyle: string;
  mood: string;
  motionHints: string;
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

function normalizeVision(parsed: Partial<ConceptImageVision>): ConceptImageVision {
  return {
    sceneSummary: String(parsed.sceneSummary ?? "").trim(),
    topic: String(parsed.topic ?? "").trim(),
    subjects: String(parsed.subjects ?? "").trim(),
    visibleText: String(parsed.visibleText ?? "").trim(),
    contentType: String(parsed.contentType ?? "").trim(),
    layoutStyle: String(parsed.layoutStyle ?? "").trim(),
    colorPalette: String(parsed.colorPalette ?? "").trim(),
    typographyStyle: String(parsed.typographyStyle ?? "").trim(),
    mood: String(parsed.mood ?? "").trim(),
    motionHints: String(parsed.motionHints ?? "").trim(),
  };
}

export function conceptImageVisionBlock(vision: ConceptImageVision): string {
  return [
    vision.topic ? `Topic: ${vision.topic}` : "",
    vision.sceneSummary,
    vision.subjects ? `Subjects: ${vision.subjects}` : "",
    vision.visibleText
      ? "Reference contained on-image text — ignore wording; use only user campaign copy in the target script."
      : "",
    vision.contentType ? `Content type: ${vision.contentType}` : "",
    vision.layoutStyle ? `Layout: ${vision.layoutStyle}` : "",
    vision.colorPalette ? `Colors: ${vision.colorPalette}` : "",
    vision.typographyStyle ? `Typography: ${vision.typographyStyle}` : "",
    vision.mood ? `Mood: ${vision.mood}` : "",
    vision.motionHints ? `Motion hints: ${vision.motionHints}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}

export async function analyzeConceptReferenceImage(input: {
  imageUrl: string;
  conceptIdea?: string;
}): Promise<ConceptImageVision> {
  const result = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      image_urls: [input.imageUrl],
      system_prompt:
        "You analyze reference images for social content creation. Extract BOTH content (topic, text, subjects) AND visual style (layout, colors, typography). Output valid JSON only.",
      prompt: [
        "The user uploaded this as a STYLE and/or CONTENT reference for what they want to create.",
        "Return JSON only:",
        '{"sceneSummary":"","topic":"","subjects":"","visibleText":"","contentType":"","layoutStyle":"","colorPalette":"","typographyStyle":"","mood":"","motionHints":""}',
        "",
        "Rules:",
        "- topic: what this is ABOUT — specific phrase, not generic category",
        "- sceneSummary: one sentence of what is visible",
        "- subjects: people/objects — name recognizable figures when obvious; include roles and props",
        "- visibleText: transcribe legible on-image text in original language (headlines, stats, labels)",
        '- contentType: "infographic" | "social-carousel" | "product-ad" | "lifestyle-photo" | "poster" | "screenshot" | "logo" | "other"',
        "- layoutStyle: composition structure (centered hero + side stats, 3-panel row, dark full-bleed, white edu poster, numbered list…)",
        "- colorPalette: dominant colors and background (dark charcoal + gold, white + red headlines…)",
        "- typographyStyle: headline/body treatment (bold Chinese display type, emoji bullets, serif stats…)",
        "- mood: lighting and emotional tone",
        "- motionHints: subtle animation that preserves this look",
        "- Do NOT invent elements not visible",
        "- Do NOT replace specific subjects with generic terms when identity is obvious",
        input.conceptIdea ? `User also typed: ${input.conceptIdea}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    logs: false,
  });

  const raw = extractVisionText(result.data);
  if (!raw) throw new Error("Vision model returned an empty analysis.");
  return normalizeVision(
    parseLlmJsonObject<Partial<ConceptImageVision>>(raw, "Concept image vision"),
  );
}
