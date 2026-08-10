import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { analyzeCarouselReferenceImages } from "@/lib/carousel-reference-vision";
import { requireAppUser } from "@/lib/require-app-user";
import { analyzeConceptReferenceImage } from "@/lib/concept-image-vision";
import type { ImageCreativeMode } from "@/lib/creative-workflow";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import { isPromotionMode } from "@/lib/promotion-mode";
import { resolveReferenceStrategy } from "@/lib/reference-strategy";
import type { VisualStyleId } from "@/lib/visual-styles";
import {
	briefFromCarouselVision,
	briefFromConceptVision,
	briefFromUserTextOnly,
	mergeUserReferenceBrief,
	overrideBriefForContentResearch,
} from "@/lib/user-reference-brief";
import { normalizeReferenceImageFile } from "@/lib/xhs-image-browser";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import { ensureOptimizedSceneEssay } from "@/lib/optimize-reference-scene-prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
	const auth = await requireAppUser();
	if (!auth.ok) return auth.response;

	const key = process.env.FAL_KEY?.trim();
	if (!key) {
		return NextResponse.json(
			{ error: "Reference analysis is temporarily unavailable." },
			{ status: 503 },
		);
	}
	fal.config({ credentials: key });

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json(
			{ error: "Invalid form data." },
			{ status: 400 },
		);
	}

	const ref = formData.get("reference_image");
	if (!(ref instanceof File) || ref.size === 0) {
		return NextResponse.json(
			{ error: "Upload a reference image to analyze." },
			{ status: 400 },
		);
	}

	const conceptIdea = String(formData.get("conceptIdea") ?? "").trim();
	const headline = String(formData.get("headline") ?? "").trim();
	const subline = String(formData.get("subline") ?? "").trim();
	const product = String(formData.get("product") ?? "").trim();
	const promptExtra = String(formData.get("prompt_extra") ?? "").trim();
	const promotionModeRaw = String(
		formData.get("promotion_mode") ?? "physical",
	).trim();
	const promotionMode = isPromotionMode(promotionModeRaw)
		? promotionModeRaw
		: "physical";
	const imageOutputMode = (String(
		formData.get("image_output_mode") ?? "single",
	).trim() || "single") as ImageOutputMode;
	const visualStyleId = (String(
		formData.get("visual_style") ?? "product",
	).trim() || "product") as VisualStyleId;
	const imageCreativeMode = (String(
		formData.get("image_creative_mode") ?? "promo-ai",
	).trim() || "promo-ai") as ImageCreativeMode;
	const hasProductPhoto =
		String(formData.get("has_product_photo") ?? "") === "1";
	const carouselRefs = formData
		.getAll("carousel_reference_images")
		.filter((f): f is File => f instanceof File && f.size > 0)
		.slice(0, 5);

	try {
		const userInputs = { conceptIdea, headline, subline };
		const fromText = briefFromUserTextOnly({
			conceptIdea,
			headline,
			subline,
			promptExtra,
		});

		let brief;
		let vision: unknown;
		let analyzeWarning: string | undefined;

		try {
			if (carouselRefs.length > 0) {
				const files = [ref as File, ...carouselRefs];
				const imageUrls = await Promise.all(
					files.map(async (f) =>
						fal.storage.upload(
							await normalizeReferenceImageFile(f),
						),
					),
				);
				const carouselVision = await analyzeCarouselReferenceImages({
					imageUrls,
					conceptIdea: conceptIdea || undefined,
				});
				vision = carouselVision;
				brief = mergeUserReferenceBrief(
					briefFromCarouselVision(carouselVision, userInputs),
					fromText,
				);
			} else {
				const normalized = await normalizeReferenceImageFile(
					ref as File,
				);
				const imageUrl = await fal.storage.upload(normalized);
				const singleVision = await analyzeConceptReferenceImage({
					imageUrl,
					conceptIdea: conceptIdea || undefined,
				});
				vision = singleVision;
				brief = mergeUserReferenceBrief(
					briefFromConceptVision(singleVision, userInputs),
					fromText,
				);
			}
		} catch (visionErr: unknown) {
			// Soft fallback — keep dual generate usable (style pixels + research promptExtra)
			// even when Florence/DeepSeek vision structuring fails.
			analyzeWarning =
				visionErr instanceof Error
					? visionErr.message
					: "Reference vision failed.";
			brief =
				fromText ??
				briefFromUserTextOnly({
					conceptIdea: conceptIdea || product || headline,
					headline,
					subline,
					promptExtra,
				});
			if (!brief) {
				throw visionErr;
			}
			vision = null;
		}

		if (isContentResearchStyleExtra(promptExtra) && brief) {
			brief = overrideBriefForContentResearch(brief, {
				product: product || headline,
				headline,
				subline,
				conceptIdea,
			});
		}

		if (brief && (product || conceptIdea || headline)) {
			try {
				brief = await ensureOptimizedSceneEssay(brief, {
					product: product || conceptIdea,
					headline,
					subline,
				});
			} catch {
				/* keep unoptimized essay — generate-image can retry */
			}
		}

		const strategy = resolveReferenceStrategy({
			promotionMode,
			imageOutputMode,
			visualStyleId,
			imageCreativeMode,
			hasReferenceUpload: true,
			hasProductPhoto,
			hasReferenceBrief: true,
		});

		return NextResponse.json({
			brief,
			strategy,
			vision,
			carouselSlideCount: brief?.carouselSlideCount ?? 1,
			...(analyzeWarning ? { warning: analyzeWarning } : {}),
		});
	} catch (e: unknown) {
		const message =
			e instanceof Error ? e.message : "Reference analysis failed.";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
