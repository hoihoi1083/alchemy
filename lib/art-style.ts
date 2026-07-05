/** Visual art direction for Nano Banana keyframes — Seedance animates this look. */
export type ArtStyleId =
  | "realistic"
  | "anime-2d"
  | "cartoon-3d"
  | "comic-webtoon"
  | "watercolor";

export const ART_STYLE_IDS: ArtStyleId[] = [
  "realistic",
  "anime-2d",
  "cartoon-3d",
  "comic-webtoon",
  "watercolor",
];

export const DEFAULT_ART_STYLE: ArtStyleId = "realistic";

export type ArtStyleDef = {
  id: ArtStyleId;
  icon: string;
  /** Core look clause for Nano Banana image prompts. */
  imageClause: string;
  /** Storyboard series opener. */
  storyboardLead: string;
  /** Cinematic still guard appended to planner imagePrompt. */
  cinematicGuard: string;
  /** DeepSeek planner system hint. */
  plannerHint: string;
  /** Short Seedance motion hint — preserve look, not redraw style. */
  seedanceHint: string;
  /** Terms to strip from template negative prompt when stylized. */
  stripNegativeTerms: string[];
  /** Extra negative terms for stylized looks. */
  negativeAdditions: string;
};

const ART_STYLES: Record<ArtStyleId, ArtStyleDef> = {
  realistic: {
    id: "realistic",
    icon: "📷",
    imageClause: "Photorealistic commercial photography, natural skin and materials, realistic lighting.",
    storyboardLead: "photorealistic product video",
    cinematicGuard:
      "Photorealistic cinematic movie still, live-action scene, shallow depth of field, rich atmosphere. " +
      "NOT a marketing poster, NOT an infographic, NOT a flyer, NOT a product ad layout. " +
      "NO on-screen text, NO headlines, NO bullet points, NO logos, NO watermarks, NO typography overlays.",
    plannerHint:
      "Art direction: photorealistic live-action commercial / cinematic photography. Natural materials and lighting.",
    seedanceHint: "Preserve photorealistic look; locked camera, minimal morphing.",
    stripNegativeTerms: [],
    negativeAdditions: "",
  },
  "anime-2d": {
    id: "anime-2d",
    icon: "🎌",
    imageClause:
      "Japanese anime style, 2D cel-shaded illustration, clean linework, vibrant colors, consistent character design, anime background art.",
    storyboardLead: "anime-style 2D cel-shaded illustrated product video",
    cinematicGuard:
      "Anime-style cinematic scene still, 2D cel shading, clean outlines, vibrant palette, NOT photorealistic live-action. " +
      "NOT a marketing poster or infographic. NO on-screen text, NO logos, NO watermarks, NO typography overlays.",
    plannerHint:
      "Art direction: Japanese anime / 2D cel-shaded illustration — consistent character design, clean linework, NOT photorealistic.",
    seedanceHint:
      "Keep 2D anime cel-shaded illustration style; subtle motion only; do not morph toward photorealistic.",
    stripNegativeTerms: ["cartoon"],
    negativeAdditions: "photorealistic, live-action, DSLR photo, hyperrealistic skin, uncanny valley",
  },
  "cartoon-3d": {
    id: "cartoon-3d",
    icon: "🧸",
    imageClause:
      "3D animated Pixar-style render, soft global illumination, stylized friendly proportions, smooth surfaces, cinematic 3D cartoon look.",
    storyboardLead: "3D animated Pixar-style product video",
    cinematicGuard:
      "3D animated cinematic still, Pixar-style render, soft lighting, stylized characters, NOT photorealistic live-action. " +
      "NOT a marketing poster. NO on-screen text, NO logos, NO watermarks.",
    plannerHint:
      "Art direction: 3D animated / Pixar-style CGI — soft global illumination, stylized proportions, NOT photorealistic.",
    seedanceHint:
      "Keep 3D animated Pixar-style look; gentle motion; do not morph toward photorealistic.",
    stripNegativeTerms: ["cartoon"],
    negativeAdditions: "photorealistic, live-action, DSLR, hyperrealistic skin, uncanny valley",
  },
  "comic-webtoon": {
    id: "comic-webtoon",
    icon: "💬",
    imageClause:
      "Korean webtoon / comic book style, bold clean outlines, flat cel shading, expressive characters, feed-friendly illustration.",
    storyboardLead: "webtoon / comic-style illustrated product video",
    cinematicGuard:
      "Webtoon or graphic-novel style cinematic panel, bold outlines, flat cel shading, NOT photorealistic. " +
      "NOT a marketing poster layout. NO on-screen text blocks, NO logos, NO watermarks.",
    plannerHint:
      "Art direction: Korean webtoon or American comic illustration — bold outlines, flat cel shading, NOT photorealistic.",
    seedanceHint:
      "Keep webtoon/comic illustration style; subtle motion; preserve outlines and flat shading.",
    stripNegativeTerms: ["cartoon"],
    negativeAdditions: "photorealistic, live-action, DSLR photo, hyperrealistic skin",
  },
  watercolor: {
    id: "watercolor",
    icon: "🎨",
    imageClause:
      "Soft watercolor illustration, visible paper grain, wet-on-wet color bleeds, delicate linework, painterly soft edges, artistic hand-painted feel.",
    storyboardLead: "watercolor illustrated product video",
    cinematicGuard:
      "Watercolor illustration cinematic still, paper texture, painterly edges, NOT photorealistic photography. " +
      "NOT a marketing poster. NO on-screen text, NO logos, NO watermarks.",
    plannerHint:
      "Art direction: soft watercolor illustration — paper grain, painterly edges, NOT photorealistic photography.",
    seedanceHint:
      "Keep watercolor illustration style; very subtle motion; preserve painterly texture.",
    stripNegativeTerms: ["cartoon"],
    negativeAdditions: "photorealistic, live-action, DSLR, hyperrealistic skin, harsh CGI",
  },
};

export function isArtStyleId(value: string): value is ArtStyleId {
  return (ART_STYLE_IDS as string[]).includes(value);
}

export function getArtStyle(id: ArtStyleId): ArtStyleDef {
  return ART_STYLES[id] ?? ART_STYLES.realistic;
}

export function resolveArtStyleId(value: string | undefined | null): ArtStyleId {
  const v = value?.trim() ?? "";
  return isArtStyleId(v) ? v : DEFAULT_ART_STYLE;
}

export function artStyleImageClause(id: ArtStyleId | undefined): string {
  return getArtStyle(id ?? DEFAULT_ART_STYLE).imageClause;
}

/** Strong opener — entire frame including typography must use this medium (Nano Banana). */
export function artStyleMandatoryLead(id: ArtStyleId | undefined): string {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") return "";
  const style = getArtStyle(styleId);
  return (
    `MANDATORY RENDER MEDIUM: ${style.imageClause} ` +
    `The ENTIRE image — background, characters, props, icons, badges, AND all marketing typography — must be rendered in this medium. ` +
    `Do NOT use photorealistic photography, DSLR commercial shots, generic Canva template look, or plain 3D product visualization.`
  );
}

/** Concept-social HERO line — avoid "lifestyle photography" when stylized. */
export function artStyleConceptHeroHint(id: ArtStyleId | undefined): string {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") {
    return "HERO: lifestyle photography, metaphorical scene, or stylized editorial visual filling 60–70% of frame — match the concept mood.";
  }
  const hints: Record<Exclude<ArtStyleId, "realistic">, string> = {
    "anime-2d":
      "HERO: anime-style 2D illustrated scene filling 60–70% of frame — cel shading, clean linework, NOT photography.",
    "cartoon-3d":
      "HERO: Pixar-style 3D illustrated scene filling 60–70% of frame — soft CGI, stylized proportions, NOT live-action.",
    "comic-webtoon":
      "HERO: webtoon/comic illustrated panel filling 60–70% of frame — bold outlines, flat cel shading, NOT photography.",
    watercolor:
      "HERO: watercolor illustrated scene filling 60–70% of frame — paper grain, painterly edges, NOT photography.",
  };
  return hints[styleId];
}

/** Semantic negatives appended to Nano Banana prompt (no negative_prompt param). */
export function artStyleAvoidTail(id: ArtStyleId | undefined): string {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") return "";
  const style = getArtStyle(styleId);
  return (
    `Avoid: ${style.negativeAdditions}, photorealistic commercial photo, stock ad template, plain white studio backdrop, hyperrealistic skin, uncanny 3D product mockup.`
  );
}

/** Optional system_prompt for Nano Banana edit — steers global medium. */
export function artStyleSystemPrompt(id: ArtStyleId | undefined): string | undefined {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") return undefined;
  const style = getArtStyle(styleId);
  return (
    `Output ONLY ${style.imageClause} ` +
    `Never default to photorealistic photography or generic corporate marketing mockups. ` +
    `Typography and icons must match the illustration medium.`
  );
}

export function artStyleStoryboardLead(id: ArtStyleId | undefined): string {
  return getArtStyle(id ?? DEFAULT_ART_STYLE).storyboardLead;
}

export function artStylePlannerHint(id: ArtStyleId | undefined): string {
  return getArtStyle(id ?? DEFAULT_ART_STYLE).plannerHint;
}

export function artStyleSeedanceHint(id: ArtStyleId | undefined): string {
  const hint = getArtStyle(id ?? DEFAULT_ART_STYLE).seedanceHint;
  return id && id !== "realistic" ? hint : getArtStyle("realistic").seedanceHint;
}

/** Wrap cinematic scene imagePrompt with style guard (Nano Banana). */
export function guardCinematicImagePrompt(
  prompt: string,
  artStyleId: ArtStyleId = DEFAULT_ART_STYLE,
): string {
  const base = prompt.trim() || "Cinematic scene, dramatic lighting";
  const guard = getArtStyle(artStyleId).cinematicGuard;
  if (base.toLowerCase().includes("no on-screen text")) return `${base}. ${guard}`;
  return `${base}. ${guard}`;
}

/** Merge template negative prompt with art-style overrides. */
export function applyArtStyleNegative(base: string, artStyleId: ArtStyleId): string {
  if (artStyleId === "realistic") return base;
  const style = getArtStyle(artStyleId);
  let result = base;
  for (const term of style.stripNegativeTerms) {
    result = result.replace(new RegExp(`\\b${term}\\b`, "gi"), "");
  }
  result = result.replace(/,\s*,/g, ",").replace(/\s+,/g, ",").trim();
  if (style.negativeAdditions) {
    result = result ? `${result}, ${style.negativeAdditions}` : style.negativeAdditions;
  }
  return result;
}

/** Cinematic keyframe negative — typography guard + style-specific terms. */
export function cinematicSceneNegativePrompt(artStyleId: ArtStyleId): string {
  const base =
    "text, typography, headline, subtitle, bullet points, poster, infographic, flyer, logo, watermark, UI overlay, chart, diagram, marketing layout, slide deck";
  return applyArtStyleNegative(base, artStyleId);
}
