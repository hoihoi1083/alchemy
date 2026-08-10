import { captionImageToVisionJson } from "@/lib/vision-json-repair";

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
	/** 反推 screenplay: 主体 / 场景 / 风格 / 色调 / 构图 / 细节. */
	sceneEssay: string;
};

const CONCEPT_SCHEMA =
	'{"sceneSummary":"","topic":"","subjects":"","visibleText":"","contentType":"","layoutStyle":"","colorPalette":"","typographyStyle":"","mood":"","motionHints":"","sceneEssay":""}';

function normalizeVision(
	parsed: Partial<ConceptImageVision>,
): ConceptImageVision {
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
		sceneEssay: String(parsed.sceneEssay ?? "").trim(),
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
		vision.sceneEssay ? `Scene essay: ${vision.sceneEssay}` : "",
	]
		.filter(Boolean)
		.join(". ");
}

export async function analyzeConceptReferenceImage(input: {
	imageUrl: string;
	conceptIdea?: string;
}): Promise<ConceptImageVision> {
	const parsed = await captionImageToVisionJson<Partial<ConceptImageVision>>({
		imageUrl: input.imageUrl,
		schemaExample: CONCEPT_SCHEMA,
		label: "Concept image vision",
		extraInstructions: [
			"contentType one of: infographic | social-carousel | product-ad | lifestyle-photo | poster | screenshot | logo | other",
			"layoutStyle: composition structure",
			"colorPalette / typographyStyle / mood: visual DNA for recreating the ad look",
			"motionHints: subtle animation ideas that preserve the look",
			"sceneEssay: 80–180 word text-to-image screenplay of THIS reference covering main content, scene setting, style, color tone, composition/camera, and material details. Describe what is seen — do not invent a different product. Note hero size in frame, foreground props, and background atmosphere.",
			input.conceptIdea ? `User also typed: ${input.conceptIdea}` : "",
		]
			.filter(Boolean)
			.join("\n"),
	});
	return normalizeVision(parsed);
}
