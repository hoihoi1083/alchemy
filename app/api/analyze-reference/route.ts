import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { analyzeCarouselReferenceImages } from "@/lib/carousel-reference-vision";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { planMeetsMinimum } from "@/lib/billing/plan-gates";
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
import { parseStoryboardSceneCount } from "@/lib/ad-pack-preferences";
import { resolveArtStyleId } from "@/lib/art-style";
import { parseImageTextMode } from "@/lib/image-text-mode";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { wizardPromoteName } from "@/lib/wizard-promote-name";
import {
	researchImageAnalysisFromCarouselVision,
	researchImageAnalysisFromConceptVision,
} from "@/lib/image-reference-storyboard";
import { planVideoStoryboardFromImageReference } from "@/lib/video-storyboard-plan";
import type { CarouselReferenceVision } from "@/lib/carousel-reference-vision";
import type { ConceptImageVision } from "@/lib/concept-image-vision";

export const runtime = "nodejs";
/** Vision + optional DeepSeek storyboard plan for research stills. */
export const maxDuration = 300;

export async function POST(request: Request) {
	const auth = await requireAppUser();
	if (!auth.ok) return auth.response;
	const userPlan = await getUserPlan(auth.user.userId);
	const canPlanStoryboard = planMeetsMinimum(userPlan, "pro");

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
	const wantStoryboardPlan =
		String(formData.get("plan_storyboard") ?? "false").trim() === "true";
	const planStoryboard =
		wantStoryboardPlan &&
		canPlanStoryboard &&
		(visualStyleId === "storyboard-video" ||
			String(formData.get("workflow_mode") ?? "").trim() === "combined");
	const sceneCountTarget = parseStoryboardSceneCount(
		String(formData.get("scene_count") ?? "auto"),
	);
	const outputDurationRaw = Number(
		String(formData.get("output_duration_sec") ?? "").trim(),
	);
	const outputDurationSec =
		Number.isFinite(outputDurationRaw) && outputDurationRaw >= 4 && outputDurationRaw <= 15
			? Math.round(outputDurationRaw)
			: 8;
	const promptMarket = (String(formData.get("prompt_market") ?? "hk").trim() ||
		"hk") as PromptMarket;
	const subjectFraming = (String(formData.get("subject_framing") ?? "auto").trim() ||
		"auto") as SubjectFraming;
	const artStyleId = resolveArtStyleId(String(formData.get("art_style") ?? "").trim());
	const offer = String(formData.get("offer") ?? "").trim();
	const business = String(formData.get("business") ?? "").trim();
	const promoteName = wizardPromoteName({
		promotionMode,
		product,
		headline,
		conceptIdea,
	});

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

		const preferCompositionRemap = ["1", "true", "yes"].includes(
			String(formData.get("prefer_composition_remap") ?? "")
				.trim()
				.toLowerCase(),
		);
		const compositionRemapKeepHero = ["1", "true", "yes"].includes(
			String(formData.get("composition_remap_keep_hero") ?? "")
				.trim()
				.toLowerCase(),
		);

		const strategy = resolveReferenceStrategy({
			promotionMode,
			imageOutputMode,
			visualStyleId,
			imageCreativeMode,
			hasReferenceUpload: true,
			hasProductPhoto,
			hasReferenceBrief: true,
			preferCompositionRemap,
			compositionRemapKeepHero,
		});

		let storyboardPlan:
			| Awaited<ReturnType<typeof planVideoStoryboardFromImageReference>>
			| undefined;
		let storyboardPlanError: string | undefined;
		if (wantStoryboardPlan && !canPlanStoryboard) {
			storyboardPlanError = "Storyboard requires Pro plan or above.";
		} else if (planStoryboard && promoteName && vision) {
			try {
				const imageAnalysis =
					carouselRefs.length > 0
						? researchImageAnalysisFromCarouselVision(
								vision as CarouselReferenceVision,
							)
						: researchImageAnalysisFromConceptVision(
								vision as ConceptImageVision,
							);
				storyboardPlan = await planVideoStoryboardFromImageReference({
					analysis: imageAnalysis,
					product: promoteName,
					business,
					headline,
					subline,
					offer,
					promptExtra,
					durationSec: outputDurationSec,
					market: promptMarket,
					promotionMode,
					artStyleId,
					referenceStrategyKind: strategy.kind,
					sceneCountTarget,
					imageTextMode: parseImageTextMode(
						formData.get("image_text_mode") as string | null,
					),
				});
			} catch (planErr: unknown) {
				storyboardPlanError =
					planErr instanceof Error ? planErr.message : "Storyboard plan failed.";
				console.warn("[analyze-reference] storyboard plan failed:", storyboardPlanError);
			}
		}

		return NextResponse.json({
			brief,
			strategy,
			vision,
			carouselSlideCount: brief?.carouselSlideCount ?? 1,
			...(storyboardPlan ? { storyboardPlan } : {}),
			...(storyboardPlanError ? { storyboardPlanError } : {}),
			...(analyzeWarning ? { warning: analyzeWarning } : {}),
		});
	} catch (e: unknown) {
		const message =
			e instanceof Error ? e.message : "Reference analysis failed.";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
