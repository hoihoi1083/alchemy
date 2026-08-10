/** Visual art direction for Nano Banana keyframes — Seedance animates this look. */
export type ArtStyleId =
  | "realistic"
  | "cinematic"
  | "film"
  | "ccd"
  | "guofeng"
  | "anime-2d"
  | "cartoon-3d"
  | "comic-webtoon"
  | "watercolor";

export const ART_STYLE_IDS: ArtStyleId[] = [
  "realistic",
  "cinematic",
  "film",
  "ccd",
  "guofeng",
  "anime-2d",
  "cartoon-3d",
  "comic-webtoon",
  "watercolor",
];

/** Tier-1 looks safe to offer on video / Seedance (grade only — never new plot). */
export const VIDEO_SAFE_ART_STYLE_IDS: ArtStyleId[] = [
  "realistic",
  "cinematic",
  "film",
  "ccd",
  "guofeng",
];

export const DEFAULT_ART_STYLE: ArtStyleId = "realistic";

export type ArtStyleDef = {
  id: ArtStyleId;
  icon: string;
  /** Square preview thumbnail for style pickers. */
  previewSrc: string;
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
  /**
   * When true, safe as a video grade on Seedance/Kling after stills match.
   * Illustration styles stay image/storyboard-first unless stills already painted.
   */
  videoSafe: boolean;
};

const ART_STYLES: Record<ArtStyleId, ArtStyleDef> = {
  realistic: {
    id: "realistic",
    icon: "📷",
    previewSrc: "/images/studio/art-styles/realistic.png?v=2",
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
    videoSafe: true,
  },
  cinematic: {
    id: "cinematic",
    icon: "🎥",
    previewSrc: "/images/studio/art-styles/cinematic.png?v=2",
    imageClause:
      "Cinematic commercial photography, ARRI-like contrast, shallow depth of field, controlled rim light, premium TVC atmosphere.",
    storyboardLead: "cinematic TVC product video",
    cinematicGuard:
      "Cinematic movie still, controlled lighting, shallow DOF, premium commercial atmosphere. " +
      "NOT a flat poster or infographic. NO on-screen text, logos, or watermarks.",
    plannerHint:
      "Art direction: cinematic TVC photography — controlled key/rim light, shallow DOF, premium commercial grade.",
    seedanceHint:
      "Preserve cinematic lighting and contrast; subtle camera energy; do not flatten into a poster look.",
    stripNegativeTerms: [],
    negativeAdditions: "flat lighting, harsh flash, plastic CGI, oversharpened",
    videoSafe: true,
  },
  film: {
    id: "film",
    icon: "🎞",
    previewSrc: "/images/studio/art-styles/film.png?v=2",
    imageClause:
      "Analog film photography look, fine grain, soft halation, muted highlights, nostalgic color science.",
    storyboardLead: "film-grain product video",
    cinematicGuard:
      "Film still with visible grain and soft halation, nostalgic color grade. NOT digital plastic CGI. NO on-screen text or logos.",
    plannerHint:
      "Art direction: analog film look — grain, soft highlights, nostalgic grade. Photoreal base with film character.",
    seedanceHint:
      "Preserve film grain and soft analog grade; minimal morphing; do not clean into sterile digital CGI.",
    stripNegativeTerms: [],
    negativeAdditions: "sterile digital CGI, plastic skin, HDR crunch",
    videoSafe: true,
  },
  ccd: {
    id: "ccd",
    icon: "📱",
    previewSrc: "/images/studio/art-styles/ccd.png?v=2",
    imageClause:
      "Early digital CCD camera aesthetic, slight flash, cool-warm color cast, candid social snapshot energy, soft sensor noise.",
    storyboardLead: "CCD snapshot product video",
    cinematicGuard:
      "CCD / early-digital snapshot still, soft flash character, candid energy. NOT glossy studio CGI. NO on-screen text or logos.",
    plannerHint:
      "Art direction: CCD / early digital snapshot — soft flash, candid social energy, slight sensor noise.",
    seedanceHint:
      "Preserve CCD snapshot grade and soft flash character; subtle motion; do not polish into premium studio CGI.",
    stripNegativeTerms: [],
    negativeAdditions: "ultra-clean studio CGI, plastic perfection",
    videoSafe: true,
  },
  guofeng: {
    id: "guofeng",
    icon: "🏯",
    previewSrc: "/images/studio/art-styles/guofeng.png?v=2",
    imageClause:
      "Chinese 国风 cinematic mood, soft Tyndall light, ink-wash atmosphere accents, elegant traditional palette, photoreal base with poetic environment.",
    storyboardLead: "国风 cinematic product video",
    cinematicGuard:
      "国风 cinematic still — Tyndall forest/mist mood, elegant traditional palette, photoreal product in poetic environment. NO on-screen text or logos.",
    plannerHint:
      "Art direction: 国风 cinematic — soft Tyndall light, ink-wash atmosphere, elegant traditional palette on a photoreal base.",
    seedanceHint:
      "Preserve 国风 atmosphere and soft Tyndall light; gentle env motion; do not turn into mural illustration unless stills already are.",
    stripNegativeTerms: [],
    negativeAdditions: "neon cyberpunk, plastic CGI, western stock studio",
    videoSafe: true,
  },
  "anime-2d": {
    id: "anime-2d",
    icon: "🎌",
    previewSrc: "/images/studio/art-styles/anime-2d.png?v=2",
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
    videoSafe: false,
  },
  "cartoon-3d": {
    id: "cartoon-3d",
    icon: "🧸",
    previewSrc: "/images/studio/art-styles/cartoon-3d.png?v=2",
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
    videoSafe: false,
  },
  "comic-webtoon": {
    id: "comic-webtoon",
    icon: "💬",
    previewSrc: "/images/studio/art-styles/comic-webtoon.png?v=2",
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
    videoSafe: false,
  },
  watercolor: {
    id: "watercolor",
    icon: "🎨",
    previewSrc: "/images/studio/art-styles/watercolor.png?v=2",
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
    videoSafe: false,
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
export function artStyleMandatoryLead(
  id: ArtStyleId | undefined,
  opts?: { textless?: boolean },
): string {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") return "";
  const style = getArtStyle(styleId);
  const scope = opts?.textless
    ? `The ENTIRE image — background, characters, and props — must be rendered in this medium. No written characters. `
    : `The ENTIRE image — background, characters, props, icons, badges, AND all marketing typography — must be rendered in this medium. `;
  return (
    `MANDATORY RENDER MEDIUM: ${style.imageClause} ` +
    scope +
    `Do NOT use photorealistic photography, DSLR commercial shots, generic Canva template look, or plain 3D product visualization.`
  );
}

/**
 * Concept + 寫實 — light photoreal bias only.
 * Do NOT ban creative metaphors (robots, mascots, stylized scenes) when the
 * concept brief / assistant plan asks for them — creative concept is intentional.
 */
export function artStylePhotorealConceptLock(id: ArtStyleId | undefined): string {
  if (resolveArtStyleId(id) !== "realistic") return "";
  // Empty on purpose: hard anti-robot / desk-only locks fought the concept assistant
  // when visualMetaphor asked for creative scenes. Art style clause still steers 寫實.
  return "";
}

/** Concept-social HERO line — avoid "lifestyle photography" when stylized. */
export function artStyleConceptHeroHint(id: ArtStyleId | undefined): string {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") {
    return "HERO: lifestyle photography, metaphorical scene, or stylized editorial visual filling 60–70% of frame — match the concept mood and the planned visual metaphor.";
  }
  const hints: Record<Exclude<ArtStyleId, "realistic">, string> = {
    cinematic:
      "HERO: cinematic TVC photography filling 60–70% of frame — controlled rim light, shallow DOF.",
    film:
      "HERO: analog film photography filling 60–70% of frame — grain, soft halation, nostalgic grade.",
    ccd:
      "HERO: CCD snapshot aesthetic filling 60–70% of frame — soft flash, candid social energy.",
    guofeng:
      "HERO: 国风 cinematic mood filling 60–70% of frame — Tyndall light, poetic environment, photoreal product.",
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
export function artStyleSystemPrompt(
  id: ArtStyleId | undefined,
  opts?: { textless?: boolean },
): string | undefined {
  const styleId = id ?? DEFAULT_ART_STYLE;
  if (styleId === "realistic") {
    return opts?.textless
      ? "Photoreal scene only. No written characters in any language. No title bars, captions, logos, or buttons."
      : undefined;
  }
  const style = getArtStyle(styleId);
  if (opts?.textless) {
    return (
      `Output ONLY ${style.imageClause} ` +
      `Atmosphere and subjects only. No written characters in any language. Typography is added later.`
    );
  }
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

/** Append stylized motion guard when DeepSeek plan omitted art-style hint. */
export function appendArtStyleSeedanceHintIfNeeded(
  prompt: string,
  artStyleId: ArtStyleId | undefined,
  opts?: { skip?: boolean },
): string {
  const p = prompt.trim();
  if (opts?.skip) return p;
  const id = resolveArtStyleId(artStyleId);
  if (id === "realistic") return p;
  const hasVideo1 = /@\s*Video\s*1\b/i.test(p) || /\bVideo\s+1\b/i.test(p);
  // R2V: never glue illustration styles. Video-safe grades (film/CCD/国风/cinematic)
  // apply only when the user explicitly picked them — grade only, not a new plot.
  if (hasVideo1 && !isVideoSafeArtStyle(id)) return p;
  const hint = artStyleSeedanceHint(id);
  if (!hint) return p;
  if (!p) return hint;
  const key = hint.slice(0, 28).toLowerCase();
  if (p.toLowerCase().includes(key)) return p;
  return `${p} ${hint}`;
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

export function isVideoSafeArtStyle(id: ArtStyleId | undefined): boolean {
  return getArtStyle(id ?? DEFAULT_ART_STYLE).videoSafe;
}

export function artStyleIdsForPicker(opts?: { videoSafeOnly?: boolean }): ArtStyleId[] {
  if (opts?.videoSafeOnly) return VIDEO_SAFE_ART_STYLE_IDS;
  return ART_STYLE_IDS;
}
