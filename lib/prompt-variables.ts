import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import type { BrandKit } from "@/lib/brand-kit";
import {
	brandKitHasPromptContent,
	brandKitLogoImagePromptBlock,
	brandKitPromptBlock,
	thirdPartyBrandGuardBlock,
} from "@/lib/brand-merge";
import type { ImageTextMode } from "@/lib/image-text-mode";
import {
	MOTION_POSTER_DIALECTS,
	type MotionPosterDialectId,
} from "@/lib/motion-poster-dialects";
import { TEXTLESS_IMAGE_GUARD } from "@/lib/image-text-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";
import {
	isInfographicLikeBrief,
	isLayoutTransferReferenceExtra,
	isPhotographicReferenceBrief,
	isStyleOnlyReferenceExtra,
	type CarouselSlideReferenceBrief,
} from "@/lib/user-reference-brief";
import {
	applyTemplate,
	getTemplate,
	VIDEO_BGM_HINT,
	type MarketingTemplate,
	type TemplateId,
} from "@/lib/templates";
import {
	buildModelWearPresentationHint,
	buildSecondFrameSceneHint,
} from "@/lib/product-scene-hints";
import {
	carouselProductHeroLock,
	carouselSeriesConsistencyLock,
	carouselUniqueCopyHint,
} from "@/lib/fal-dual-reference-urls";
import {
	creativityMotionHint,
	type VideoCreativity,
} from "@/lib/video-creativity";
import type {
	StoryboardScenePlan,
	VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";
import { lookBibleSummaryLine } from "@/lib/shot-recipes";
import {
	REFERENCE_CONTENT_REPLACE_LINE,
	REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE,
	REFERENCE_ERASE_TEXT_LINE,
	REFERENCE_STYLE_MATCH_LINE,
	REFERENCE_TOPIC_GUARD_LINE,
} from "@/lib/reference-style-transfer";
import {
	applyArtStyleNegative,
	artStyleAvoidTail,
	artStyleConceptHeroHint,
	artStyleImageClause,
	artStyleMandatoryLead,
	artStylePhotorealConceptLock,
	artStylePlannerHint,
	artStyleSeedanceHint,
	artStyleStoryboardLead,
	DEFAULT_ART_STYLE,
	isIllustratedArtStyle,
	isLookGradeArtStyle,
	resolveArtStyleId,
	type ArtStyleId,
} from "@/lib/art-style";
import {
	prepareCompositionForImagePrompt,
	type CompositionPresetId,
} from "@/lib/composition-presets";

import {
	typographyHintForLocale,
	marketChineseScriptBlock,
	resolveCopyLocale,
	integratedTypographyPhrase,
	type CopyLocale,
} from "@/lib/copy-locale";
import {
	seedanceSafeStillPromptClause,
	conceptServiceStillSafetyClause,
	looksLikeSpaOrBeautyBrief,
	softenStoryboardStillPromptForModeration,
} from "@/lib/seedance-moderation";

export type VideoPromptOpts = {
	creativity?: VideoCreativity;
	dualFrame?: boolean;
	multiAngle?: boolean;
};

/** Visual / cultural style for the ad (AI prompts stay in English). */
export type PromptMarket = "hk" | "tw" | "cn" | "en";

/** What (if any) human body parts may appear. */
export type SubjectFraming =
	| "auto"
	| "product-only"
	| "hands-only"
	| "legs-feet"
	| "torso-no-face"
	| "no-people";

export const PROMPT_MARKETS: PromptMarket[] = ["hk", "tw", "cn", "en"];

/** Parse a market id from form/JSON; returns undefined when missing/invalid. */
export function asPromptMarket(value: unknown): PromptMarket | undefined {
	const v = String(value ?? "").trim();
	return (PROMPT_MARKETS as readonly string[]).includes(v)
		? (v as PromptMarket)
		: undefined;
}

/** Parse a market id with a fallback (default hk). */
export function parsePromptMarket(
	value: unknown,
	fallback: PromptMarket = "hk",
): PromptMarket {
	return asPromptMarket(value) ?? fallback;
}

export const SUBJECT_FRAMINGS: SubjectFraming[] = [
	"auto",
	"product-only",
	"hands-only",
	"legs-feet",
	"torso-no-face",
	"no-people",
];

export function subjectFramingPreviewSrc(id: SubjectFraming): string {
	return `/images/studio/framing/${id}.png?v=1`;
}

export type PromptVariables = {
	product: string;
	business?: string;
	offer?: string;
	headline?: string;
	subline?: string;
	market: PromptMarket;
	framing: SubjectFraming;
	extra?: string;
	artStyle?: ArtStyleId;
	imageTextMode?: ImageTextMode;
	compositionPreset?: CompositionPresetId;
};

const MARKET_HINTS: Record<PromptMarket, string> = {
	hk: "Hong Kong local boutique aesthetic, modern Asian urban lifestyle, premium but approachable. All on-image marketing copy in Traditional Chinese (繁體中文).",
	tw: "Taiwan lifestyle aesthetic, soft natural tones, friendly local brand feel. All on-image marketing copy in Traditional Chinese (繁體中文).",
	cn: "Mainland China RedNote/Douyin social creative — designed editorial feed post with atmosphere and props, not a blank catalog cutout. All on-image marketing copy in Simplified Chinese (简体中文) ONLY — never Traditional 繁體.",
	en: "International English-market commercial style, clean premium western retail look with intentional art direction. All on-image marketing copy in English only.",
};

const MARKET_HINTS_TEXTLESS: Record<PromptMarket, string> = {
	hk: "Hong Kong local boutique aesthetic, modern Asian urban lifestyle, premium but approachable. Atmosphere only — no writing.",
	tw: "Taiwan lifestyle aesthetic, soft natural tones, friendly local brand feel. Atmosphere only — no writing.",
	cn: "Mainland China RedNote/Douyin social creative — designed editorial atmosphere and props, not a blank catalog cutout. Atmosphere only — no writing.",
	en: "International English-market commercial style, clean premium western retail look with intentional art direction. Atmosphere only — no writing.",
};

const FRAMING_IMAGE: Record<SubjectFraming, string> = {
	auto: "",
	"product-only": "Product only as hero subject, no people in frame",
	"hands-only":
		"Only hands visible interacting with the product, cropped so face is never shown, elegant hand model",
	"legs-feet":
		"Only lower legs and feet visible, ideal for shoes or socks, cropped above the knee, no face or upper body",
	"torso-no-face":
		"Torso and arms may appear but face must be completely out of frame or obscured, no identifiable face",
	"no-people": "No people, no hands, no body parts — product and scene only",
};

const FRAMING_VIDEO: Record<SubjectFraming, string> = {
	auto: "",
	"product-only": "Animate product only, no people",
	"hands-only":
		"Subtle motion of hands holding the product, face never visible",
	"legs-feet":
		"Subtle motion on feet/legs wearing the product, no upper body or face",
	"torso-no-face": "Gentle motion on torso/hands, face never shown",
	"no-people": "Product-only motion, no human subjects",
};

export function subjectFramingVideoHint(framing: SubjectFraming): string {
	return FRAMING_VIDEO[framing] ?? "";
}

const FRAMING_NEGATIVE: Record<SubjectFraming, string> = {
	auto: "",
	"product-only": "person, human, face, hands, body, model portrait",
	"hands-only":
		"face, eyes, nose, mouth, full portrait, identifiable person, celebrity",
	"legs-feet": "face, upper body, torso, arms, portrait, head",
	"torso-no-face": "face, eyes, identifiable face, portrait, head close-up",
	"no-people": "person, human, face, hands, legs, body, model",
};

export function buildPromptVariables(input: {
	product: string;
	business?: string;
	offer?: string;
	headline?: string;
	subline?: string;
	market: PromptMarket;
	framing: SubjectFraming;
	extra?: string;
	artStyle?: ArtStyleId;
	imageTextMode?: ImageTextMode;
	compositionPreset?: CompositionPresetId;
}): PromptVariables {
	const product = input.product.trim();
	const sanitized = sanitizeOnImageCopy({
		product,
		subline: input.subline?.trim(),
		offer: input.offer?.trim(),
	});
	return {
		product,
		business: input.business?.trim(),
		offer: sanitized.offer,
		headline: input.headline?.trim(),
		subline: sanitized.subline,
		market: input.market,
		framing: input.framing,
		extra: input.extra?.trim(),
		artStyle: input.artStyle ?? DEFAULT_ART_STYLE,
		imageTextMode: input.imageTextMode,
		compositionPreset: input.compositionPreset,
	};
}

const PLANNER_META_SUBLINE = /^(?:\d+-slide\s+)?carousel:/i;
const STORYBOARD_STRUCTURE_SUBLINE =
	/開場亮點|行動呼籲|开场亮点|行动呼吁|中段展示|結尾呼籲|结尾呼吁/i;

export function isStoryboardStructureLabel(text: string | undefined): boolean {
	return Boolean(text?.trim() && STORYBOARD_STRUCTURE_SUBLINE.test(text));
}
const REFERENCE_TOPIC_COPY =
	/星座|留言你的|留言領取|你是.{0,4}座嗎|cover hook|product benefits|recap CTA/i;

/** Strip planner meta-text and reference-topic CTAs before they become on-image copy. */
export function sanitizeOnImageCopy(input: {
	product: string;
	subline?: string;
	offer?: string;
}): { subline?: string; offer?: string } {
	const product = input.product.trim();
	let subline = input.subline?.trim();
	let offer = input.offer?.trim();
	if (
		subline &&
		(PLANNER_META_SUBLINE.test(subline) ||
			STORYBOARD_STRUCTURE_SUBLINE.test(subline) ||
			/cover hook/i.test(subline) ||
			/All copy about/i.test(subline))
	) {
		subline = product ? `重點介紹${product}` : undefined;
	}
	if (
		offer &&
		(REFERENCE_TOPIC_COPY.test(offer) ||
			(/留言|評論/i.test(offer) && product && !offer.includes(product)))
	) {
		offer = product ? `了解${product}` : offer;
	}
	return { subline, offer };
}

function joinParts(...parts: (string | undefined)[]): string {
	return parts
		.filter((p): p is string => Boolean(p?.trim()))
		.join(". ")
		.replace(/\.\s*\./g, ".");
}

function brandPromptExtras(
	brandProfile?: BrandProfile | null,
	brandKit?: BrandKit | null,
): string {
	return joinParts(
		brandProfile?.businessName
			? joinParts(
					"Apply this brand DNA in art direction, palette, and typography tone.",
					brandProfilePromptBlock(brandProfile),
				)
			: "",
		brandKitHasPromptContent(brandKit)
			? brandKitPromptBlock(brandKit!)
			: "",
	);
}

/** Strong anchor so edit models keep the uploaded reference as the hero — not brand-template stock scenes. */
function imageReferenceAnchorBlock(vars: PromptVariables): string {
	const label = vars.product?.trim() || "the uploaded product";
	return joinParts(
		"CRITICAL — IMAGE 1 PIXELS ARE THE PRODUCT / HERO",
		`IMAGE 1 is the uploaded photo. Whatever is visibly IN THE PIXELS is the hero — not a stock item invented from the name "${label}".`,
		`"${label}" is a marketing CLAIM / caption only. If the name sounds like skincare, electronics, food, etc., IGNORE that category guess when IMAGE 1 shows something else.`,
		"The output MUST clearly show the same subject as IMAGE 1 (same person, same packaging, same shape, materials, color).",
		"Do NOT replace IMAGE 1 with an unrelated stock scene or a different product category (e.g. do NOT invent a serum bottle, gadget, or food prop that is not in IMAGE 1).",
		"If IMAGE 1 shows a person / lifestyle scene: keep that person (or the visible product they hold) as the hero. Restage them into the campaign setting — do not swap in a catalog product cutout.",
		"If IMAGE 1 is a graphic, poster, or app/UI screenshot: keep the same visual content and layout as the hero — polish lighting and integrate campaign copy; do not swap in unrelated products.",
		"If IMAGE 1 is a physical product photo: preserve the exact item — colors, materials, shape, packaging, label details.",
		"You MUST redesign the SETTING around IMAGE 1 — build surfaces, props, soft shadows, depth of field, and atmosphere. Do NOT keep a blank seamless white/cream studio backdrop from the upload.",
		"Never change the product / subject identity from IMAGE 1 — only the environment, lighting, and typography around it.",
	);
}

/** Carousel style-only: reference informs palette/typography/topic — each slide is a new layout (no IMAGE 1 edit). */
function imageStyleOnlyReferenceBlock(compositionHint?: string): string {
	return joinParts(
		"STYLE-ONLY REFERENCE — IMAGE 1 (when attached) is for visual style ONLY",
		"Match IMAGE 1 color palette, typography mood, lighting softness, and infographic/edu aesthetic.",
		"Design a COMPLETELY NEW layout for this slide — different composition, grid, and hero arrangement from IMAGE 1.",
		"Replace ALL on-image text with the user's campaign copy in this prompt — never copy Chinese characters from IMAGE 1.",
		"If IMAGE 1 is a photograph, keep photorealistic product/lifestyle photography — no cartoon icons, line-art badges, or illustrated UI chips unless IMAGE 1 clearly contains them.",
		thirdPartyBrandGuardBlock(),
		"Use the USER REFERENCE text block for extra palette/typography detail when present.",
		compositionHint
			? `Required layout for this slide: ${compositionHint}.`
			: "",
		"Do NOT duplicate the reference hero arrangement or paste the same graphic structure on every card.",
		"Avoid real celebrity likenesses — use original characters in similar thematic roles.",
	);
}

/**
 * Concept single still: borrow design grammar from IMAGE 1 without cloning its people/SKU/topic.
 * Stronger than carousel style-only (which deliberately varies layout every slide).
 */
function imageStyleOnlyConceptReferenceBlock(): string {
	return joinParts(
		"STYLE-ONLY REFERENCE — IMAGE 1 (when attached) is design grammar ONLY",
		"Borrow IMAGE 1 layout family: information density, callout/label structure, accent data chips, tip or insight footer band, typography hierarchy, and color palette.",
		"Rebuild the scene for the USER concept and on-image copy below — new subjects, props, and setting that fit the user's topic.",
		"Do NOT invent a generic cinematic collage poster (e.g. train + lightning + city skyline) if IMAGE 1 is an annotated infographic / edu layout.",
		"Replace ALL on-image text with the user copy in this prompt — never copy wording, celebrity names, logos, or mascots from IMAGE 1.",
		thirdPartyBrandGuardBlock(),
		"Avoid real celebrity likenesses from IMAGE 1 — use original characters in similar thematic roles only when the concept needs people.",
	);
}

export type ReferenceImageMode =
	| "none"
	| "clone"
	| "style-only"
	| "composition-remap";

function imageCompositionRemapReferenceBlock(
	dualProduct: boolean,
	keepHero: boolean,
): string {
	const hubLine = keepHero
		? "2) KEEP the central hub person from IMAGE 1 exactly (face, body, pose, outfit) — user's hero character from the reference. Do not swap them for a different person."
		: "2) One central hero figure in the SAME seat/pose zone as IMAGE 1's hub (new original person fitting the user topic — never keep a celebrity likeness unless the user opted to keep the hub hero).";
	const shellLock = joinParts(
		"BOARD TRACE (mandatory — match IMAGE 1 structure, do not redesign):",
		"1) Same overall poster grid and white/clean infographic ground as IMAGE 1.",
		hubLine,
		"3) Surrounding support people in the SAME spoke positions (~same count) with dashed/thin leader lines to role callout chips — REPLACE these people/roles for the user topic.",
		"4) Left stacked large metric/stat cards in the SAME column slots (new numbers + labels from user copy).",
		"5) Right icon + stat stack in the SAME column slots.",
		"6) Bottom tip/footer band: icon row and/or numbered insights 01/02/03 + brand/CTA zone — same bands, new wording.",
		"FORBIDDEN layouts unless IMAGE 1 already is that layout: outdoor product packshot, power bank/camping gear hero, phone UI collage, fork-in-the-road metaphor poster, empty lifestyle stock scene.",
	);
	if (dualProduct) {
		return joinParts(
			"COMPOSITION REMAP — IMAGE 1 = composition SHELL (board grammar). IMAGE 2 = USER PRODUCT PHOTO (mandatory identity).",
			shellLock,
			"PRODUCT PIXEL LOCK (IMAGE 2): Every product bottle/pack/SKU on the board MUST be IMAGE 2's exact photographed item — same silhouette, materials, colors, cap, label geometry.",
			"Place IMAGE 2 in hub prop slots (held by the hub hero and/or on the floor/table near them) at readable size — still a board, not a packshot takeover.",
			"FORBIDDEN: inventing a different bottle, dropper, serum jar, or packaging from the topic name (e.g. do not draw a generic amber Vit C dropper if IMAGE 2 is a black pump bottle).",
			"Topic/headline words are COPY ONLY — they must not redesign the product shape.",
			"REPLACE all IMAGE 1 logos, wordmarks, and readable text with the user's topic and campaign copy.",
			thirdPartyBrandGuardBlock(),
		);
	}
	return joinParts(
		"COMPOSITION REMAP — IMAGE 1 is the composition SHELL (the only layout source).",
		shellLock,
		keepHero
			? "REPLACE surrounding cast, props themes for spokes, numbers, and on-image lines with the user's concept and campaign copy — KEEP hub hero identity."
			: "REPLACE every person, role, prop theme, number, and on-image line with the user's concept and campaign copy below.",
		"Do NOT invent a generic lifestyle collage or a new layout family. Do NOT keep reference logos/wordmarks or reference wording.",
		thirdPartyBrandGuardBlock(),
	);
}

function referenceBlockForMode(
	mode: ReferenceImageMode,
	vars: PromptVariables,
	compositionHint?: string,
	opts?: { conceptSingle?: boolean },
): string {
	if (mode === "clone") return imageReferenceAnchorBlock(vars);
	if (mode === "composition-remap") {
		return imageCompositionRemapReferenceBlock(false, false);
	}
	if (mode === "style-only") {
		return opts?.conceptSingle
			? imageStyleOnlyConceptReferenceBlock()
			: imageStyleOnlyReferenceBlock(compositionHint);
	}
	return "";
}

export function buildImageEditPrompt(
	template: MarketingTemplate,
	vars: PromptVariables,
): string {
	const base = applyTemplate(template.imageEditPromptTemplate, vars);
	return joinParts(
		base,
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
	);
}

function userFacingAdCopyLines(vars: PromptVariables): string[] {
	const lines: string[] = [];
	if (vars.headline?.trim()) lines.push(vars.headline.trim());
	if (vars.subline?.trim()) lines.push(vars.subline.trim());
	if (vars.offer?.trim()) lines.push(vars.offer.trim());
	return lines;
}

function promoAdCopyLines(vars: PromptVariables): string[] {
	const lines: string[] = [];
	if (vars.headline?.trim()) lines.push(vars.headline.trim());
	else if (vars.product?.trim()) lines.push(vars.product.trim());
	if (vars.subline?.trim()) lines.push(vars.subline.trim());
	if (vars.offer?.trim()) lines.push(vars.offer.trim());
	if (vars.business?.trim()) lines.push(vars.business.trim());
	return lines;
}

function promoArtDirectionHint(vars: PromptVariables): string {
	const cues = joinParts(
		vars.product,
		vars.headline,
		vars.subline,
		vars.offer,
		vars.business,
		vars.extra,
	);
	if (cues) {
		return `Art direction: infer background, props, lighting, mood, and layout from the product and campaign brief — fit this specific item and message; do not default to a fixed template look (e.g. do not assume marble, testimonial collage, or studio box shot unless the brief implies it).`;
	}
	return `Art direction: infer a fitting ad style from the product in the photo — category-appropriate scene and mood, not a one-size-fits-all template.`;
}

function copyLocaleForVars(
	vars: PromptVariables,
	extraSamples: string[] = [],
): CopyLocale {
	return resolveCopyLocale(
		vars.market,
		vars.headline,
		vars.subline,
		vars.offer,
		vars.product,
		vars.business,
		...extraSamples,
	);
}

function promoTypographyHint(
	vars: PromptVariables,
	opts?: boolean | { layoutTransferDual?: boolean },
): string {
	const layoutTransferDual =
		typeof opts === "object" ? Boolean(opts.layoutTransferDual) : false;
	const copyFromReference = opts === true || layoutTransferDual;
	const lines = copyFromReference
		? userFacingAdCopyLines(vars)
		: promoAdCopyLines(vars);
	const locale = copyLocaleForVars(vars, lines);
	const langHint = typographyHintForLocale(locale, lines);
	const product = vars.product?.trim() || "the product";
	const refNote = layoutTransferDual
		? " Do NOT copy readable wording, Chinese character forms, jersey numbers, celebrity names, club names, or logos from IMAGE 2 (style reference) — paint only user campaign copy / product claim."
		: copyFromReference
			? " Do NOT copy readable wording or Chinese character forms from IMAGE 1 — write fresh on-image copy in the required script only."
			: "";
	const noInventedPricing =
		" Do NOT add price tags, currency amounts (e.g. HK$, ¥), discount percentages (e.g. 88折), or limited-time sale claims unless the brief explicitly includes an Offer line.";
	if (lines.length > 0) {
		const hasOffer = Boolean(vars.offer?.trim());
		const offerNote = hasOffer
			? " Use only the provided Offer text for any promotion badge — do not invent extra prices or discounts."
			: noInventedPricing;
		return `${langHint} Integrate these marketing lines into the poster as readable ad copy — bold main headline, supporting sublines${hasOffer ? ", optional offer badge" : ""}, optional brand footer.${offerNote}${refNote}`;
	}
	if (layoutTransferDual) {
		return `${langHint} User provided no separate headline — paint ONLY the product claim "${product}" (and brand if given) in IMAGE 2's typography zones. Leave other text zones empty rather than copying IMAGE 2's CR7/football/edu wording.${noInventedPricing}${refNote}`;
	}
	if (copyFromReference) {
		return `${langHint} User provided no on-image copy — keep text minimal: product hero only, matching IMAGE 1 layout and typography zones without inventing 攻略/edu headlines, bullet lists, or offer badges.${noInventedPricing}${refNote}`;
	}
	return `${langHint} Add short boutique ad headlines suited to ${product} — hook plus supporting line, woven into the layout.${noInventedPricing}${refNote}`;
}

function parseSellingPointBullets(subline?: string): string[] {
	if (!subline?.trim()) return [];
	return subline
		.split(/\n/)
		.map((line) => line.replace(/^[\s•\-–]+/, "").trim())
		.filter(Boolean)
		.slice(0, 4);
}

/**
 * IG info-poster technique (gptsavyy workflow):
 * category → selling points → simplified copy → single theme → category visuals → premium white → quality check.
 * Avoids generic overcrowded AI poster look.
 */
export function buildInfoPosterImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the product";
	const headline = vars.headline?.trim() || product;
	const bullets = parseSellingPointBullets(vars.subline);
	const bulletText = bullets.length
		? `Supporting bullets (max ${bullets.length}, keep short): ${bullets.join(" · ")}.`
		: "Add 2–3 very short supporting bullets derived from the product category.";
	const langHint =
		vars.market === "en"
			? "Use clean modern English typography with clear hierarchy."
			: vars.market === "cn"
				? "Use clean modern Simplified Chinese typography (简体中文) — spell every character accurately."
				: "Use clean modern Traditional Chinese typography (繁體中文) — spell every character accurately.";

	return joinParts(
		`Create a premium vertical INFO POSTER for ${product} — NOT a generic AI collage, NOT a dark moody ad.`,
		`WORKFLOW (follow in order):`,
		`1) Product category: infer from product name and IMAGE 1 (beauty/skincare, jewelry, food, fashion, wellness, etc.).`,
		`2) Selling points: use only the most relevant points for THIS single image — do not list everything.`,
		`3) Copy simplification: ONE main headline theme only; short bullets; generous whitespace — never cram all text into one block.`,
		`4) Single topic: this image covers one theme — "${headline}". Other points stay as small bullets only.`,
		bulletText,
		`5) Category visualization: styled scene with category-fitting props and texture (beauty = stone/linen + soft botanical; jewelry = velvet/pedestal + warm specular; food = fresh ingredient flat-lay) — NOT empty seamless white.`,
		`6) Premium editorial style: soft natural light, airy negative space, designed IG/XHS info-post energy — richer than a catalog cutout, cleaner than a crowded Canva flyer.`,
		`7) Quality check: avoid obvious AI poster tells — no overcrowded text, no Canva-style frames, no neon gradients, no watermark, no social UI, no blank product-only beauty shot.`,
		imageReferenceAnchorBlock(vars),
		`Remove outdated marketing text from IMAGE 1 only where new slide copy replaces it.`,
		`Layout: product hero ~35–45% of frame in a styled setting, headline prominent, 2–4 short support lines with airy hierarchy — professional IG info-post, not a plain bottle on white.`,
		langHint,
		vars.business ? `Brand footer: ${vars.business}.` : "",
		vars.offer ? `Optional offer badge: ${vars.offer}.` : "",
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"Single 9:16 marketing still.",
	);
}

/**
 * Designed commercial poster (XHS/IG feed): category-matched hero + bilingual type stack,
 * circular seal, brush category word — not a blank catalog cutout, not a white info flyer.
 * Works for F&B, beauty, electronics, fashion, services — NOT food-only.
 */
export function buildDesignedPosterImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the product";
	const headline = vars.headline?.trim() || "";
	const subline = vars.subline?.trim() || "";
	const offer = vars.offer?.trim() || "";

	return joinParts(
		`Create a vertical DESIGNED COMMERCIAL POSTER for ${product} — premium commercial photography with intentional set design matching THIS product category.`,
		`NOT a blank white catalog cutout. NOT a white IG info-flyer. NOT a crowded Canva collage.`,
		`CATEGORY LOCK (critical): Infer category from "${product}" and IMAGE 1 (electronics / beauty / F&B / fashion / jewelry / wellness / service…).`,
		`Set, props, palette, and optional brush category word MUST match that category. NEVER default to food, dessert, oranges, fruit, or serum/精華液 aesthetics unless the product truly is food or skincare.`,
		`Examples: power bank/electronics → desk/cable/tech surface, cool or graphite palette — NOT oranges, NOT 精華液.`,
		`Beauty serum → stone/linen + soft botanical. Dessert/F&B → appetite food set. Jewelry → velvet/pedestal.`,
		`POSTER GRAMMAR (fixed zones, not free collage):`,
		`1) Hero: keep exact product from IMAGE 1 when attached; fill lower-mid frame; soft key from upper-left; shallow DOF; real material texture (no plastic CGI).`,
		`2) Palette: derive from the product packaging / material / category mood — cohesive, not rainbow.`,
		headline
			? `3) ON-IMAGE TITLE (paint EXACTLY ONCE, verbatim — same letters/script the user typed): "${headline}". Do NOT replace this with the product name "${product}". Do NOT translate it. Do NOT invent an English ALL-CAPS pair or extra bilingual stack the user did not type.`
			: `3) No user title — a short title using only "${product}" is allowed.`,
		subline
			? `ON-IMAGE TAGLINE (paint EXACTLY ONCE, verbatim, smaller under the title): "${subline}". Do NOT invent a different slogan.`
			: `No user tagline — leave the support line empty. Do NOT invent a commercial slogan.`,
		`4) Chrome (SECONDARY — must not replace or crowd out user title/tagline): one small circular seal as a graphic (no new slogan; at most 1–2 characters taken from the user title if it is Chinese). Optional ONE small brush category word in a corner matching IMAGE 1 category — much smaller than the user title. Never paint a second headline.`,
		offer ? `Optional small offer badge (exact): "${offer}".` : "No offer line — do not invent prices, CTAs, or extra claims.",
		vars.business ? `Brand cue may appear in seal or footer: ${vars.business}.` : "",
		`5) Layout: generous negative space in type zones; hero and type must both read at phone size.`,
		`6) Quality: no watermark, no social UI, no misspelled characters, no neon gradients, no floating English meta labels (CTA/logo/brand).`,
		`FORBIDDEN: wrong-category set dressing (fruit/dessert behind electronics; spa serum look for a power bank; fake food when product is tech); invented slogans; product-name-as-title when a user title exists; extra English translations.`,
		imageReferenceAnchorBlock(vars),
		`Remove outdated marketing text from IMAGE 1 only where new poster copy replaces it.`,
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"Single 9:16 designed commercial poster still.",
	);
}

/** Exploded / parts-breakdown commercial poster — product identity + labeled components. */
export function buildPartsPosterImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the product";
	const headline = vars.headline?.trim() || product;
	const subline = vars.subline?.trim() || "";
	const offer = vars.offer?.trim() || "";
	const partLines = subline
		? subline
				.split(/\n|\|/)
				.map((s) => s.trim())
				.filter(Boolean)
		: [];
	const titleRule =
		vars.market === "en"
			? `Large clear English title with exact text: "${headline}".`
			: vars.market === "cn"
				? `Large Simplified Chinese title with exact characters from "${headline}" (optional short English under-title). Spell every Chinese character accurately.`
				: `Large Traditional Chinese title with exact characters from "${headline}" (optional short English under-title). Spell every Chinese character accurately.`;
	const partsCopy =
		partLines.length > 0
			? `Part callouts / descriptions (use these; one short label+line per component, exact when Chinese): ${partLines.map((l, i) => `${i + 1}) ${l}`).join(" · ")}. Stack floating parts in THIS numbered order from OUTSIDE → INSIDE (or top → bottom of the explosion) — do not reorder or invert layers.`
			: `Invent 4–7 short part callouts that match REAL components of "${product}" (material / function / feature) — each label under ~8 words; do not invent unrelated accessories. Stack them in real assembly order (outermost → innermost).`;

	return joinParts(
		`Create a vertical PARTS-BREAKDOWN / EXPLODED-VIEW COMMERCIAL POSTER for ${product}.`,
		`Technical product teardown aesthetic: the product is deconstructed into floating components arranged in a clear exploded diagram — NOT violent destruction, NOT fire/debris chaos, NOT a smashed product.`,
		`IDENTITY LOCK: Keep the exact product look from IMAGE 1 (shape, color, logo marks, materials). Components must clearly belong to THIS product.`,
		`ASSEMBLY ORDER (critical): Floating layers must follow REAL build order, outside → inside (or front → back). Example for a smartphone: 1) cover glass (outermost) → 2) display panel → 3) camera module / mid-frame hardware → 4) logic board → 5) battery → 6) wireless coil / shields → 7) back chassis (innermost / rear). NEVER put the OLED/display above the front cover glass. NEVER invent impossible stack order.`,
		`POSTER GRAMMAR:`,
		`1) Center: exploded assembly with soft vertical gaps; thin leader lines from each part to its callout; one callout per part (no duplicate labels).`,
		`2) Title zone (top): ${titleRule}`,
		partsCopy,
		offer ? `Optional small offer / claim badge (exact): ${offer}.` : "",
		vars.business ? `Brand cue may appear in footer or a small seal: ${vars.business}.` : "",
		`3) Background: clean studio gradient or soft paper/tech surface matched to category — generous negative space so labels read at phone size.`,
		`4) Lighting: soft upper-left key, crisp material texture, photoreal (no plastic toy CGI).`,
		`5) Quality: no watermark, no social UI, no misspelled characters, no neon cyberpunk clutter, no English meta labels like CTA/LOGO.`,
		`FORBIDDEN: intact-only hero with no parts; inverted or random layer order; random unrelated spare parts; food props on non-food; violent smash; overcrowded unreadable text; duplicate callouts for the same part.`,
		imageReferenceAnchorBlock(vars),
		`Remove outdated packaging marketing text from IMAGE 1 only where new poster copy replaces it.`,
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"Single 9:16 parts-breakdown commercial poster still.",
	);
}

/**
 * AAA gaming cover — Peace Elite–style cinematic poster with type baked into the 3D world.
 */
export function buildGamingCoverImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the hero";
	const headline = vars.headline?.trim() || product;
	const subline = vars.subline?.trim() || "";
	const offer = vars.offer?.trim() || "";
	const titleRule =
		vars.market === "en"
			? `Large clear English title with exact text: "${headline}".`
			: vars.market === "cn"
				? `Large Simplified Chinese and/or English title using exact characters from "${headline}". Spell every character accurately.`
				: `Large Traditional Chinese and/or English title using exact characters from "${headline}". Spell every character accurately.`;

	return joinParts(
		`Create a vertical AAA GAMING COVER POSTER for ${product} — photoreal cinematic game-key-art, not a flat Canva flyer.`,
		`Look DNA: low-angle action hero, dramatic outdoor or industrial set, typography BAKED INTO the 3D world (painted on crates, carved in rock, stamped on path), HUD/barcode/crosshair accents in corners.`,
		`IDENTITY LOCK: Keep exact product / character / mascot from IMAGE 1 when attached (shape, colors, materials, logos). Do not swap identity.`,
		`POSTER GRAMMAR:`,
		`1) Hero: dynamic pose (run / aim / leap) filling mid-frame; sharp materials; shallow DOF; cinematic daylight or golden rim.`,
		`2) Environment: readable world (hill path, container yard, rocky overlook…) that supports the product category — not a blank studio.`,
		`3) Title zone: ${titleRule}`,
		subline
			? `Support taglines / HUD microcopy (exact when Chinese): ${subline}.`
			: "Invent 2–4 short gaming taglines (strategy / precision / one winner) in small HUD type — keep under 6 words each.",
		`4) In-world type: at least one large word integrated into props/terrain (e.g. CHALLENGE / RUSH / DROP CLAIM) — must feel painted/embossed, not floating sticker.`,
		offer ? `Optional small offer / season badge (exact): ${offer}.` : "",
		vars.business ? `Brand name may appear in title block or footer: ${vars.business}.` : "",
		`5) Accents: subtle barcode, reticle, or corner HUD — never clutter the hero face/product.`,
		`FORBIDDEN: flat collage, neon cyberpunk city default, blank catalog cutout, social UI chrome, watermark, misspelled characters.`,
		imageReferenceAnchorBlock(vars),
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"Single 9:16 AAA gaming cover still.",
	);
}

/**
 * Sports editorial — huge layered word + athlete/action energy (SMASH / ACCELERATE / SPIKE).
 * Not a gaming cover: impact photography + typography-as-architecture, not quest HUD.
 */
export function buildSportsBigWordsImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the athlete";
	const headline = vars.headline?.trim() || "SMASH";
	const subline = vars.subline?.trim() || "";
	const offer = vars.offer?.trim() || "";
	const extra = (vars.extra ?? "").toLowerCase();
	const sportCue = `${product} ${headline} ${vars.extra ?? ""}`.toLowerCase();
	const accent =
		/\b(tennis|羽球|網球|网球)\b/.test(sportCue) || /\blime\b/.test(extra)
			? "electric lime / acid yellow type on deep court green or night sky"
			: /\b(basket|籃球|篮球|nba)\b/.test(sportCue)
				? "hot orange / amber type on black arena"
				: /\b(volley|排球)\b/.test(sportCue)
					? "cyan / white type on deep blue court"
					: /\b(soccer|football|足球)\b/.test(sportCue)
						? "stadium white + grass green accents on night floodlights"
						: /\b(swim|游泳|track|田徑|田径|sprint)\b/.test(sportCue)
							? "white / gold type on dark lane or pool blue"
							: "high-contrast electric lime OR hot orange type against deep stadium navy / black";
	const bigWord =
		headline.split(/\s+/).find((w) => /^[A-Za-z]{3,}$/.test(w))?.toUpperCase() ||
		headline
			.split(/[·|｜/\s]+/)
			.map((w) => w.trim())
			.find((w) => /^[A-Za-z]{3,}$/.test(w))
			?.toUpperCase() ||
		"SMASH";
	const titleRule =
		vars.market === "en"
			? `The architectural word must read exactly "${bigWord}" (from hook "${headline}").`
			: `Primary architectural word in bold English energy letters: "${bigWord}" (derived from "${headline}"). Chinese support lines from the copy must be exact when provided.`;

	return joinParts(
		`Create a vertical HIGH-IMPACT SPORTS BIG-WORDS EDITORIAL POSTER for ${product}.`,
		`Look DNA: ESPN / Nike match-point freeze-frame — NOT a cute character poster, NOT a gaming key-art cover.`,
		`CAMERA (mandatory): extreme worm's-eye or aggressive Dutch low-angle; lens almost on the turf/court looking UP so the subject and word tower over the viewer. Wide / fisheye sports feel OK.`,
		`MOTION AS LAYOUT: peak-impact freeze — spike, smash, leap, slide, or stomp. Dirt / chalk / sweat / water spray / turf chunks exploding from contact. Motion streaks and rim light. Subject limbs MUST cut through the giant letters (some letters behind body, some in front) for depth.`,
		`IDENTITY LOCK: Keep exact product / mascot / person from IMAGE 1 when attached (shape, colors, logos). Amplify athletic aggression and impact — never a soft standing smile pose. If no photo, invent a photoreal athlete or product-in-action matching "${product}".`,
		`POSTER GRAMMAR:`,
		`1) Hero: fills lower–mid frame in a violent peak-effort pose; sharp gear/spikes/hands; grit and spray visible; face (if any) intense, not kawaii idle.`,
		`2) BIG WORD AS ARCHITECTURE: one enormous stacked or diagonal sports word taller than the hero — letters span ~45–65% of frame height, thick condensed sans or italic athletic display. ${titleRule} Word is a stadium LED wall / painted court graphic, not a small caption and not a floating sticker.`,
		subline
			? `3) Sports HUD only (exact when Chinese): ${subline}. Keep tiny — score, clock, set count — never gaming quest / barcode / battery UI.`
			: "3) Sports HUD only: invent 2–3 micro lines (e.g. SET POINT · 15-40 · 00:03.21) plus optional LED scoreboard — never gaming reticle, barcode, daily-quest chrome, or battery icons.",
		offer ? `Optional small claim badge (exact): ${offer}.` : "",
		vars.business ? `Brand cue small in corner or footer: ${vars.business}.` : "",
		`4) Color / venue: ${accent}. Floodlights, lens flare, wet court or turf OK.`,
		`5) Hierarchy: first read = IMPACT + giant word; second = hero identity; third = tiny HUD. Phone-readable from arm's length.`,
		`FORBIDDEN: soft cute idle mascot pose, pastel kawaii sports, gaming cover DNA (quest text, barcode, crosshair, wooden CHALLENGE plank), tiny timid type, flat catalog cutout, Canva flyer, social UI, watermark, misspelled characters, word smaller than the hero.`,
		imageReferenceAnchorBlock(vars),
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"Single 9:16 high-impact sports big-words poster still.",
	);
}

/**
 * Jelly / glass 3D TYPE poster — uploaded product/mascot stays identity-locked;
 * the dramatic jelly material belongs on the words (same for product + concept).
 */
export function buildJelly3dImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the brand mark";
	const headline = vars.headline?.trim() || product;
	const subline = vars.subline?.trim() || "";
	const offer = vars.offer?.trim() || "";
	const jellyWordRule =
		vars.market === "en"
			? `Primary jelly word / short phrase must use exact text: "${headline}".`
			: `Primary jelly word / short phrase must use exact characters from "${headline}". Spell every character accurately.`;
	const jellySupport = subline
		? `Optional second jelly word or smaller jelly subline (exact): ${subline}.`
		: vars.business
			? `Optional small jelly brand word (exact): ${vars.business}.`
			: "Optional small jelly brand word matching the product/brand — still jelly/glass, not flat print.";

	return joinParts(
		`Create a vertical IG-DRAMATIC JELLY / GLASS 3D TYPE POSTER for ${product}.`,
		`Look DNA: premium Instagram still-life — clean light ground, soft colored contact shadows, high speculars. The STAR is JELLY/GLASS 3D TYPOGRAPHY. The uploaded product or mascot stays itself.`,
		`IDENTITY LOCK (critical): If IMAGE 1 is attached, keep the EXACT product / mascot / logo from the photo — same silhouette, materials, colors, face, logos. Do NOT rematerialize the subject into jelly/glass. Do NOT replace it with a different character. Photoreal / same CGI look as the upload.`,
		`If NO photo: place a clean photoreal product or brand mark for "${product}" (not a jelly remake of a random object), AND still make the headline the jelly hero.`,
		`POSTER GRAMMAR:`,
		`1) Subject: ${product} from IMAGE 1 (when attached) as a real hero object/mascot on a clean white/off-white or soft pastel ground — studio product lighting, not a lifestyle scene.`,
		`2) JELLY WORDS (mandatory hero type): thick rounded translucent jelly/glass 3D letters with internal color gradient (lime→emerald→sapphire or brand-matched), caustics, sharp specular highlights, soft colored ground shadow. ${jellyWordRule}`,
		jellySupport,
		`Letters should feel IG-dramatic: larger than flat captions, slight depth/tilt or gentle curve, readable at phone size — premium WPP jelly anniversary energy, not tiny footer text.`,
		offer ? `Optional tiny flat claim under the jelly type (exact): ${offer}.` : "",
		`3) Composition: subject + jelly words share the frame; generous negative space; no stadium, no athlete, no gaming HUD, no busy collage.`,
		`FORBIDDEN: turning the product/mascot into jelly; flat printed 2D title only; missing jelly type; neon cyberpunk city; dense icons; social UI chrome; watermark; misspelled characters; plastic matte cheap CGI type.`,
		imageReferenceAnchorBlock(vars),
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"Single 9:16 jelly-type poster still — real subject + jelly words.",
	);
}

import type { CampaignSlidePlan } from "@/lib/campaign-types";
import { getVisualStyle, type VisualStyleId } from "@/lib/visual-styles";
import type { SingleImagePlan } from "@/lib/single-image-plan";

export type ImagePromptMode =
	| "promo-ai"
	| "reference-concept"
	| "composition-remap"
	| "info-poster"
	| "designed-poster"
	| "parts-poster"
	| "gaming-cover"
	| "sports-big-words"
	| "jelly-3d"
	| "brand-fit"
	| "model-wear"
	| "ugc-presenter"
	| "service-promo"
	| "pricing-offer"
	| "website-launch"
	| "concept-cinematic"
	| "concept-social";

export type ImagePromptContext = {
	promotionMode?: PromotionMode;
	workflowMode?: WorkflowMode;
};

/** Scroll-stopping concept post for IG/FB — creative layout with integrated copy, not a white flyer. */
function conceptSocialPreferAvoid(
	direction: string | undefined,
	stylized: boolean,
	referenceImageMode: ReferenceImageMode = "none",
	copyLocale: CopyLocale = "zh-hant",
): { prefer: string; avoid: string } {
	const styleOnly =
		referenceImageMode === "style-only" ||
		isStyleOnlyReferenceExtra(direction);
	const typePhrase = integratedTypographyPhrase(copyLocale);
	if (styleOnly && direction && isPhotographicReferenceBrief(direction)) {
		return {
			avoid: "cartoon icons, flat line-art pictograms, illustrated UI chips, clipart badges, emoji stickers, 3D glossy icons, stock handshake, watermark",
			prefer: `Photorealistic lifestyle product photography like IMAGE 1 — soft natural light, low saturation, real crystal beads on linen/fabric, ${typePhrase}; new photo-led layout every slide.`,
		};
	}
	if (styleOnly && direction && isInfographicLikeBrief(direction)) {
		return {
			avoid: "generic cinematic collage poster that ignores the reference, stock train/lightning metaphor when the reference is an annotated infographic, celebrity likeness from IMAGE 1, reference logos/mascots, watermark",
			prefer:
				"Match IMAGE 1 / Creative direction: callout lines + role labels around a central hero, gold/accent data chips, dense edu-infographic hierarchy, tip/insight footer band, same palette family — rebuild for the user concept only.",
		};
	}
	if (styleOnly) {
		return {
			avoid: "unrelated cinematic collage that ignores IMAGE 1 layout, generic AI poster with no design grammar from the reference, celebrity likeness or logos from IMAGE 1, duplicated headline, watermark",
			prefer:
				"Match IMAGE 1 design grammar family (layout rhythm, palette, typography, info density, callouts/panels when present) — distinct subjects and copy for the user concept.",
		};
	}
	return {
		avoid: "white infographic template, edu-carousel flyer, Canva 3-block layout, stacked bullet list, stock handshake, generic AI poster collage, plain white seamless catalog backdrop, empty cream studio sweep, outer matte/letterbox frame, poster card floating on a blank canvas, repeating the same headline or CTA line multiple times, English UI chips labeled Image/Video/Copy/Copywriting",
		prefer: stylized
			? "consistent illustrated palette, layered scene with props, one strong visual metaphor, medium-appropriate lettering, full-bleed edge-to-edge"
			: "cinematic color grade, lifestyle set design with props and depth, HK/IG agency aesthetic, one strong visual metaphor, layered typography full-bleed — never a lone product on blank white, never a framed card on a larger empty background",
	};
}

export function buildConceptSocialImagePrompt(
	vars: PromptVariables,
	brandProfile?: BrandProfile | null,
	slideOpts?: {
		mainLine?: string;
		supportLine?: string;
		ctaLine?: string;
		referenceImageMode?: ReferenceImageMode;
		singleImagePlan?: SingleImagePlan | null;
		/** Carousel slide — stronger once-only copy + full-bleed rules. */
		carouselSlide?: boolean;
	},
): string {
	const plan = slideOpts?.singleImagePlan;
	const carousel = Boolean(slideOpts?.carouselSlide);
	const name = vars.business?.trim() || vars.product?.trim() || "the concept";
	const hook =
		plan?.title?.trim() ||
		slideOpts?.mainLine?.trim() ||
		vars.headline?.trim() ||
		name;
	const support =
		plan?.body?.trim() ||
		slideOpts?.supportLine?.trim() ||
		vars.subline?.trim();
	const cta =
		plan?.takeaway?.trim() ||
		slideOpts?.ctaLine?.trim() ||
		vars.offer?.trim();
	const direction = vars.extra?.trim();
	const composition = prepareCompositionForImagePrompt({
		artStyle: vars.artStyle,
		compositionPreset: vars.compositionPreset,
		extra: direction,
	});
	const directionSansComposition = composition.extraWithoutComposition;
	const locale = copyLocaleForVars(
		vars,
		[hook, support, cta].filter((s): s is string => Boolean(s?.trim())),
	);
	const langHint =
		locale === "en"
			? "Use bold editorial display typography — varied weights, knock-out or gradient-filled type, NOT plain system font on a white rectangle."
			: locale === "zh-hans"
				? "Use bold editorial display typography (简体中文) — stylized headline, gradient or overlay type, spell every character accurately. NOT plain system font on a white rectangle."
				: "Use bold editorial display typography (繁體中文) — stylized headline, gradient or overlay type, spell every character accurately. NOT plain system font on a white rectangle.";

	const illustrated = isIllustratedArtStyle(vars.artStyle);
	const refMode = slideOpts?.referenceImageMode ?? "none";
	const { prefer, avoid } = conceptSocialPreferAvoid(
		directionSansComposition,
		illustrated,
		refMode,
		locale,
	);
	const styleRefBlock =
		refMode === "style-only"
			? referenceBlockForMode("style-only", vars, undefined, {
					conceptSingle: !carousel,
				})
			: "";
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		composition.blocks?.camera ?? "",
		artStylePhotorealConceptLock(vars.artStyle),
		styleRefBlock,
		plan
			? joinParts(
					`SINGLE SOCIAL AD — role: ${plan.role}.`,
					plan.theme ? `Theme: ${plan.theme}.` : "",
					`Art direction (visual DNA): ${plan.visualDna}.`,
					`Layout: ${plan.composition}.`,
					carousel
						? `Create one full-bleed 9:16 carousel slide for ${name} — edge-to-edge art, not a card on a blank canvas.`
						: `Create a scroll-stopping vertical SOCIAL MEDIA POST for ${name}.`,
				)
			: carousel
				? `Create one full-bleed 9:16 carousel slide for ${name} — edge-to-edge Instagram/Facebook creative, not a framed card on a blank background.`
				: `Create a scroll-stopping vertical SOCIAL MEDIA POST for ${name} — Instagram/Facebook feed creative.`,
		directionSansComposition
			? `Creative direction: ${directionSansComposition}.`
			: "",
		illustrated || isLookGradeArtStyle(vars.artStyle)
			? artStylePlannerHint(vars.artStyle)
			: "",
		`Main hook line on image (paint EXACTLY ONCE): "${hook}".`,
		support
			? `Supporting line (smaller, paint EXACTLY ONCE in the same text stack): ${support}.`
			: "",
		cta && cta !== hook
			? `Closing action line on image (once only, not repeated): ${cta}.`
			: "",
		"COPY RULE: place all on-image copy in ONE upright text block (left OR right third). Letters must read left-to-right horizontally — never rotate type 90°, never vertical/sideways lettering, never stack one character per line.",
		"Do NOT paint the same headline twice. No top+bottom twin titles, no second masthead, no repeating the hook in a different color/weight.",
		"Do NOT render English meta/UI chips or labels such as Image, Video, Copy, Copywriting, Copywring, CTA, Logo, Brand, Watermark.",
		brandProfile?.businessName ? brandProfilePromptBlock(brandProfile) : "",
		FRAMING_IMAGE[vars.framing],
		composition.blocks?.hero ?? artStyleConceptHeroHint(vars.artStyle),
		illustrated
			? "TYPE: headline and copy drawn/rendered IN the same art medium — integrated illustration typography, not a plain text box on white."
			: "TYPE: one headline + optional support + optional CTA in a single scrim/overlay stack — editorial, not a white text box. Prefer a clean single-band layout over magazine dual mastheads.",
		"AVOID: " +
			(composition.blocks?.avoid
				? `${composition.blocks.avoid}, ${avoid}`
				: avoid) +
			".",
		"PREFER: " + prefer + ".",
		artStyleImageClause(vars.artStyle),
		langHint,
		`Do NOT invent prices, HK$, or discount % unless offer is in the brief.`,
		MARKET_HINTS[vars.market],
		marketChineseScriptBlock(vars.market),
		carouselSlideAvoidClause(
			vars.framing,
			vars.artStyle ?? DEFAULT_ART_STYLE,
		),
		artStyleAvoidTail(vars.artStyle),
		"full-bleed edge-to-edge slide matching the requested aspect ratio — no watermark, no platform UI chrome, no outer matte/letterbox, no corner badges or placeholder labels.",
	);
}

const CAROUSEL_ANTI_POSTER_NEGATIVE =
	"white infographic, edu slide, classroom poster, bullet list template, Canva layout, powerpoint slide, plain white background box, outer matte frame, letterbox border, poster card on blank canvas, duplicated headline text, twin masthead titles, top and bottom same headline, rotated text, sideways typography, vertical lettering, 90-degree rotated words, stacked single characters, English UI chips Image/Video/Copy/Copywriting, watermark";

export function buildCarouselImageNegativePrompt(
	framing: SubjectFraming,
	artStyle: ArtStyleId = DEFAULT_ART_STYLE,
): string {
	const framingNeg = FRAMING_NEGATIVE[framing];
	const base = framingNeg
		? `${CAROUSEL_ANTI_POSTER_NEGATIVE}, ${framingNeg}`
		: CAROUSEL_ANTI_POSTER_NEGATIVE;
	// Realistic: keep anti-cartoon terms. Stylized: applyArtStyleNegative may strip "cartoon".
	return applyArtStyleNegative(base, artStyle);
}

/** Append to Nano Banana prompt (no negative_prompt API param). */
export function carouselSlideAvoidClause(
	framing: SubjectFraming,
	artStyle: ArtStyleId = DEFAULT_ART_STYLE,
): string {
	return joinParts(
		artStyleAvoidTail(artStyle),
		`Avoid: ${buildCarouselImageNegativePrompt(framing, artStyle)}.`,
	);
}

/** One slide in a linked concept/campaign carousel — avoids repeating full brief on every slide. */
export function buildConceptSocialCarouselSlidePrompt(
	vars: PromptVariables,
	slide: { role: string; headline: string; subline?: string },
	plan: { theme: string; visualDna: string },
	slideIndex: number,
	totalSlides: number,
	brandProfile?: BrandProfile | null,
	referenceImageMode: ReferenceImageMode = "none",
): string {
	const mainLine = slide.headline?.trim() || vars.headline?.trim() || "";
	const supportLine = slide.subline?.trim() || "";
	const ctaLine =
		slide.role === "offer" || slide.role === "summary"
			? vars.offer?.trim() || (slide.role === "offer" ? mainLine : "")
			: "";
	const seriesBlock = joinParts(
		artStyleMandatoryLead(vars.artStyle),
		artStylePhotorealConceptLock(vars.artStyle),
		referenceBlockForMode(referenceImageMode, vars),
		`LINKED CAROUSEL (${totalSlides} slides — image ${slideIndex + 1}/${totalSlides}).`,
		plan.theme ? `Series theme: ${plan.theme}.` : "",
		`Slide role: ${slide.role}.`,
		`Shared art direction (same on every slide): ${plan.visualDna}.`,
		referenceImageMode === "style-only"
			? "Each slide MUST use a distinct composition — same color/typography family, never the same layout template."
			: referenceImageMode === "clone"
				? "Keep IMAGE 1 subject recognizable — vary layout role and copy only."
				: "Keep consistent color grade, typography energy, and character identity across the series — do not invent a new robot/mascot on later slides.",
		"Each slide must use a DIFFERENT composition — not the same white text box layout copied on every card.",
	);
	return joinParts(
		seriesBlock,
		buildConceptSocialImagePrompt(vars, brandProfile, {
			mainLine,
			supportLine:
				supportLine && supportLine !== mainLine ? supportLine : "",
			ctaLine: ctaLine && ctaLine !== mainLine ? ctaLine : "",
			referenceImageMode,
			carouselSlide: true,
		}),
	);
}

/** Teaching carousel slide — concept mode uses editorial carousel, not classroom edu cards. */
export function buildTeachingCarouselSlideImagePrompt(
	vars: PromptVariables,
	plan: { theme: string; visualDna: string },
	slide: {
		index: number;
		role: string;
		title: string;
		body: string;
		takeaway: string;
		composition: string;
	},
	totalSlides: number,
	mode: ImagePromptMode,
	brandProfile?: BrandProfile | null,
	referenceImageMode: ReferenceImageMode = "none",
	options?: {
		visualStyleId?: VisualStyleId;
		referenceConcept?: boolean;
		carouselSlideRef?: CarouselSlideReferenceBrief;
		brandKit?: BrandKit | null;
		brandLogoImageIndex?: number | null;
		/** When true, every slide must keep the uploaded product as hero (incl. tip slides). */
		hasProductPhoto?: boolean;
		productName?: string;
	},
): string {
	const brandKit = options?.brandKit;
	const brandLogoImageIndex = options?.brandLogoImageIndex ?? null;
	const withLogo = (prompt: string) =>
		brandLogoImageIndex != null
			? joinParts(
					prompt,
					brandKitLogoImagePromptBlock(brandLogoImageIndex),
				)
			: prompt;
	const productLock = options?.hasProductPhoto
		? carouselProductHeroLock({
				productName: options.productName ?? vars.product,
			})
		: "";
	const modelWear = mode === "model-wear";
	const seriesLock = carouselSeriesConsistencyLock(plan.visualDna, {
		modelWear,
	});
	const referenceConcept = Boolean(options?.referenceConcept);
	const slideVars: PromptVariables = {
		...vars,
		headline: slide.title || vars.headline,
		subline: slide.body || vars.subline,
	};
	const shopHint = options?.visualStyleId
		? getVisualStyle(options.visualStyleId).promptHint
		: "";
	const modelWearAvoid =
		"Avoid: product-only catalog cutout, empty table still life with no person, plain bottle hero with no hands/face, cute mascot/flask character replacing the model.";
	if (mode === "concept-social" && !referenceConcept) {
		return withLogo(
			joinParts(
				buildConceptSocialCarouselSlidePrompt(
					vars,
					{
						role: slide.role,
						headline: slide.title,
						subline: slide.body,
					},
					plan,
					slide.index - 1,
					totalSlides,
					brandProfile,
					referenceImageMode,
				),
				carouselUniqueCopyHint(slide),
				marketChineseScriptBlock(vars.market),
				typographyHintForLocale(
					copyLocaleForVars(vars, [
						slide.title,
						slide.body,
						slide.takeaway,
					]),
					[slide.title, slide.body, slide.takeaway],
				),
				brandPromptExtras(brandProfile, brandKit),
				seriesLock,
				productLock,
			),
		);
	}
	if (referenceConcept) {
		const ref = options?.carouselSlideRef;
		const isCoverSlide = slide.role === "cover" || slide.index <= 1;
		const refBlock = ref
			? joinParts(
					`Reference slide ${ref.index} layout (match this slide's staging): ${ref.composition || ref.layoutStyle}.`,
					ref.stagingPose ? `Staging: ${ref.stagingPose}.` : "",
					ref.mood ? `Mood/light: ${ref.mood}.` : "",
					ref.typographyStyle
						? `Typography: ${ref.typographyStyle}.`
						: "",
				)
			: "";
		const layoutTransferLine = ref
			? "LAYOUT TRANSFER: IMAGE 1 = user product hero; IMAGE 2 = style reference. Match this slide's mapped reference panel — swap in IMAGE 1 product and user brief copy only."
			: isCoverSlide
				? "LAYOUT TRANSFER COVER: IMAGE 1 = user product hero; IMAGE 2 = style reference. Replicate IMAGE 2 ad design grammar on this COVER — same grid/list/panel structure, component types, typography hierarchy, and staging pose type; swap in IMAGE 1 product and user brief copy only."
				: "LAYOUT TRANSFER TIP: IMAGE 1 = user product hero; IMAGE 2 = series look only (palette, lighting, typography, medium). Do NOT replicate IMAGE 2's exact pose, crop, or poster layout — that is COVER-only. New composition for this teaching card.";
		const seriesBlock = joinParts(
			artStyleMandatoryLead(slideVars.artStyle),
			`TEACHING CAROUSEL (${totalSlides} slides — slide ${slide.index}/${totalSlides}).`,
			`Theme: ${plan.theme}.`,
			`Shared visual DNA: ${plan.visualDna}.`,
			`Slide role: ${slide.role}.`,
			slide.composition ? `Layout note: ${slide.composition}.` : "",
			refBlock,
			seriesLock,
			layoutTransferLine,
			productLock,
		);
		return withLogo(
			joinParts(
				seriesBlock,
				buildReferenceConceptImagePrompt(slideVars, {
					shopStyleHint: shopHint,
					brandProfile,
					seriesSlideRole: isCoverSlide ? "cover" : "tip",
					mappedCarouselSlide: Boolean(ref),
				}),
				carouselSlideAvoidClause(
					slideVars.framing,
					slideVars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (modelWear) {
		return withLogo(
			joinParts(
				artStyleMandatoryLead(vars.artStyle),
				referenceBlockForMode(referenceImageMode, vars, slide.composition),
				`TEACHING CAROUSEL (${totalSlides} slides — slide ${slide.index}/${totalSlides}).`,
				`Theme: ${plan.theme}.`,
				`Shared visual DNA: ${plan.visualDna}.`,
				`Slide role: ${slide.role}.`,
				slide.composition ? `Layout: ${slide.composition}.` : "",
				"MODEL WEAR TEACHING: a real person must wear or use IMAGE 1 on this slide — vary pose/crop from other slides.",
				seriesLock,
				productLock,
				buildModelWearImagePrompt(slideVars),
				carouselUniqueCopyHint(slide),
				modelWearAvoid,
				marketChineseScriptBlock(vars.market),
				typographyHintForLocale(
					copyLocaleForVars(vars, [
						slide.title,
						slide.body,
						slide.takeaway,
					]),
					[slide.title, slide.body, slide.takeaway],
				),
				brandPromptExtras(brandProfile, brandKit),
				"full-bleed edge-to-edge — not a framed card on a blank canvas.",
			),
		);
	}
	const illustrated = isIllustratedArtStyle(vars.artStyle);
	const lookGrade = isLookGradeArtStyle(vars.artStyle);
	const slideLines = [
		slide.title,
		slide.body !== slide.title ? slide.body : "",
		slide.takeaway !== slide.title && slide.takeaway !== slide.body
			? slide.takeaway
			: "",
	].filter(Boolean) as string[];
	const locale = copyLocaleForVars(vars, slideLines);
	return withLogo(
		joinParts(
			artStyleMandatoryLead(vars.artStyle),
			referenceBlockForMode(referenceImageMode, vars, slide.composition),
			illustrated
				? `Create one ILLUSTRATED teaching carousel page (${slide.index}/${totalSlides}) — entire slide in the chosen art medium.`
				: `Create one page of a social carousel (${slide.index}/${totalSlides}).`,
			`Theme: ${plan.theme}.`,
			`Shared visual DNA: ${plan.visualDna}.`,
			`Slide role: ${slide.role}.`,
			`Headline on image (paint EXACTLY ONCE): ${slide.title}.`,
			slide.body && slide.body !== slide.title
				? `Supporting line (paint EXACTLY ONCE): ${slide.body}.`
				: "",
			slide.takeaway &&
				slide.takeaway !== slide.title &&
				slide.takeaway !== slide.body
				? `Closing line (once only): ${slide.takeaway}.`
				: "",
			"COPY RULE: one upright horizontal text block only — never duplicate headline/body; never rotate type 90° or stack letters vertically.",
			"No English meta/UI chips (Image, Video, Copy, Copywriting). No outer matte/letterbox frame.",
			slide.composition ? `Layout: ${slide.composition}.` : "",
			seriesLock,
			productLock,
			artStyleImageClause(vars.artStyle),
			FRAMING_IMAGE[vars.framing],
			MARKET_HINTS[vars.market],
			marketChineseScriptBlock(vars.market),
			illustrated
				? "Illustrated social carousel — typography and icons drawn in the same art medium, NOT photorealistic photography."
				: lookGrade
					? `Photoreal carousel with look grade — ${artStylePlannerHint(vars.artStyle)} NO cartoon icons, manga speed lines, webtoon clipart, or illustrated USB/battery pictograms.`
					: referenceImageMode === "style-only" &&
						  isPhotographicReferenceBrief(vars.extra)
						? `Photorealistic lifestyle product carousel — soft natural light, real product textures, ${integratedTypographyPhrase(locale)} — NO cartoon icons or flat line-art badges.`
						: "Editorial social carousel — integrated typography, not a plain white edu poster.",
			typographyHintForLocale(locale, slideLines),
			carouselSlideAvoidClause(
				vars.framing,
				vars.artStyle ?? DEFAULT_ART_STYLE,
			),
			referenceImageMode === "style-only" ? vars.extra : undefined,
			brandPromptExtras(brandProfile, brandKit),
			"full-bleed edge-to-edge — not a framed card on a blank canvas.",
		),
	);
}

/** Cinematic concept keyframe — scene only, no poster typography (for Seedance). */
export function buildConceptCinematicImagePrompt(
	vars: PromptVariables,
): string {
	const scene = softenStoryboardStillPromptForModeration(
		vars.extra?.trim() ||
			joinParts(vars.headline, vars.subline) ||
			vars.product?.trim() ||
			"cinematic social reel hook scene",
	);
	return joinParts(
		artStyleImageClause(vars.artStyle),
		"Cinematic FILM STILL for a vertical social reel — like a movie frame, NOT a marketing poster.",
		`Scene to render: ${scene}.`,
		"Rich atmosphere, dramatic or motivated lighting, real or stylized environment matching the concept.",
		"NO white infographic background, NO headline text block at top, NO bullet list layout, NO Canva-style ad template, NO flyer composition.",
		"NO on-screen text, NO logos, NO watermarks, NO typography overlays — copy is added later in video post-production.",
		"Original characters only, no celebrity likenesses.",
		"Prefer mid-shots of rooms, hands, products, towels, and silhouettes — never photoreal face fill-frame, never client lying on a bed with facial mask / serum-on-skin (fal content filters).",
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		"Single 9:16 vertical cinematic still.",
	);
}

/** UGC talking-head keyframe — presenter + product for HeyGen Avatar IV lip-sync. */
export function buildUgcPresenterImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the product";
	const theme = joinParts(vars.headline, vars.subline, vars.offer);
	return joinParts(
		imageReferenceAnchorBlock(vars),
		`Create a photorealistic vertical UGC talking-head product ad for ${product}, 9:16.`,
		`Friendly young presenter in a bright cozy home office — waist-up framing, face clearly visible, looking at camera.`,
		buildModelWearPresentationHint(product, vars.framing),
		`Keep the exact product from IMAGE 1 on wrist or in hand — same beads, colors, materials.`,
		theme
			? `Ad theme to reflect in mood (no on-screen text): ${theme}.`
			: "",
		"Natural skin, realistic hands, soft window light, desk and plant in background, shallow depth of field.",
		"Presenter ready to speak to camera — mid-gesture showing the product.",
		MARKET_HINTS[vars.market],
		vars.extra,
		"No watermark, no subtitles, no social UI chrome.",
	);
}

/** Lifestyle model wearing / using the product — photorealistic ad still from product photo. */
export function buildModelWearImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the product";
	const theme = joinParts(vars.headline, vars.subline, vars.offer);
	const illustrated = isIllustratedArtStyle(vars.artStyle);
	// Model-wear path must not collapse to product-only when framing was left on catalog defaults.
	const framing =
		vars.framing === "product-only" || vars.framing === "no-people"
			? "auto"
			: vars.framing;
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		imageReferenceAnchorBlock(vars),
		"MANDATORY: this is a MODEL WEAR/USE ad — a real person must appear using or holding the product. Not a product-only catalog shot.",
		illustrated
			? `Create a vertical LIFESTYLE ADVERTISEMENT illustration for ${product}.`
			: `Create a photorealistic vertical LIFESTYLE ADVERTISEMENT for ${product}.`,
		buildModelWearPresentationHint(product, framing),
		`Keep the exact product from IMAGE 1 — same item, colors, materials, charm details. Do NOT replace with a different product.`,
		vars.business ? `Brand mood: ${vars.business}.` : "",
		theme
			? `Ad copy theme (integrate as subtle vertical sidebar typography if appropriate): ${theme}.`
			: promoTypographyHint(vars),
		artStyleImageClause(vars.artStyle),
		illustrated
			? "Stylized character design consistent with the chosen art direction."
			: "Natural skin and materials where people appear — NOT plastic AI skin.",
		`Do NOT invent prices, HK$, or discount % unless offer is in the brief.`,
		MARKET_HINTS[vars.market],
		marketChineseScriptBlock(vars.market),
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		"9:16 vertical, no watermark, no social UI chrome.",
	);
}

/** Brand-fit: ad styled to match analyzed website/social brand DNA. */
export function buildBrandFitImagePrompt(
	vars: PromptVariables,
	profile: BrandProfile,
): string {
	const product =
		vars.product?.trim() || profile.productCategory || "the product";
	const theme = joinParts(vars.headline, vars.subline, vars.offer);
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		imageReferenceAnchorBlock(vars),
		`Create a vertical social ad for ${product} — IMAGE 1 stays the hero; brand DNA below styles colors, typography, and mood only.`,
		brandProfilePromptBlock(profile),
		vars.business ? `Shop name on ad: ${vars.business}.` : "",
		theme ? `Campaign copy for this ad: ${theme}.` : "",
		`Match brand palette and typography energy from the DNA — but do NOT substitute IMAGE 1 with generic category stock shots (e.g. crystals, marble, flat lays) unless IMAGE 1 already shows them.`,
		artStyleImageClause(vars.artStyle),
		promoTypographyHint(vars),
		`Do NOT look like a one-size-fits-all AI poster. Do NOT ignore IMAGE 1.`,
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		"Single 9:16 marketing still.",
	);
}

export function buildServicePromoImagePrompt(vars: PromptVariables): string {
	const name = vars.business?.trim() || vars.product?.trim() || "the service";
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		`Create a premium vertical social ad promoting a SERVICE for ${name}.`,
		vars.headline ? `Main headline: ${vars.headline}.` : "",
		vars.subline ? `Supporting points: ${vars.subline}.` : "",
		vars.offer ? `Offer / CTA: ${vars.offer}.` : "",
		"Professional trustworthy design — consulting, coaching, course, membership, wellness, B2C service.",
		"Typography-led layout with intentional hierarchy — NOT a physical product packshot or warehouse scene.",
		artStyleImageClause(vars.artStyle),
		promoTypographyHint(vars),
		`Do NOT invent prices, HK$, or discount % unless offer is in the brief.`,
		MARKET_HINTS[vars.market],
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		"Vertical social feed ad, sharp focus, no watermark, no social UI chrome.",
	);
}

export function buildPricingOfferImagePrompt(vars: PromptVariables): string {
	const name = vars.business?.trim() || vars.product?.trim() || "the brand";
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		`Create a vertical pricing / limited-offer promo graphic for ${name}.`,
		vars.headline ? `Offer theme: ${vars.headline}.` : "",
		vars.subline ? `Benefit bullets: ${vars.subline}.` : "",
		vars.offer ? `CTA / offer line: ${vars.offer}.` : "",
		"Clean pricing-card or promo-banner layout with clear CTA button area — IG/FB feed friendly.",
		"Premium but approachable SMB aesthetic. Generous whitespace, readable type.",
		artStyleImageClause(vars.artStyle),
		`Do NOT invent specific prices, HK$, or discount % unless the user offer field includes them.`,
		MARKET_HINTS[vars.market],
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		"Vertical marketing still, no watermark, no platform UI overlay.",
	);
}

export function buildWebsiteLaunchImagePrompt(vars: PromptVariables): string {
	const name = vars.business?.trim() || vars.product?.trim() || "the brand";
	const illustrated = isIllustratedArtStyle(vars.artStyle);
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		`Create a vertical website or app LAUNCH promo for ${name}.`,
		vars.headline ? `Launch hook: ${vars.headline}.` : "",
		vars.subline ? `Supporting copy: ${vars.subline}.` : "",
		illustrated
			? "Device or app UI shown as illustrated/stylized mockup — NOT photorealistic product photography."
			: "Modern device frame or browser mockup mood — polished tech/SMB marketing, soft gradient background.",
		"Focus on driving visits or sign-ups — not a product unboxing photo. No corner badges, seals, or placeholder labels.",
		artStyleImageClause(vars.artStyle),
		promoTypographyHint(vars),
		MARKET_HINTS[vars.market],
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		"Vertical launch ad, no Instagram/FB UI chrome, no watermark.",
	);
}

export function buildWizardImagePrompt(
	vars: PromptVariables,
	mode: ImagePromptMode,
	brandProfile?: BrandProfile | null,
	visualStyleId?: VisualStyleId,
	brandKit?: BrandKit | null,
	promptOptions?: {
		structuredReferenceBrief?: boolean;
		aspectRatio?: string;
		brandLogoImageIndex?: number | null;
		singleImagePlan?: SingleImagePlan | null;
		/** When false, skip IMAGE 1 mandatory blocks (concept / text-only). Default true for product promo. */
		hasReferenceImage?: boolean;
		/** style-only = palette/mood from IMAGE 1, not product lock. */
		referenceImageMode?: ReferenceImageMode;
		/** Composition remap with product photo as IMAGE 1 + ref shell as IMAGE 2. */
		compositionRemapDual?: boolean;
		/** Keep hub / main character from the composition reference. */
		compositionRemapKeepHero?: boolean;
	},
): string {
	const brandLogoImageIndex = promptOptions?.brandLogoImageIndex ?? null;
	const plan = promptOptions?.singleImagePlan ?? null;
	const hasReferenceImage = promptOptions?.hasReferenceImage !== false;
	const referenceImageMode =
		promptOptions?.referenceImageMode ??
		(hasReferenceImage ? "clone" : "none");
	const withLogo = (prompt: string) =>
		brandLogoImageIndex != null
			? joinParts(
					prompt,
					brandKitLogoImagePromptBlock(brandLogoImageIndex),
				)
			: prompt;

	if (mode === "reference-concept") {
		const shopHint = visualStyleId
			? getVisualStyle(visualStyleId).promptHint
			: "";
		return withLogo(
			joinParts(
				buildReferenceConceptImagePrompt(vars, {
					shopStyleHint: shopHint,
					brandProfile,
					structuredReferenceBrief:
						promptOptions?.structuredReferenceBrief,
					aspectRatio: promptOptions?.aspectRatio,
				}),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "composition-remap") {
		return withLogo(
			joinParts(
				buildCompositionRemapImagePrompt(vars, {
					aspectRatio: promptOptions?.aspectRatio,
					dualProduct: Boolean(promptOptions?.compositionRemapDual),
					keepHero: Boolean(promptOptions?.compositionRemapKeepHero),
				}),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "info-poster") {
		return withLogo(
			joinParts(
				buildInfoPosterImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "designed-poster") {
		return withLogo(
			joinParts(
				buildDesignedPosterImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "parts-poster") {
		return withLogo(
			joinParts(
				buildPartsPosterImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "gaming-cover") {
		return withLogo(
			joinParts(
				buildGamingCoverImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "sports-big-words") {
		return withLogo(
			joinParts(
				buildSportsBigWordsImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "jelly-3d") {
		return withLogo(
			joinParts(
				buildJelly3dImagePrompt(vars),
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "model-wear") {
		return withLogo(
			joinParts(
				buildModelWearImagePrompt(vars),
				// Keep model-wear free of poster/catalog anti-rules that can push product-only stills.
				artStyleAvoidTail(vars.artStyle ?? DEFAULT_ART_STYLE),
				"Avoid: product-only catalog cutout, empty table still life with no person, plain bottle hero with no hands/face.",
			),
		);
	}
	if (mode === "ugc-presenter")
		return withLogo(buildUgcPresenterImagePrompt(vars));
	if (mode === "service-promo") {
		return withLogo(
			joinParts(
				buildServicePromoImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "pricing-offer") {
		return withLogo(
			joinParts(
				buildPricingOfferImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "website-launch") {
		return withLogo(
			joinParts(
				buildWebsiteLaunchImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "concept-cinematic") {
		return withLogo(
			joinParts(
				buildConceptCinematicImagePrompt(vars),
				plan ? singlePlanBlock(plan) : "",
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	if (mode === "concept-social") {
		return withLogo(
			joinParts(
				buildConceptSocialImagePrompt(vars, brandProfile, {
					singleImagePlan: plan,
					referenceImageMode,
				}),
				brandPromptExtras(null, brandKit),
			),
		);
	}
	if (mode === "brand-fit" && brandProfile?.businessName) {
		return withLogo(
			joinParts(
				buildBrandFitImagePrompt(vars, brandProfile),
				plan ? singlePlanBlock(plan) : "",
				brandPromptExtras(null, brandKit),
				carouselSlideAvoidClause(
					vars.framing,
					vars.artStyle ?? DEFAULT_ART_STYLE,
				),
			),
		);
	}
	// brand-fit without analyze yet: still keep concept editorial layout, not product promo.
	if (mode === "brand-fit") {
		return withLogo(
			joinParts(
				buildConceptSocialImagePrompt(vars, brandProfile, {
					singleImagePlan: plan,
					referenceImageMode,
				}),
				"BRAND-FIT LAYOUT: unified brand palette and typography mood — analyze website/social when available; do not invent a random product packshot.",
				brandPromptExtras(null, brandKit),
			),
		);
	}
	const styleHint =
		visualStyleId && getVisualStyle(visualStyleId).promptHint
			? `Visual style direction: ${getVisualStyle(visualStyleId).promptHint}`
			: "";
	return withLogo(
		joinParts(
			buildPromoImagePrompt(vars, brandProfile, brandKit, plan, {
				hasReferenceImage,
				referenceImageMode,
			}),
			styleHint,
		),
	);
}

function singlePlanBlock(plan: SingleImagePlan): string {
	return joinParts(
		`SINGLE SOCIAL AD — role: ${plan.role}.`,
		plan.theme ? `Theme: ${plan.theme}.` : "",
		`Art direction (visual DNA): ${plan.visualDna}.`,
		`Layout: ${plan.composition}.`,
		plan.title
			? `Main hook on image (verbatim, paint EXACTLY ONCE — do not substitute the product name): "${plan.title}".`
			: "",
		plan.body
			? `Supporting line (verbatim, paint EXACTLY ONCE): ${plan.body}.`
			: "",
		plan.takeaway ? `Closing line (verbatim): ${plan.takeaway}.` : "",
		"Do NOT invent extra on-image slogans beyond title / supporting / closing above. Do NOT paint the English word LOGO, or any fake brand-mark circle/placeholder seal. Skip logo marks unless a real brand logo image is provided. Do NOT invent 立即選購 / Shop Now unless that exact CTA is in the campaign copy above.",
	);
}

function shouldUseConceptSocialPrompt(
	visualStyleId: string,
	context?: ImagePromptContext,
): boolean {
	if (context?.promotionMode !== "concept") return false;
	if (visualStyleId === "concept-cinematic") return false;
	// Social creative layout is for image-only posts — video keyframes use cinematic or style-specific prompts.
	if (context?.workflowMode !== "image-only") return false;
	// Keep specialized 創作方向 layouts distinct (info / brand / pricing / website).
	// Without this gate, every concept image path collapsed to concept-social.
	if (
		visualStyleId === "info-poster" ||
		visualStyleId === "designed-poster" ||
		visualStyleId === "parts-poster" ||
		visualStyleId === "gaming-cover" ||
		visualStyleId === "sports-big-words" ||
		visualStyleId === "jelly-3d" ||
		visualStyleId === "brand-fit" ||
		visualStyleId === "brand-campaign" ||
		visualStyleId === "pricing-offer" ||
		visualStyleId === "website-launch" ||
		visualStyleId === "service-promo"
	) {
		return false;
	}
	return true;
}

/** Concept video/storyboard must never fall through to product promo (IMAGE 1 mandatory). */
function shouldUseConceptCinematicPrompt(
	visualStyleId: string,
	context?: ImagePromptContext,
): boolean {
	if (context?.promotionMode !== "concept") return false;
	if (visualStyleId === "concept-cinematic") return true;
	if (visualStyleId === "storyboard-video") return true;
	// Combined / video-only concept workflows: cinematic stills, not product-edit promos.
	if (
		context?.workflowMode === "combined" ||
		context?.workflowMode === "video-only"
	) {
		return true;
	}
	return false;
}

export function resolveImagePromptMode(
	visualStyleId: string,
	creativeMode: string,
	context?: ImagePromptContext,
): ImagePromptMode {
	// Designed / parts / poster recipes never borrow reference layout — keep their recipes.
	if (visualStyleId === "designed-poster") return "designed-poster";
	if (visualStyleId === "parts-poster") return "parts-poster";
	if (visualStyleId === "gaming-cover") return "gaming-cover";
	if (visualStyleId === "sports-big-words") return "sports-big-words";
	if (visualStyleId === "jelly-3d") return "jelly-3d";
	if (creativeMode === "reference-concept") return "reference-concept";
	if (shouldUseConceptCinematicPrompt(visualStyleId, context))
		return "concept-cinematic";
	if (visualStyleId === "concept-cinematic") return "concept-cinematic";
	if (shouldUseConceptSocialPrompt(visualStyleId, context))
		return "concept-social";
	if (visualStyleId === "info-poster") return "info-poster";
	if (visualStyleId === "model-wear") return "model-wear";
	if (visualStyleId === "ugc-presenter") return "ugc-presenter";
	if (visualStyleId === "service-promo") return "service-promo";
	if (visualStyleId === "pricing-offer") return "pricing-offer";
	if (visualStyleId === "website-launch") return "website-launch";
	if (visualStyleId === "brand-fit" || visualStyleId === "brand-campaign")
		return "brand-fit";
	return "promo-ai";
}

/** One slide in a linked campaign — shared DNA, per-slide headline/composition. */
export function buildCampaignSlideImagePrompt(
	vars: PromptVariables,
	slide: CampaignSlidePlan,
	plan: { theme: string; visualDna: string },
	mode: ImagePromptMode,
	brandProfile: BrandProfile | null | undefined,
	slideIndex: number,
	totalSlides: number,
	hasReferenceImage = true,
	options?: {
		visualStyleId?: VisualStyleId;
		referenceConcept?: boolean;
		referenceImageMode?: ReferenceImageMode;
		carouselSlideRef?: CarouselSlideReferenceBrief;
		brandKit?: BrandKit | null;
		brandLogoImageIndex?: number | null;
		hasProductPhoto?: boolean;
		productName?: string;
	},
): string {
	const brandKit = options?.brandKit;
	const brandLogoImageIndex = options?.brandLogoImageIndex ?? null;
	const referenceImageMode =
		options?.referenceImageMode ?? (hasReferenceImage ? "clone" : "none");
	const referenceConcept = Boolean(
		options?.referenceConcept && referenceImageMode === "clone",
	);
	const productLock = options?.hasProductPhoto
		? carouselProductHeroLock({
				productName: options.productName ?? vars.product,
			})
		: "";
	const modelWear = mode === "model-wear";
	const seriesLock = carouselSeriesConsistencyLock(plan.visualDna, {
		modelWear,
	});
	const slideVars: PromptVariables = {
		...vars,
		headline: slide.headline || vars.headline,
		subline: slide.subline || vars.subline,
	};
	const shopHint = options?.visualStyleId
		? getVisualStyle(options.visualStyleId).promptHint
		: "";
	const carouselRef = options?.carouselSlideRef;
	const carouselRefBlock = carouselRef
		? joinParts(
				`Reference frame ${carouselRef.index} layout (match this slide's staging): ${carouselRef.composition || carouselRef.layoutStyle}.`,
				carouselRef.stagingPose ? `Staging: ${carouselRef.stagingPose}.` : "",
				carouselRef.mood ? `Mood/light: ${carouselRef.mood}.` : "",
				carouselRef.typographyStyle
					? `Typography: ${carouselRef.typographyStyle}.`
					: "",
			)
		: "";
	const styleLedLayout =
		referenceImageMode === "style-only" || Boolean(carouselRef);
	const layoutNote = slide.composition
		? styleLedLayout
			? `Layout: ${slide.composition}. Keep IMAGE 1 product clearly visible as the hero — use a designed social-card structure (title band, bullets/proof, CTA area) around the product; do NOT only swap text on the same centered bottle crop.`
			: `Layout note (secondary to IMAGE 1): ${slide.composition}.`
		: "";
	const campaignBlock = joinParts(
		artStyleMandatoryLead(slideVars.artStyle),
		!referenceConcept
			? referenceBlockForMode(
					referenceImageMode,
					slideVars,
					slide.composition,
				)
			: "",
		`LINKED CAMPAIGN (${totalSlides} posts — image ${slideIndex + 1}/${totalSlides}).`,
		plan.theme ? `Campaign theme: ${plan.theme}.` : "",
		`This slide: ${slide.title} [${slide.role}].`,
		layoutNote,
		carouselRefBlock,
		`Shared series styling (colors, typography, mood — same on every slide): ${plan.visualDna}.`,
		seriesLock,
		referenceConcept
			? "Keep IMAGE 2 ad design language on every slide — vary headline, layout role, and slide copy only; IMAGE 1 product must appear on every slide."
			: referenceImageMode === "style-only"
				? "Match IMAGE 1 palette, typography mood, and infographic/edu aesthetic on every slide — distinct layout role and copy per slide; product stays visible; never copy reference on-image text."
				: referenceImageMode === "clone"
					? "Each slide varies headline/message and layout role only — IMAGE 1 subject must stay recognizable on every slide."
					: "Each slide varies headline/message and layout role only — keep one consistent campaign art direction across all slides.",
		slide.role === "offer" && !vars.offer?.trim()
			? "Offer slide: CTA / shop-now mood only — do NOT invent prices, HK$, discount %, or fake promotions."
			: "",
		modelWear
			? "MODEL WEAR CAMPAIGN: every slide must include a real person wearing or using IMAGE 1 — distinct pose/crop per slide."
			: "",
		productLock,
	);
	const modelWearAvoid =
		"Avoid: product-only catalog cutout, empty table still life with no person, plain bottle hero with no hands/face, cute mascot/flask character replacing the model.";
	const base = referenceConcept
		? buildReferenceConceptImagePrompt(slideVars, {
				shopStyleHint: shopHint,
				brandProfile,
			})
		: modelWear
			? joinParts(buildModelWearImagePrompt(slideVars), modelWearAvoid)
			: mode === "concept-social"
				? buildConceptSocialCarouselSlidePrompt(
						slideVars,
						{
							role: slide.role,
							headline: slide.headline,
							subline: slide.subline,
						},
						plan,
						slideIndex,
						totalSlides,
						brandProfile,
						referenceImageMode,
					)
				: mode === "brand-fit" && brandProfile?.businessName
					? buildBrandFitImagePrompt(slideVars, brandProfile)
					: mode === "brand-fit"
						? joinParts(
								buildConceptSocialCarouselSlidePrompt(
									slideVars,
									{
										role: slide.role,
										headline: slide.headline,
										subline: slide.subline,
									},
									plan,
									slideIndex,
									totalSlides,
									brandProfile,
									referenceImageMode,
								),
								"BRAND-FIT LAYOUT: unified brand palette and typography mood — analyze website/social when available.",
							)
						: mode === "info-poster"
							? buildInfoPosterImagePrompt(slideVars)
							: mode === "designed-poster"
								? buildDesignedPosterImagePrompt(slideVars)
								: mode === "parts-poster"
									? buildPartsPosterImagePrompt(slideVars)
								: mode === "gaming-cover"
									? buildGamingCoverImagePrompt(slideVars)
								: mode === "sports-big-words"
									? buildSportsBigWordsImagePrompt(slideVars)
								: mode === "jelly-3d"
									? buildJelly3dImagePrompt(slideVars)
								: mode === "service-promo"
								? buildServicePromoImagePrompt(slideVars)
								: mode === "pricing-offer"
									? buildPricingOfferImagePrompt(slideVars)
									: mode === "website-launch"
										? buildWebsiteLaunchImagePrompt(slideVars)
										: buildPromoImagePrompt(
												slideVars,
												brandProfile,
												brandKit,
											);
	const withBrand =
		brandKitHasPromptContent(brandKit) &&
		mode === "concept-social" &&
		!referenceConcept
			? joinParts(base, brandKitPromptBlock(brandKit!))
			: base;
	const withLogo =
		brandLogoImageIndex != null
			? joinParts(
					withBrand,
					brandKitLogoImagePromptBlock(brandLogoImageIndex),
				)
			: withBrand;
	return mode === "concept-social" && !referenceConcept
		? joinParts(withLogo, seriesLock, productLock)
		: modelWear
			? joinParts(campaignBlock, withLogo)
			: joinParts(
					campaignBlock,
					withLogo,
					carouselSlideAvoidClause(
						slideVars.framing,
						slideVars.artStyle ?? DEFAULT_ART_STYLE,
					),
				);
}

/** Nano Banana: new promotional image from product photo + brief (not a template paste). */
export function buildPromoImagePrompt(
	vars: PromptVariables,
	brandProfile?: BrandProfile | null,
	brandKit?: BrandKit | null,
	plan?: SingleImagePlan | null,
	options?: {
		hasReferenceImage?: boolean;
		referenceImageMode?: ReferenceImageMode;
	},
): string {
	const product = vars.product?.trim() || "the product";
	const theme = plan
		? joinParts(plan.title, plan.body, plan.takeaway)
		: joinParts(vars.headline, vars.subline, vars.offer);
	const illustrated = isIllustratedArtStyle(vars.artStyle);
	const hasReferenceImage = options?.hasReferenceImage !== false;
	const referenceImageMode =
		options?.referenceImageMode ??
		(hasReferenceImage ? "clone" : "none");
	const refBlock = referenceBlockForMode(referenceImageMode, vars);
	const composition = prepareCompositionForImagePrompt({
		artStyle: vars.artStyle,
		compositionPreset: vars.compositionPreset,
		extra: vars.extra,
	});
	const extraSansComposition = composition.extraWithoutComposition;
	const eraseRefText =
		referenceImageMode === "clone"
			? "Remove outdated marketing text from IMAGE 1 where new copy replaces it."
			: referenceImageMode === "style-only"
				? "Replace ALL on-image text with the campaign copy below — never copy text, logos, or SKUs from IMAGE 1."
				: "Text-to-image: invent a fitting hero subject and set from the campaign brief — no uploaded IMAGE 1.";
	const heroLead =
		referenceImageMode === "clone"
			? illustrated
				? `Restage IMAGE 1 as an ILLUSTRATED social ad — keep the exact subject from IMAGE 1; campaign name "${product}" is caption only.`
				: `Restage IMAGE 1 into a finished vertical social advertisement — IMAGE 1 pixels are the hero; campaign name "${product}" is caption / claim only (never invent a different SKU).`
			: illustrated
				? `Create a brand-new vertical social media ILLUSTRATION/ad for ${product} — art medium only.`
				: `Create a brand-new vertical social media advertisement for ${product}.`;
	const textlessLead =
		referenceImageMode === "clone"
			? illustrated
				? `Restage IMAGE 1 as an ILLUSTRATION scene — keep IMAGE 1 subject; no readable text.`
				: `Restage IMAGE 1 into a vertical product/lifestyle scene — keep IMAGE 1 subject; campaign name "${product}" is mood only.`
			: illustrated
				? `Create a brand-new vertical social media ILLUSTRATION scene for ${product} — art medium only, no readable text.`
				: `Create a brand-new vertical social media product scene for ${product}.`;
	if (vars.imageTextMode === "textless") {
		return joinParts(
			artStyleMandatoryLead(vars.artStyle),
			composition.blocks?.camera ?? "",
			refBlock,
			textlessLead,
			brandPromptExtras(brandProfile, brandKit),
			vars.business ? `Brand / shop: ${vars.business}.` : "",
			theme
				? `Campaign mood only (do NOT render as text): ${theme}.`
				: "",
			illustrated || isLookGradeArtStyle(vars.artStyle)
				? artStylePlannerHint(vars.artStyle)
				: promoArtDirectionHint(vars),
			artStyleImageClause(vars.artStyle),
			TEXTLESS_IMAGE_GUARD,
			FRAMING_IMAGE[vars.framing],
			MARKET_HINTS[vars.market],
			artStyleAvoidTail(vars.artStyle),
			composition.blocks?.avoid
				? `Avoid: ${composition.blocks.avoid}.`
				: "",
			extraSansComposition,
			"Vertical ad background plate, no Instagram/FB UI chrome.",
		);
	}
	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		composition.blocks?.camera ?? "",
		refBlock,
		plan ? singlePlanBlock(plan) : "",
		heroLead,
		brandPromptExtras(brandProfile, brandKit),
		vars.business ? `Brand / shop: ${vars.business}.` : "",
		!plan && theme ? `Campaign message: ${theme}.` : "",
		eraseRefText,
		illustrated || isLookGradeArtStyle(vars.artStyle)
			? artStylePlannerHint(vars.artStyle)
			: plan
				? ""
				: promoArtDirectionHint(vars),
		illustrated
			? `Design a complete illustrated social ad: stylized hero scene, props, color palette, AND marketing typography rendered in the same art medium.`
			: referenceImageMode === "clone"
				? `Design a complete social ad around the IMAGE 1 subject: intentional scene, lighting, props, color grade, AND integrated marketing typography — do not invent a catalog product that is not in IMAGE 1.`
				: `Design a complete social ad: product hero, intentional scene, lighting, props, color grade, AND integrated marketing typography.`,
		artStyleImageClause(vars.artStyle),
		promoTypographyHint(
			plan
				? {
						...vars,
						headline: plan.title || vars.headline,
						subline: plan.body || vars.subline,
						offer: plan.takeaway || vars.offer,
					}
				: vars,
		),
		illustrated
			? `The result must be a finished illustrated ad with readable copy — NOT photorealistic photography.`
			: `The result must be a finished social ad with readable copy — magazine/lifestyle energy with props and depth, NOT a plain product-only beauty shot on seamless white.`,
		`ANTI-CATALOG: forbid empty white/cream sweep, centered bottle with only soft shadow, sparse two-line type on blank void. Prefer intentional set design (surfaces, props, rim light, shallow DOF) plus layered typography.`,
		`Do NOT paste the product onto a generic template frame. No watermarks, @handles, corner badges, seals, or placeholder labels. Never render English meta words such as CTA, logo, brand, or watermark.`,
		MARKET_HINTS[vars.market],
		marketChineseScriptBlock(vars.market),
		FRAMING_IMAGE[vars.framing],
		composition.blocks?.hero ?? "",
		carouselSlideAvoidClause(
			vars.framing,
			vars.artStyle ?? DEFAULT_ART_STYLE,
		),
		artStyleAvoidTail(vars.artStyle),
		composition.blocks?.avoid
			? `Avoid: ${composition.blocks.avoid}.`
			: "",
		extraSansComposition,
		"Single 9:16 marketing still.",
	);
}

function motionPosterArtStyleLock(
	artStyle?: ArtStyleId,
	opts?: { textless?: boolean },
): string {
	const id = resolveArtStyleId(artStyle);
	const clause = artStyleImageClause(id);
	const textless = opts?.textless !== false;
	if (id === "realistic") {
		return joinParts(
			`RENDER MEDIUM (mandatory): ${clause}`,
			"Photoreal or cinematic live-action photography. NOT comic, NOT webtoon, NOT cel-shaded illustration, NOT anime key visual.",
		);
	}
	return joinParts(
		artStyleMandatoryLead(id, { textless }),
		clause,
		artStyleAvoidTail(id),
	);
}

function motionPosterAspectLabel(aspectRatio?: string): string {
	const a = aspectRatio?.trim();
	return a === "4:5" || a === "1:1" || a === "9:16" ? a : "9:16";
}

function withMotionPosterAspect(text: string, aspect: string): string {
	return text.replaceAll("9:16", aspect);
}

/** 即梦 首尾帧 · 首帧 — designed poster, no type. Type arrives on the END still. */
export function buildMotionPosterStillPrompt(
	vars: PromptVariables,
	opts?: {
		conceptMode?: boolean;
		dialect?: MotionPosterDialectId;
		aspectRatio?: string;
	},
): string {
	const product =
		vars.product?.trim() ||
		(opts?.conceptMode ? "the service scene" : "the product");
	const dialect = MOTION_POSTER_DIALECTS[opts?.dialect ?? "card-warp"];
	const aspect = motionPosterAspectLabel(opts?.aspectRatio);
	if (opts?.conceptMode) {
		return joinParts(
			motionPosterArtStyleLock(vars.artStyle, { textless: true }),
			`Design a ${aspect} CONCEPT motion-poster START keyframe (即梦 首尾帧 · 首帧 / 動態海報). Theme (mood only, never as letters): ${product}.`,
			"Premium designed poster still — one hero scene, studio/C4D or shallow-DOF set. Not a busy catalog, not a live-action TVC freeze.",
			"TEXTLESS start plate: atmosphere and hero only. Type exists only on the END frame — do not paint letters here.",
			withMotionPosterAspect(dialect.stillLayoutConcept, aspect),
			dialect.startBeatConcept,
			TEXTLESS_IMAGE_GUARD,
			"The frame must contain no readable writing of any kind. Top ~20% is empty masthead atmosphere (sky, mist, wall) — not a title bar.",
			MARKET_HINTS_TEXTLESS[vars.market],
			FRAMING_IMAGE[vars.framing],
			`${aspect} textless poster still. Leave the masthead band empty for the end frame.`,
		);
	}
	return joinParts(
		motionPosterArtStyleLock(vars.artStyle, { textless: true }),
		imageReferenceAnchorBlock(vars),
		`Design a ${aspect} MOTION-POSTER START keyframe (即梦 首尾帧 · 首帧 / 動態海報) for ${product}.`,
		"Premium designed poster still: IMAGE 1 product hero + intentional set (studio/C4D or shallow-DOF). Not a blank white sweep.",
		"TEXTLESS start plate. Type exists only on the END frame — do not paint letters here.",
		withMotionPosterAspect(dialect.stillLayout, aspect),
		dialect.startBeat,
		`"${product}" names the photographed object only — do not paint those letters on the still. The object must stay IMAGE 1 pixels.`,
		TEXTLESS_IMAGE_GUARD,
		"The frame must contain no readable writing of any kind. Top ~20% is empty masthead atmosphere — not a title bar.",
		MARKET_HINTS_TEXTLESS[vars.market],
		FRAMING_IMAGE[vars.framing],
		`${aspect} textless poster still. Leave the masthead band empty for the end frame.`,
	);
}

/** 即梦 首尾帧 · 尾帧 — same poster family, large masthead, product may shift pose. */
export function buildMotionPosterEndStillPrompt(
	vars: PromptVariables,
	opts?: {
		conceptMode?: boolean;
		dialect?: MotionPosterDialectId;
		aspectRatio?: string;
	},
): string {
	const product =
		vars.product?.trim() ||
		(opts?.conceptMode ? "the service scene" : "the product");
	const dialect = MOTION_POSTER_DIALECTS[opts?.dialect ?? "card-warp"];
	const aspect = motionPosterAspectLabel(opts?.aspectRatio);
	const headline = vars.headline?.trim() || product;
	const subline = vars.subline?.trim() || "";
	const offer = vars.offer?.trim() || "";
	const designedPosterChrome =
		opts?.dialect === "designed-poster"
			? joinParts(
					"DESIGNED POSTER CHROME (paint on this END frame only):",
					"Bilingual masthead stack — large Chinese title (exact headline chars) → English ALL-CAPS serif under it → short script tagline from subline.",
					"One circular seal/stamp with a tiny claim; ONE large brush/calligraphy category word matching the product category.",
					"Soft upper-left key light; appetite set — not a blank white catalog cutout, not a white info flyer.",
				)
			: "";
	const copy = joinParts(
		`ON-IMAGE HEADLINE — oversized designed poster masthead (not a tiny caption, not a floating subtitle bar). Paint these exact characters: ${headline}`,
		subline
			? `ON-IMAGE SUBLINE under the masthead (exact): ${subline}`
			: "",
		offer
			? `ON-IMAGE BUTTON TEXT (small bottom pill — exact offer line, never paint the English letters C-T-A): ${offer}`
			: "",
		designedPosterChrome,
	);
	if (opts?.conceptMode) {
		return joinParts(
			motionPosterArtStyleLock(vars.artStyle, { textless: false }),
			`Design the END keyframe (即梦 首尾帧 · 尾帧) of a CONCEPT motion-poster pair (動態海報) for: ${product}.`,
			"IMAGE 1 (when attached) is the textless START plate — keep the same venue, lighting, wardrobe, and subject identity.",
			dialect.endBeatConcept,
			"Readable marketing type is REQUIRED. Large masthead in the band that was empty on the start plate.",
			withMotionPosterAspect(
				dialect.stillLayoutConcept.replace(
					/ZERO readable marketing text\.?/i,
					"Type lives in the reserved masthead.",
				),
				aspect,
			),
			copy,
			MARKET_HINTS[vars.market],
			FRAMING_IMAGE[vars.framing],
			`${aspect} finished designed poster still. No watermarks, no English meta labels, no hashtag clutter.`,
		);
	}
	return joinParts(
		motionPosterArtStyleLock(vars.artStyle, { textless: false }),
		imageReferenceAnchorBlock(vars),
		`Design the END keyframe (即梦 首尾帧 · 尾帧) of a MOTION-POSTER pair (動態海報) for ${product}.`,
		"IMAGE 1 (when attached) is the textless START plate — keep the same venue, lighting, and SKU identity.",
		dialect.endBeat,
		"The product MAY rotate, tilt, float, or move to a new settle pose. Same bottle/object — do not swap category.",
		"Readable marketing type is REQUIRED. Large masthead in the band that was empty on the start plate.",
		withMotionPosterAspect(
			dialect.stillLayout.replace(
				/ZERO readable marketing text\.?/i,
				"Type lives in the reserved masthead.",
			),
			aspect,
		),
		copy,
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		`${aspect} finished designed poster still. No watermarks, no English meta labels, no hashtag clutter.`,
	);
}

/**
 * Keep reference board grammar (hub/spokes/panels/chips); remap topic, subjects, and copy.
 * Single IMAGE 1 shell when concept-only; dual product+shell when dualProduct.
 */
export function buildCompositionRemapImagePrompt(
	vars: PromptVariables,
	options?: {
		aspectRatio?: string;
		dualProduct?: boolean;
		keepHero?: boolean;
	},
): string {
	const topic =
		vars.product?.trim() ||
		vars.headline?.trim() ||
		"the user's campaign topic";
	const aspect = options?.aspectRatio?.trim() || "4:5";
	const dual = Boolean(options?.dualProduct);
	const keepHero = Boolean(options?.keepHero);
	const campaignCopy = joinParts(
		vars.business ? `Brand: ${vars.business}` : undefined,
		vars.headline ? `Headline: ${vars.headline}` : undefined,
		vars.subline ? `Subline: ${vars.subline}` : undefined,
		vars.offer ? `Offer / CTA: ${vars.offer}` : undefined,
	);
	const copyHint = promoTypographyHint(vars, {
		layoutTransferDual: dual,
	});

	if (dual) {
		return joinParts(
			artStyleMandatoryLead(vars.artStyle),
			`Two images. Create ONE new ${aspect} composition-remap INFRASTRUCTURE BOARD for ${topic}.`,
			imageCompositionRemapReferenceBlock(true, keepHero),
			`CRITICAL: IMAGE 1 pixels win for PANEL GEOMETRY / board machine${keepHero ? " and hub hero identity" : ""}. IMAGE 2 pixels win for PRODUCT IDENTITY — every SKU on the board must be IMAGE 2, never a topic-invented bottle.`,
			campaignCopy
				? `Campaign copy (all on-image text): ${campaignCopy}.`
				: `No user headline — use "${topic}" as the only masthead; invent support lines only from the topic, never from IMAGE 1.`,
			"IMAGE 1 text is FORBIDDEN to paint — wipe every reference character and replace with user campaign copy only.",
			artStyleImageClause(vars.artStyle),
			copyHint,
			marketChineseScriptBlock(vars.market),
			MARKET_HINTS[vars.market],
			artStyleAvoidTail(vars.artStyle),
			vars.extra,
			`${aspect} dense social INFRASTRUCTURE infographic still (hub + spokes + metric cards), sharp focus, no watermark.`,
		);
	}

	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		`Create ONE new ${aspect} composition-remap INFRASTRUCTURE BOARD for ${topic}.`,
		imageCompositionRemapReferenceBlock(false, keepHero),
		`CRITICAL: Trace IMAGE 1's board machine. Output must be recognizably the SAME poster skeleton with a new topic — not a loosely related ad.${keepHero ? " Keep the hub person identity from IMAGE 1." : ""}`,
		campaignCopy
			? `Campaign copy (all on-image text): ${campaignCopy}.`
			: `No user headline — use "${topic}" as the only masthead; invent support lines only from the topic, never from IMAGE 1.`,
		"IMAGE 1 text is FORBIDDEN to paint — wipe every reference character and replace with user campaign copy only.",
		artStyleImageClause(vars.artStyle),
		copyHint,
		marketChineseScriptBlock(vars.market),
		MARKET_HINTS[vars.market],
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		`${aspect} dense social INFRASTRUCTURE infographic still (hub + spokes + metric cards), sharp focus, no watermark.`,
	);
}

/** Nano Banana: reference ad → new image keeping design language, adapting venue/lighting to product/shop. */
export function buildReferenceConceptImagePrompt(
	vars: PromptVariables,
	options?: {
		shopStyleHint?: string;
		brandProfile?: BrandProfile | null;
		/** When analyze-reference brief is in vars.extra — skip LAYER A/B/C essay. */
		structuredReferenceBrief?: boolean;
		aspectRatio?: string;
		/** Teaching carousel: cover follows IMAGE 2 layout; tip slides share look only. */
		seriesSlideRole?: "cover" | "tip";
		/** When true, this slide maps to a specific reference carousel panel. */
		mappedCarouselSlide?: boolean;
	},
): string {
	const product = vars.product?.trim() || "the product";
	const aspect = options?.aspectRatio?.trim() || "9:16";
	const tipLookOnly =
		options?.seriesSlideRole === "tip" && !options?.mappedCarouselSlide;
	const campaignCopy = joinParts(
		vars.business ? `Brand: ${vars.business}` : undefined,
		vars.headline ? `Headline: ${vars.headline}` : undefined,
		vars.subline ? `Subline: ${vars.subline}` : undefined,
		vars.offer ? `Offer: ${vars.offer}` : undefined,
	);
	const copyHint = promoTypographyHint(vars, { layoutTransferDual: true });
	const framingHint = tipLookOnly
		? "Staging: NEW crop/pose/layout for this teaching slide — do not reuse IMAGE 2's or the cover's centered-hero pose. Held/shown item must be IMAGE 1's exact product."
		: vars.framing === "auto"
			? "Staging: adapt IMAGE 2's pose type (hand / wrist / flat lay / pedestal) but the held/shown item must be IMAGE 1's exact product — never IMAGE 2's item. Face out of frame when hands appear."
			: FRAMING_IMAGE[vars.framing];
	const shopBlock = joinParts(
		options?.brandProfile?.businessName
			? brandProfilePromptBlock(options.brandProfile)
			: "",
		options?.shopStyleHint
			? `Shop visual style hint (for background and lighting only): ${options.shopStyleHint}.`
			: "",
		vars.business ? `Shop: ${vars.business}.` : "",
	);
	const structuredBrief =
		options?.structuredReferenceBrief ??
		(isLayoutTransferReferenceExtra(vars.extra) ||
			isStyleOnlyReferenceExtra(vars.extra));
	const dualCopyGuard = joinParts(
		"COPY LOCK: All readable on-image text must promote the user's product only.",
		`Product claim: ${product}.`,
		campaignCopy
			? `Campaign copy (all on-image text): ${campaignCopy}.`
			: `No user headline provided — use "${product}" as the only masthead; do not invent football/celebrity/edu headlines.`,
		"IMAGE 2 text is FORBIDDEN to paint — wipe every character from IMAGE 2 (headlines, bullets, club names, jersey numbers, CR7, watermarks, logos) and replace with user campaign copy / product claim only.",
		thirdPartyBrandGuardBlock().replaceAll("IMAGE 1", "IMAGE 2"),
	);

	if (structuredBrief) {
		return joinParts(
			artStyleMandatoryLead(vars.artStyle),
			`Two images. Create ONE new ${aspect} marketing still for ${product}.`,
			`IMAGE 1 = user's product hero (mascot/SKU to keep exactly). IMAGE 2 = layout/style reference only — never show IMAGE 2's product as the hero.`,
			tipLookOnly
				? `Borrow IMAGE 2's palette, lighting mood, and typography energy only. Do NOT copy IMAGE 2's layout, pose, or poster grid — invent a NEW teaching-card composition. SCENE ESSAY / staging KEEP apply to the cover only.`
				: `Transform IMAGE 1 into an ad that borrows IMAGE 2's layout rhythm, graphic component types, typography hierarchy, and staging pose type. Adapt background and lighting to suit IMAGE 1. Do not copy IMAGE 2 logos, wordmarks, or selling lines.`,
			tipLookOnly
				? `If SCENE ESSAY appears below, use it for palette / lighting / medium only — not composition. IMAGE 1 pixels still win for the hero.`
				: `If SCENE ESSAY appears below, treat it as the set / lighting / composition screenplay. IMAGE 1 pixels still win for the hero. IMAGE 2 pixels still win for layout.`,
			`CRITICAL: The hero subject must be recognizable as IMAGE 1 (same character/product). If IMAGE 1 is a 3D mascot/character, keep that mascot — do not replace it with jewelry, bottles, or other items from IMAGE 2.`,
			`Never paint the English word LOGO, BRAND, or CTA. Never invent a circular brand-mark / seal / placeholder logo. If IMAGE 2 has a logo zone, leave that area empty or fill only with campaign copy lines above — do not invent 立即選購 / Shop Now unless that exact phrase is in the campaign copy.`,
			shopBlock,
			dualCopyGuard,
			artStyleImageClause(vars.artStyle),
			copyHint,
			marketChineseScriptBlock(vars.market),
			MARKET_HINTS[vars.market],
			framingHint,
			artStyleAvoidTail(vars.artStyle),
			vars.extra,
			`${aspect} social ad still, sharp focus, no watermark.`,
		);
	}

	return joinParts(
		artStyleMandatoryLead(vars.artStyle),
		`Two images. Create ONE new ${aspect} marketing still for ${product}.`,
		`HOW TO USE THE TWO IMAGES:`,
		`IMAGE 1 = the user's real product/mascot photo — this is the ONLY allowed hero subject. Preserve exact identity (shape, materials, character design).`,
		`IMAGE 2 = reference ad for layout/style ONLY — borrow design grammar; REPLACE IMAGE 2's product with IMAGE 1.`,
		tipLookOnly
			? `LAYER A — KEEP from IMAGE 2 (look only): color palette, lighting softness, typography energy, art medium. Do NOT keep IMAGE 2's layout structure or staging pose.`
			: `LAYER A — KEEP from IMAGE 2 (design language): layout structure, composition rhythm, graphic component types (badges, frames, accent shapes), typography hierarchy style, and staging pose type (hand / wrist / flat lay / circle hero).`,
		`LAYER B — ADAPT (venue and light): background, venue, surface, and lighting should suit IMAGE 1's product colors and the shop/campaign mood.`,
		`LAYER C — REPLACE (content): hero must be IMAGE 1's exact item. All readable copy from the campaign brief below — never reuse IMAGE 2 product names, selling lines, or on-image text. Do not copy IMAGE 2 logos, wordmarks, store names, @handles, or watermarks.`,
		`If the campaign product name disagrees with IMAGE 1 pixels, trust IMAGE 1 for product category, shape, and materials.`,
		shopBlock,
		dualCopyGuard,
		artStyleImageClause(vars.artStyle),
		copyHint,
		marketChineseScriptBlock(vars.market),
		MARKET_HINTS[vars.market],
		framingHint,
		artStyleAvoidTail(vars.artStyle),
		vars.extra,
		`${aspect} vertical social ad still, sharp focus, no watermark.`,
	);
}

/**
 * When user uploads product (image 1) + style reference ad (image 2).
 * Must NOT mention studio/clean background — that overrides the reference.
 */
/** @deprecated Prefer buildReferenceConceptImagePrompt — kept for API compatibility. */
export function buildProductWithStyleRefPrompt(vars: PromptVariables): string {
	return buildReferenceConceptImagePrompt(vars);
}

function buildVideoMotionBlock(opts: VideoPromptOpts): string {
	const creativity = opts.creativity ?? "lively";
	const motion = creativityMotionHint(creativity, Boolean(opts.dualFrame));
	const frameNote = opts.dualFrame
		? "Start frame = opening composition, end frame = closing composition — prefer a subtle transition; avoid melting one scene into another."
		: "Animate the hero product with commercial motion.";
	const realismNote =
		creativity === "subtle"
			? "Photorealistic commercial look: locked or near-static camera, very subtle motion only, natural lighting, no plastic skin, no finger morphing, no surreal sparkle trails."
			: "";
	const multiNote = opts.multiAngle
		? "Use all reference images as the same product from different angles; cut-like energy between angles while keeping identity consistent."
		: "";
	return joinParts(
		frameNote,
		motion,
		realismNote,
		multiNote,
		"Keep the same product identity — do not morph into a different item.",
	);
}

/** Template-specific Seedance prompt — style from videoPromptTemplate + motion layer. */
export function buildVideoPrompt(
	template: MarketingTemplate,
	vars: PromptVariables,
	opts?: VideoPromptOpts,
): string {
	const styleBase = applyTemplate(template.videoPromptTemplate, vars);
	const motionBlock = opts ? buildVideoMotionBlock(opts) : "";
	return (
		joinParts(
			styleBase,
			vars.headline ? `Campaign theme: ${vars.headline}.` : "",
			motionBlock,
			MARKET_HINTS[vars.market],
			FRAMING_VIDEO[vars.framing],
			vars.extra,
			opts ? "No on-screen text, subtitles, logos, or watermarks" : "",
		) + VIDEO_BGM_HINT
	);
}

/** Wizard video step — picks template from visual style / templateId. */
export function buildWizardVideoPrompt(
	templateId: TemplateId,
	vars: PromptVariables,
	opts: VideoPromptOpts = {},
): string {
	return joinParts(
		buildVideoPrompt(getTemplate(templateId), vars, opts),
		artStyleSeedanceHint(vars.artStyle),
	);
}

/** Seedance image-to-video: product promo from generated keyframe. */
export function buildProductPromoVideoPrompt(
	vars: PromptVariables,
	opts: VideoPromptOpts = {},
	templateId: TemplateId = "product-reel",
): string {
	return buildWizardVideoPrompt(templateId, vars, opts);
}

/** Seedance image-to-video after Nano Banana step in combined workflow. */
export function buildImageToVideoPrompt(
	vars: PromptVariables,
	opts: VideoPromptOpts = {},
	templateId: TemplateId = "product-reel",
): string {
	return buildWizardVideoPrompt(templateId, vars, opts);
}

/** Storyboard scene: IMAGE 1 style shell + user topic content (reference topic may differ). */
function imageStoryboardStyleRefBlock(
	plan: VideoStoryboardPlan,
	dualProductAndStyle?: boolean,
	textless?: boolean,
): string {
	const contentReplace = textless
		? REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE
		: REFERENCE_CONTENT_REPLACE_LINE;
	const eraseText = textless ? REFERENCE_ERASE_TEXT_LINE : "";
	if (dualProductAndStyle) {
		return joinParts(
			"DUAL REFERENCE — IMAGE 1 = the user's EXACT product photo; IMAGE 2 = style/layout mood from research",
			"Keep IMAGE 2's composition grammar, color mood, and social-ad energy.",
			"Hero subject must be IMAGE 1's exact item — do NOT copy IMAGE 2's product, jewelry, or props.",
			contentReplace,
			REFERENCE_TOPIC_GUARD_LINE,
			eraseText,
			"Adapt beat layout rhythm for this scene — same design family as IMAGE 2, hero product from IMAGE 1 only.",
			plan.visualDirection
				? `Locked series aesthetic: ${plan.visualDirection}.`
				: "",
			thirdPartyBrandGuardBlock(),
		);
	}
	return joinParts(
		"REFERENCE STYLE TRANSFER — IMAGE 1 is the reference ad/reel frame",
		REFERENCE_STYLE_MATCH_LINE,
		contentReplace,
		REFERENCE_TOPIC_GUARD_LINE,
		eraseText,
		"Adapt the reference beat layout rhythm for this scene — same composition grammar family as IMAGE 1, not a generic stock layout.",
		"If IMAGE 1 is illustrated/3D/meme/cartoon, do NOT default to generic photorealistic lifestyle photography.",
		plan.visualDirection
			? `Locked series aesthetic: ${plan.visualDirection}.`
			: "",
		thirdPartyBrandGuardBlock(),
	);
}

/** Drop planner lines that ask Nano Banana to paint text when stills must stay video-safe. */
function sanitizeStoryboardImagePromptForTextless(
	imagePrompt: string | undefined,
): string {
	const raw = imagePrompt?.trim() ?? "";
	if (!raw) return "";
	return raw
		.replace(
			/\b(with|add|include|overlay|render|bake|paint|show)\b[^.]{0,40}\b(text|typography|caption|headline|copy|logo|字|文案|標題|標語)[^.]*\.?/gi,
			"",
		)
		.replace(/\bon[- ]?image copy\b[^.]*\.?/gi, "")
		.replace(
			/\b(CTA|call to action|slogan|tagline|watermark)\b[^.]*\.?/gi,
			"",
		)
		.replace(/[\u4e00-\u9fff]{2,}[^.|，。；]*[.。]?/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}

/** Nano Banana still for one storyboard scene (product from IMAGE 1, or IMAGE 2 when dual). */
export function buildStoryboardSceneImagePrompt(
	scene: StoryboardScenePlan,
	plan: VideoStoryboardPlan,
	vars: PromptVariables,
	options?: {
		referenceConcept?: boolean;
		conceptTextOnly?: boolean;
		storyboardStyleRef?: boolean;
		dualProductAndStyle?: boolean;
		/** Stills stay textless; onImageCopyZh is burned as captions after video. */
		textless?: boolean;
		visualStyleId?: VisualStyleId;
		brandProfile?: BrandProfile | null;
		brandKit?: BrandKit | null;
		brandLogoImageIndex?: number | null;
		/** Product/physical path with an uploaded product photo. */
		hasProductImage?: boolean;
	},
): string {
	const brandKit = options?.brandKit;
	const brandLogoImageIndex = options?.brandLogoImageIndex ?? null;
	const withLogo = (prompt: string) =>
		brandLogoImageIndex != null
			? joinParts(
					prompt,
					brandKitLogoImagePromptBlock(brandLogoImageIndex),
				)
			: prompt;
	const referenceConcept = Boolean(options?.referenceConcept);
	const conceptTextOnly = Boolean(options?.conceptTextOnly);
	const storyboardStyleRef = Boolean(options?.storyboardStyleRef);
	const dualProductAndStyle = Boolean(options?.dualProductAndStyle);
	// Default: product storyboard assumes IMAGE 1 unless explicitly concept text-only.
	const hasProductImage = options?.hasProductImage ?? !conceptTextOnly;
	const textless = options?.textless !== false; // default ON for video-safe stills
	const spaBeautyBrief = looksLikeSpaOrBeautyBrief(
		vars.product,
		plan.theme,
		scene.imagePrompt,
		vars.extra,
	);
	const sceneImagePrompt = softenStoryboardStillPromptForModeration(
		textless
			? sanitizeStoryboardImagePromptForTextless(scene.imagePrompt)
			: scene.imagePrompt?.trim() || "",
		{ spaBeautyBrief },
	);
	const sceneVars: PromptVariables = {
		...vars,
		extra: softenStoryboardStillPromptForModeration(
			[vars.extra, sceneImagePrompt].filter(Boolean).join(" | "),
			{ spaBeautyBrief },
		),
	};
	const shopHint = options?.visualStyleId
		? getVisualStyle(options.visualStyleId).promptHint
		: "";
	const sceneCopy = textless ? undefined : scene.onImageCopyZh?.trim();
	const lookLock = (() => {
		const bibleLine = plan.lookBible
			? lookBibleSummaryLine(plan.lookBible)
			: "";
		const lighting = scene.lightingEn?.trim();
		return joinParts(
			bibleLine
				? `LOOK BIBLE LOCK (grade only — all scenes): ${bibleLine}.`
				: "",
			lighting ? `Scene lighting (this beat): ${lighting}.` : "",
			plan.visualDirection && !bibleLine
				? `Series look: ${plan.visualDirection}.`
				: "",
		);
	})();
	const textlessRule =
		brandLogoImageIndex != null
			? `TEXTLESS STILL (mandatory for video): ZERO readable marketing copy — no Chinese/Latin captions, title bars, or watermarks. Exception: integrate the client's brand logo from IMAGE ${brandLogoImageIndex} exactly as provided. Leave blank space for burned captions AFTER Kling/Seedance.`
			: "TEXTLESS STILL (mandatory for video): ZERO readable text — no Chinese, no Latin, no digits-as-copy, no captions, no title bars, no watermarks, no fake UI labels. Phone/laptop/tablet screens must show soft blank or abstract UI chrome only — never invent gibberish Chinese/English on screens. If IMAGE 1 has text, REMOVE it completely. Leave blank space where type would go — captions are burned AFTER Kling/Seedance.";
	const imageBriefVars: PromptVariables = sceneCopy
		? {
				...sceneVars,
				subline: undefined,
				extra: joinParts(
					`ON-IMAGE COPY (this scene only): ${sceneCopy}`,
					"Do NOT render production labels (開場亮點, 行動呼籲, 中段, arrows →) or the full-video subline.",
					sceneImagePrompt,
				),
			}
		: sceneVars;
	if (referenceConcept) {
		return withLogo(
			joinParts(
				artStyleMandatoryLead(sceneVars.artStyle),
				`Storyboard still ${scene.imageIndex}/${plan.scenes.length}.`,
				lookLock,
				plan.theme ? `Story theme: ${plan.theme}.` : "",
				`Scene role: ${scene.role}.`,
				sceneImagePrompt ? `Scene action: ${sceneImagePrompt}.` : "",
				"Keep the SAME ad layout shell as IMAGE 2 on every scene — only scene action and micro-angle change inside that design family.",
				"IMAGE 1 = product hero (keep identity); IMAGE 2 = layout/style shell — never treat the product photo as the layout template.",
				buildReferenceConceptImagePrompt(imageBriefVars, {
					shopStyleHint: shopHint,
					brandProfile: options?.brandProfile ?? undefined,
				}),
				"Subject upright, head at top of frame — never rotate 90°.",
				MARKET_HINTS[sceneVars.market],
				FRAMING_IMAGE[sceneVars.framing],
				sceneCopy
					? "Integrate ON-IMAGE COPY text with reference typography style — consumer words only."
					: joinParts(textlessRule, REFERENCE_ERASE_TEXT_LINE),
				"9:16 vertical social ad still — no watermark, no social UI.",
			),
		);
	}
	if (storyboardStyleRef) {
		return withLogo(
			joinParts(
				artStyleMandatoryLead(vars.artStyle),
				`Storyboard still ${scene.imageIndex}/${plan.scenes.length}.`,
				plan.theme
					? `User story theme (content lane): ${plan.theme}.`
					: "",
				lookLock ||
					(plan.visualDirection
						? `Series look (from reference reel): ${plan.visualDirection}.`
						: ""),
				`Scene role: ${scene.role}.`,
				sceneImagePrompt ? `Scene action: ${sceneImagePrompt}.` : "",
				imageStoryboardStyleRefBlock(
					plan,
					dualProductAndStyle,
					textless,
				),
				!hasProductImage ? conceptServiceStillSafetyClause() : "",
				sceneCopy
					? `ON-IMAGE COPY (this scene only): ${sceneCopy}`
					: textlessRule,
				sceneCopy ? promoTypographyHint(sceneVars, true) : "",
				artStyleImageClause(vars.artStyle),
				artStyleAvoidTail(vars.artStyle),
				"Subject upright, head at top of frame — never rotate 90°.",
				MARKET_HINTS[sceneVars.market],
				FRAMING_IMAGE[sceneVars.framing],
				sceneVars.extra,
				"9:16 vertical, no watermark, no social UI.",
			),
		);
	}
	if (conceptTextOnly) {
		return withLogo(
			joinParts(
				artStyleMandatoryLead(vars.artStyle),
				`Storyboard still ${scene.imageIndex}/${plan.scenes.length} for a concept short.`,
				lookLock,
				plan.theme ? `Story theme: ${plan.theme}.` : "",
				`Scene role: ${scene.role}.`,
				sceneImagePrompt,
				sceneCopy
					? `ON-IMAGE COPY (this scene only): ${sceneCopy}`
					: textlessRule,
				"Cinematic concept short — match reference reel pacing and visual style family; user topic for content only.",
				conceptServiceStillSafetyClause(),
				brandLogoImageIndex != null
					? "No third-party logos, watermarks, or social UI. 9:16 vertical."
					: "No logos, watermarks, or social UI. 9:16 vertical.",
				artStyleImageClause(vars.artStyle),
				artStyleAvoidTail(vars.artStyle),
				"Subject upright, head at top of frame — never rotate 90°.",
				MARKET_HINTS[sceneVars.market],
				FRAMING_IMAGE[sceneVars.framing],
				sceneVars.extra,
			),
		);
	}
	if (!hasProductImage) {
		return withLogo(
			joinParts(
				artStyleMandatoryLead(vars.artStyle),
				`Storyboard still ${scene.imageIndex}/${plan.scenes.length} for a concept short.`,
				lookLock,
				plan.theme ? `Story theme: ${plan.theme}.` : "",
				`Scene role: ${scene.role}.`,
				sceneImagePrompt,
				sceneCopy
					? `ON-IMAGE COPY (this scene only): ${sceneCopy}`
					: textlessRule,
				conceptServiceStillSafetyClause(),
				brandLogoImageIndex != null
					? "9:16 vertical cinematic still — no third-party logos, watermarks, or social UI."
					: "9:16 vertical cinematic still — no logos, watermarks, or social UI.",
				artStyleImageClause(vars.artStyle),
				MARKET_HINTS[sceneVars.market],
				sceneVars.extra,
			),
		);
	}
	return withLogo(
		joinParts(
			artStyleMandatoryLead(vars.artStyle),
			`Storyboard still ${scene.imageIndex}/${plan.scenes.length} for a ${artStyleStoryboardLead(vars.artStyle)}.`,
			lookLock,
			plan.theme ? `Story theme: ${plan.theme}.` : "",
			`Scene role: ${scene.role}.`,
			imageReferenceAnchorBlock(vars),
			"PIXEL LOCK: if the scene action names a different object category than IMAGE 1 pixels, IGNORE the substitute and stage IMAGE 1's object.",
			sceneImagePrompt,
			"Keep the exact product from IMAGE 1 — same item, colors, materials, and shape. Do not swap for a different product category.",
			artStyleImageClause(vars.artStyle),
			artStyleAvoidTail(vars.artStyle),
			"Subject upright, head at top of frame, correct vertical orientation — never rotate person or product 90°.",
			MARKET_HINTS[vars.market],
			FRAMING_IMAGE[vars.framing],
			sceneVars.extra,
			brandPromptExtras(options?.brandProfile, brandKit),
			sceneCopy
				? joinParts(
						`ON-IMAGE COPY (this scene only): ${sceneCopy}`,
						"Integrate ON-IMAGE COPY as designed poster type — exact consumer words, no production labels.",
						promoTypographyHint(sceneVars, false),
					)
				: textlessRule,
			"9:16 vertical, no watermark, no social UI.",
		),
	);
}

/** Second still for start→end image-to-video (Nano Banana). */
export function buildEndFrameImagePrompt(vars: PromptVariables): string {
	const product = vars.product?.trim() || "the product";
	return joinParts(
		`Create a second vertical ad frame for ${product} — must be a DIFFERENT composition from IMAGE 1.`,
		buildSecondFrameSceneHint(product, vars.framing),
		`Preserve exact product from IMAGE 1. New angle, lighting accent, and background mood.`,
		MARKET_HINTS[vars.market],
		FRAMING_IMAGE[vars.framing],
		vars.extra,
		"9:16, no readable text, no watermark.",
	);
}

/** Reference-to-video with multiple product photos, no MP4 clone. */
export function buildMultiAngleVideoPrompt(
	vars: PromptVariables,
	opts: VideoPromptOpts = {},
	templateId: TemplateId = "product-reel",
): string {
	const creativity = opts.creativity ?? "lively";
	return joinParts(
		buildWizardVideoPrompt(templateId, vars, {
			...opts,
			multiAngle: true,
			creativity,
		}),
		"Reference images show the same product from different angles — create dynamic motion that showcases multiple views with commercial pacing, not a single slow zoom.",
	);
}

export function buildNegativePrompt(
	template: MarketingTemplate,
	framing: SubjectFraming,
	artStyle: ArtStyleId = DEFAULT_ART_STYLE,
): string {
	const base = FRAMING_NEGATIVE[framing]
		? `${template.negativePrompt}, ${FRAMING_NEGATIVE[framing]}`
		: template.negativePrompt;
	return applyArtStyleNegative(base, artStyle);
}

export function rebuildPromptsForTemplate(
	templateId: TemplateId,
	vars: PromptVariables,
): { image: string; video: string; negative: string } {
	const template = getTemplate(templateId);
	return {
		image: buildImageEditPrompt(template, vars),
		video: buildVideoPrompt(template, vars),
		negative: buildNegativePrompt(template, vars.framing),
	};
}

/** Reference-to-video — @Video1 = spine, @Image1 = object, name/title = claim (fal pattern). */
export function buildReferenceVideoPrompt(
	vars: PromptVariables,
	templateId?: TemplateId,
): string {
	// Do NOT inject template videoPromptTemplate (often "Slow cinematic push-in…") —
	// that fights @Video1 spine. Template id is unused for R2V camera/mood.
	void templateId;
	const productLabel = vars.product?.trim() || "the user's product";
	const claim = vars.headline?.trim();
	return (
		joinParts(
			"Reference-to-video. @Video1 = SPINE: camera angles, shot composition, hand movements, scene layout, pacing, and edit rhythm.",
			`@Image1 = OBJECT ONLY: perform the same actions/structure as @Video1, swap the hero to ${productLabel} (match @Image1 colors, materials, and shape).`,
			claim
				? `Product name + title are CLAIM only (${productLabel} — ${claim}): sell this use-case without changing the on-screen object away from @Image1.`
				: `Product name is CLAIM only (${productLabel}): sell the named use-case; on-screen object must stay @Image1.`,
			`If @Video1 shows hands using or presenting a product, show natural hands with ${productLabel} — do NOT collapse into a generic slow push-in unless @Video1 does that.`,
			"Keep the same background type, lighting direction, and framing as @Video1.",
			"Do not copy identifiable faces, brand logos, social UI, or readable on-screen text from @Video1.",
			"Silent video: no speech, dialogue, vocals, or ambient talk — audio is added in post-production.",
			MARKET_HINTS[vars.market],
			vars.framing === "hands-only"
				? "Hands may appear; face never visible."
				: vars.framing === "no-people" ||
					  vars.framing === "product-only"
					? ""
					: FRAMING_VIDEO[vars.framing],
			"No generated subtitles, watermarks, or logos",
			vars.extra,
		) + VIDEO_BGM_HINT
	);
}

/** Negative prompt for reference-to-video — do not block hands when matching @Video1. */
export function buildReferenceVideoNegative(
	template: MarketingTemplate,
): string {
	return `${template.negativePrompt.replace(/,?\s*distorted hands/gi, "")}, identifiable face close-up, celebrity portrait, social media UI overlay, screen recording chrome, watermark, logo, on-screen text, subtitles, speech, voiceover`;
}
