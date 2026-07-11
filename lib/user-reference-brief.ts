import type { CarouselReferenceVision } from "@/lib/carousel-reference-vision";
import type { ConceptImageVision } from "@/lib/concept-image-vision";

/** Per-slide layout/style from multi-image carousel vision (reference slide order). */
export type CarouselSlideReferenceBrief = {
  index: number;
  sceneSummary: string;
  layoutStyle: string;
  colorPalette: string;
  typographyStyle: string;
  mood: string;
  composition: string;
  stagingPose: string;
};

/** Structured brief from user uploads + text — flows through plan → image → video. */
export type UserReferenceBrief = {
  topic: string;
  contentSummary: string;
  visibleText: string;
  subjects: string;
  contentType: string;
  layoutStyle: string;
  colorPalette: string;
  typographyStyle: string;
  mood: string;
  motionHints: string;
  userConceptIdea?: string;
  userHeadline?: string;
  userSubline?: string;
  /** Populated when vision analyzed multiple reference carousel frames. */
  carouselSlides?: CarouselSlideReferenceBrief[];
  carouselSlideCount?: number;
};

export const USER_REFERENCE_MARKER = "USER REFERENCE (match content + style)";
export const USER_REFERENCE_STYLE_ONLY_MARKER = "USER REFERENCE (style only)";
export const USER_REFERENCE_LAYOUT_TRANSFER_MARKER =
  "USER REFERENCE (layout transfer — do NOT copy subjects or reference copy)";

const STYLE_ONLY_TAIL =
  "Match topic lane and visual style family ONLY — each carousel slide must use a distinct layout; never clone the reference poster structure or duplicate the same hero graphic.";

const LAYOUT_TRANSFER_TAIL =
  "Borrow IMAGE 1 design grammar (layout rhythm, component types, typography hierarchy, staging pose type) — show IMAGE 2 product as hero, all readable copy from user brief. IMAGE 1 is another company's post — do NOT copy its logos, wordmarks, store names, sponsor marks, @handles, watermarks, or original selling lines. Background and lighting may adapt to suit IMAGE 2.";

const CLONE_TAIL =
  "Generate in the same content lane and visual style family as this reference — do not genericize into unrelated stock marketing.";

export function briefFromCarouselVision(
  vision: CarouselReferenceVision,
  userInputs?: { conceptIdea?: string; headline?: string; subline?: string },
): UserReferenceBrief {
  const slideSummaries = vision.slides
    .map((s) => s.sceneSummary)
    .filter(Boolean)
    .join("; ");
  return {
    topic: vision.seriesSummary,
    contentSummary: vision.seriesSummary,
    visibleText: "",
    subjects: slideSummaries
      ? `Reference carousel subjects (DO NOT reproduce): ${slideSummaries}`
      : "",
    contentType: vision.contentType || "social-carousel",
    layoutStyle: vision.sharedLayoutFamily,
    colorPalette: vision.sharedColorPalette,
    typographyStyle: vision.sharedTypography,
    mood: vision.sharedMood,
    motionHints: "",
    userConceptIdea: userInputs?.conceptIdea?.trim() || undefined,
    userHeadline: userInputs?.headline?.trim() || undefined,
    userSubline: userInputs?.subline?.trim() || undefined,
    carouselSlideCount: vision.slides.length,
    carouselSlides: vision.slides.map((s) => ({
      index: s.index,
      sceneSummary: s.sceneSummary,
      layoutStyle: s.layoutStyle,
      colorPalette: s.colorPalette || vision.sharedColorPalette,
      typographyStyle: s.typographyStyle || vision.sharedTypography,
      mood: s.mood || vision.sharedMood,
      composition:
        s.compositionHint ||
        [s.layoutStyle, s.stagingPose].filter(Boolean).join(" — ") ||
        s.sceneSummary,
      stagingPose: s.stagingPose,
    })),
  };
}

/** Planner block: per-slide reference layout hints from carousel vision. */
export function carouselSlidesPlannerBlock(
  slides: CarouselSlideReferenceBrief[] | undefined,
): string {
  if (!slides?.length) return "";
  const lines = slides.map((s) => {
    const parts = [
      `Slide ${s.index}`,
      s.composition || s.layoutStyle,
      s.stagingPose ? `staging: ${s.stagingPose}` : "",
      s.mood ? `mood: ${s.mood}` : "",
    ].filter(Boolean);
    return parts.join(" — ");
  });
  return [
    `Reference carousel has ${slides.length} analyzed slides — match shared visual DNA and map output slide N to reference slide N layout/staging.`,
    ...lines,
  ].join("\n");
}

export function briefFromConceptVision(
  vision: ConceptImageVision,
  userInputs?: { conceptIdea?: string; headline?: string; subline?: string },
): UserReferenceBrief {
  return {
    topic: vision.topic || vision.sceneSummary,
    contentSummary: vision.sceneSummary,
    visibleText: vision.visibleText,
    subjects: vision.subjects,
    contentType: vision.contentType,
    layoutStyle: vision.layoutStyle,
    colorPalette: vision.colorPalette,
    typographyStyle: vision.typographyStyle,
    mood: vision.mood,
    motionHints: vision.motionHints,
    userConceptIdea: userInputs?.conceptIdea?.trim() || undefined,
    userHeadline: userInputs?.headline?.trim() || undefined,
    userSubline: userInputs?.subline?.trim() || undefined,
  };
}

export function briefFromUserTextOnly(input: {
  conceptIdea?: string;
  headline?: string;
  subline?: string;
  promptExtra?: string;
}): UserReferenceBrief | null {
  const conceptIdea = input.conceptIdea?.trim();
  const headline = input.headline?.trim();
  const subline = input.subline?.trim();
  const extra = input.promptExtra?.trim();
  if (!conceptIdea && !headline && !subline && !extra) return null;
  return {
    topic: conceptIdea || headline || subline || extra || "",
    contentSummary: [conceptIdea, headline, subline].filter(Boolean).join(". "),
    visibleText: "",
    subjects: "",
    contentType: "user-text",
    layoutStyle: "",
    colorPalette: "",
    typographyStyle: "",
    mood: "",
    motionHints: "",
    userConceptIdea: conceptIdea,
    userHeadline: headline,
    userSubline: subline,
  };
}

/** One-line note for UI / legacy string fields. */
export function briefToVisionNote(brief: UserReferenceBrief): string {
  return userReferencePromptBlock(brief);
}

export function isInfographicLikeBrief(brief: UserReferenceBrief | string | undefined): boolean {
  const text = typeof brief === "string" ? brief : userReferencePromptBlock(brief!);
  if (isPhotographicReferenceBrief(brief)) return false;
  return /infographic|social-carousel|poster|user-text/i.test(
    `${text} ${typeof brief === "object" ? brief.contentType : ""}`,
  );
}

/** Reference is a real product/lifestyle photo — not flat icon infographic. */
export function isPhotographicReferenceBrief(
  brief: UserReferenceBrief | string | undefined,
): boolean {
  const contentType = typeof brief === "object" ? brief.contentType : "";
  const text = typeof brief === "string" ? brief : userReferencePromptBlock(brief!);
  const blob = `${contentType} ${text}`.toLowerCase();
  if (/lifestyle-photo|product-ad|product photo|photograph|photography|flat lay/i.test(blob)) {
    return true;
  }
  if (/infographic|social-carousel|poster/i.test(blob)) {
    return /photograph|lifestyle|flat lay|linen|natural light|product shot|bead|bracelet|crystal/i.test(
      blob,
    );
  }
  return false;
}

/** Injected into prompt_extra for planners and Nano Banana — preserves user intent. */
export function userReferencePromptBlock(brief: UserReferenceBrief): string {
  const parts = [`${USER_REFERENCE_MARKER}:`];
  if (brief.userConceptIdea) parts.push(`User idea: ${brief.userConceptIdea}`);
  if (brief.userHeadline && brief.userHeadline !== brief.userConceptIdea) {
    parts.push(`User headline: ${brief.userHeadline}`);
  }
  if (brief.userSubline) parts.push(`User points: ${brief.userSubline}`);
  if (brief.topic) parts.push(`Topic: ${brief.topic}`);
  if (brief.contentSummary && brief.contentSummary !== brief.topic) {
    parts.push(`Content: ${brief.contentSummary}`);
  }
  if (brief.visibleText) parts.push(`On-image text to preserve: ${brief.visibleText}`);
  if (brief.subjects) parts.push(`Subjects: ${brief.subjects}`);
  if (brief.contentType) parts.push(`Format: ${brief.contentType}`);
  if (brief.layoutStyle) parts.push(`Layout style: ${brief.layoutStyle}`);
  if (brief.colorPalette) parts.push(`Colors: ${brief.colorPalette}`);
  if (brief.typographyStyle) parts.push(`Typography: ${brief.typographyStyle}`);
  if (brief.mood) parts.push(`Mood: ${brief.mood}`);
  if (brief.motionHints) parts.push(`Motion: ${brief.motionHints}`);
  if (brief.carouselSlides?.length) {
    parts.push(
      `Reference carousel (${brief.carouselSlides.length} slides analyzed): match shared palette, typography, mood, and per-slide layout rhythm below.`,
    );
    parts.push(carouselSlidesPlannerBlock(brief.carouselSlides).replace(/\n/g, " | "));
  }
  parts.push(CLONE_TAIL);
  return parts.join(" ");
}

function layerActionHint(layer: string, action: string): string | null {
  if (action === "keep") return `${layer}: KEEP from reference`;
  if (action === "adapt") return `${layer}: ADAPT to product/shop`;
  if (action === "replace") return `${layer}: REPLACE with user product & copy`;
  if (action === "ignore") return `${layer}: IGNORE from reference`;
  return null;
}

/** Product + reference ad — layout transfer, not pixel clone. */
export function userReferenceLayoutTransferPromptBlock(
  brief: UserReferenceBrief,
  layers: {
    layoutGrammar: string;
    visualStyle: string;
    contentLane: string;
    subjects: string;
    onImageText: string;
    moodLighting: string;
    stagingPose: string;
  },
): string {
  const parts = [`${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}:`];
  if (brief.userConceptIdea) parts.push(`User idea: ${brief.userConceptIdea}`);
  if (brief.userHeadline && brief.userHeadline !== brief.userConceptIdea) {
    parts.push(`User headline: ${brief.userHeadline}`);
  }
  if (brief.userSubline) parts.push(`User points: ${brief.userSubline}`);
  if (brief.layoutStyle) parts.push(`Reference layout grammar: ${brief.layoutStyle}`);
  if (brief.colorPalette) parts.push(`Reference colors: ${brief.colorPalette}`);
  if (brief.typographyStyle) parts.push(`Reference typography: ${brief.typographyStyle}`);
  if (brief.contentType) parts.push(`Reference format: ${brief.contentType}`);
  if (brief.mood) parts.push(`Reference mood: ${brief.mood}`);
  if (brief.carouselSlides?.length) {
    parts.push(
      `Reference carousel (${brief.carouselSlides.length} slides): output slide N should mirror reference slide N layout/staging — ${carouselSlidesPlannerBlock(brief.carouselSlides).replace(/\n/g, " | ")}`,
    );
  }
  if (brief.subjects) {
    parts.push(`Reference subjects (DO NOT reproduce): ${brief.subjects}`);
  }
  if (brief.visibleText) {
    parts.push(
      "Reference image contained on-image text — ignore all wording and character forms; write only the user's campaign copy in the target script.",
    );
  }
  const layerHints = [
    layerActionHint("Layout", layers.layoutGrammar),
    layerActionHint("Visual style", layers.visualStyle),
    layerActionHint("Topic", layers.contentLane),
    layerActionHint("Hero subject", layers.subjects),
    layerActionHint("On-image text", layers.onImageText),
    layerActionHint("Mood/light", layers.moodLighting),
    layerActionHint("Staging pose", layers.stagingPose),
  ].filter(Boolean) as string[];
  parts.push(...layerHints);
  parts.push(LAYOUT_TRANSFER_TAIL);
  parts.push(
    "Avoid real celebrity likenesses — use original characters or the user's product only.",
  );
  return parts.join(" ");
}

/** Teaching carousel: topic + palette + typography mood — not layout clone. */
export function userReferenceStyleOnlyPromptBlock(brief: UserReferenceBrief): string {
  const parts = [`${USER_REFERENCE_STYLE_ONLY_MARKER}:`];
  if (brief.userConceptIdea) parts.push(`User idea: ${brief.userConceptIdea}`);
  if (brief.userHeadline && brief.userHeadline !== brief.userConceptIdea) {
    parts.push(`User headline: ${brief.userHeadline}`);
  }
  if (brief.userSubline) parts.push(`User points: ${brief.userSubline}`);
  if (brief.topic) parts.push(`Topic: ${brief.topic}`);
  if (brief.contentSummary && brief.contentSummary !== brief.topic) {
    parts.push(`Content lane: ${brief.contentSummary}`);
  }
  if (brief.visibleText) {
    parts.push(
      "Reference had on-image text — rephrase themes only in the user's target script; never copy wording or character forms from the reference.",
    );
  }
  if (brief.contentType) parts.push(`Format: ${brief.contentType}`);
  if (brief.layoutStyle) {
    parts.push(`Layout inspiration (vary every slide): ${brief.layoutStyle}`);
  }
  if (brief.colorPalette) parts.push(`Colors: ${brief.colorPalette}`);
  if (brief.typographyStyle) parts.push(`Typography: ${brief.typographyStyle}`);
  if (brief.mood) parts.push(`Mood: ${brief.mood}`);
  if (brief.carouselSlides?.length) {
    parts.push(carouselSlidesPlannerBlock(brief.carouselSlides).replace(/\n/g, " | "));
  }
  parts.push(STYLE_ONLY_TAIL);
  parts.push(
    "Avoid real celebrity likenesses — use original characters representing similar roles.",
  );
  return parts.join(" ");
}

/** Convert a full reference extra string (from vision analysis) to style-only for carousels. */
export function toStyleOnlyReferenceExtra(fullExtra: string): string {
  if (
    !fullExtra.includes(USER_REFERENCE_MARKER) &&
    !fullExtra.includes(USER_REFERENCE_STYLE_ONLY_MARKER)
  ) {
    return fullExtra;
  }
  let s = fullExtra
    .replace(USER_REFERENCE_MARKER, USER_REFERENCE_STYLE_ONLY_MARKER)
    .replace(CLONE_TAIL, STYLE_ONLY_TAIL)
    .replace(/^Subjects:.*$/m, "Subject themes (original characters, same roles):")
    .replace(/^On-image text to preserve:/m, "Reference text themes (rephrase per slide):");
  if (!s.includes(STYLE_ONLY_TAIL)) {
    s = `${s} ${STYLE_ONLY_TAIL}`;
  }
  if (!s.includes("original characters")) {
    s = `${s} Avoid real celebrity likenesses — use original characters.`;
  }
  return s.trim();
}

export function isStyleOnlyReferenceExtra(extra: string | undefined): boolean {
  return Boolean(extra?.includes(USER_REFERENCE_STYLE_ONLY_MARKER));
}

export function isLayoutTransferReferenceExtra(extra: string | undefined): boolean {
  return Boolean(extra?.includes(USER_REFERENCE_LAYOUT_TRANSFER_MARKER));
}

export function mergeUserReferenceBrief(
  fromVision: UserReferenceBrief,
  fromText: UserReferenceBrief | null,
): UserReferenceBrief {
  if (!fromText) return fromVision;
  return {
    ...fromVision,
    userConceptIdea: fromText.userConceptIdea || fromVision.userConceptIdea,
    userHeadline: fromText.userHeadline || fromVision.userHeadline,
    userSubline: fromText.userSubline || fromVision.userSubline,
    topic: fromText.topic || fromVision.topic,
  };
}

/** After vision analysis — force product-centric topic when ref came from content research. */
export function overrideBriefForContentResearch(
  brief: UserReferenceBrief,
  userInputs: {
    product?: string;
    headline?: string;
    subline?: string;
    conceptIdea?: string;
  },
): UserReferenceBrief {
  const product =
    userInputs.product?.trim() ||
    userInputs.headline?.trim() ||
    brief.userHeadline?.trim() ||
    "";
  if (!product) return brief;
  const headline = userInputs.headline?.trim() || brief.userHeadline;
  const subline = userInputs.subline?.trim() || brief.userSubline;
  return {
    ...brief,
    topic: product,
    contentSummary:
      [headline, subline].filter(Boolean).join(". ") ||
      userInputs.conceptIdea?.trim() ||
      product,
    visibleText: "",
    subjects: brief.subjects
      ? `Reference subjects (DO NOT reproduce): ${brief.subjects}`
      : "",
    userConceptIdea: userInputs.conceptIdea?.trim() || brief.userConceptIdea,
    userHeadline: headline,
    userSubline: subline,
  };
}
