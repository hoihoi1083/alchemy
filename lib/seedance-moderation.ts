/**
 * Seedance (fal) often rejects prompts/images with combat framing.
 * Soften language before API calls; keep PSA / mecha metaphors without violence triggers.
 */

const PROMPT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/weapons?\s+lowered/gi, "arms resting peacefully at sides"],
  [/with (?:their )?weapons?\s+lowered/gi, "with arms resting at sides"],
  [/all mecha have their weapons lowered/gi, "all mecha figures rest with arms at sides"],
  [/weapons?/gi, "mechanical arms"],
  [/opponents?/gi, "other figures"],
  [/standoff/gi, "peaceful pause"],
  [/\bbattle\b/gi, "scene"],
  [/\bfight(?:ing|s)?\b/gi, "tension"],
  [/combat/gi, "dramatic moment"],
  [/\bwar\b/gi, "dramatic"],
  [/attack(?:ing|s)?/gi, "approaching"],
  [/violence/gi, "conflict"],
  [/no motion or battle/gi, "calm stillness"],
  [/facing ten opponent/gi, "facing a group of ten"],
];

/** Terms that often trigger fal "sensitive content" on output. */
export const SEEDANCE_SENSITIVE_TERMS = [
  "weapon",
  "gun",
  "sword",
  "rifle",
  "battle",
  "fight",
  "combat",
  "war",
  "opponent",
  "standoff",
  "kill",
  "attack",
  "violence",
] as const;

export function softenSeedancePromptForModeration(prompt: string): string {
  let out = prompt.trim();
  for (const [pattern, replacement] of PROMPT_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function isSeedanceSensitiveError(message: string): boolean {
  return /sensitive content/i.test(message);
}

export function isFalContentPolicyError(message: string): boolean {
  return /content_policy_violation|likenesses of real people|private information that cannot be processed|partner_validation_failed/i.test(
    message,
  );
}

/** Also inspect ValidationError fieldErrors / body (fal often puts the real reason there). */
export function isFalContentPolicyThrowable(e: unknown, formattedMessage?: string): boolean {
  if (formattedMessage && isFalContentPolicyError(formattedMessage)) return true;
  if (e instanceof Error && isFalContentPolicyError(e.message)) return true;
  try {
    if (e && typeof e === "object") {
      const blob = JSON.stringify(
        "fieldErrors" in e
          ? (e as { fieldErrors: unknown }).fieldErrors
          : "body" in e
            ? (e as { body: unknown }).body
            : e,
      );
      if (blob && isFalContentPolicyError(blob)) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Seedance reference-to-video often rejects photoreal faces.
 * Bake into storyboard planning + still prompts so concept stills can become video.
 */
export const SEEDANCE_SAFE_STILL_RULES = [
  "SEEDANCE VIDEO SAFETY (mandatory — stills will be fed to Seedance reference-to-video):",
  "NO photorealistic human faces, celebrity likenesses, or identifiable people.",
  "Prefer: product/UI/dashboard mockups, icons, charts, hands-only (wrists/hands, face out of frame), back-of-head/silhouette, abstract graphics, illustrated/3D characters (not photo-real faces).",
  "Office/lifestyle scenes: show screens, desks, devices — not a clear face looking at camera.",
] as const;

export function seedanceSafeStillPromptClause(): string {
  return [
    "SEEDANCE-SAFE STILL: no photorealistic faces or identifiable people.",
    "Hands-only / product / UI / silhouette / illustrated characters OK — face never clear.",
  ].join(" ");
}

/** Concept beauty/spa stills: people OK mid-shot; Seedance/Kling often accept soft faces. */
export function conceptServiceStillSafetyClause(): string {
  return [
    "Service still safety: mid-shot commercial framing preferred.",
    "People (guest/therapist) OK — avoid extreme face fill-frame or skin-macro close-ups that trip content filters.",
  ].join(" ");
}

export function seedanceSafePlannerRules(): string[] {
  return [...SEEDANCE_SAFE_STILL_RULES];
}

/**
 * True only for spa / facial / beauty-service briefs.
 * Bare product nouns (massage gun, towel warmer, serum bottle) must NOT match.
 */
export function looksLikeSpaOrBeautyBrief(...samples: (string | undefined)[]): boolean {
  const joined = samples.filter(Boolean).join("\n").toLowerCase();
  if (!joined.trim()) return false;
  if (
    /\bspa\b|facial\b|skincare|esthetician|aesthetician|treatment\s+bed|rejuvenat|美容院|水療|護膚|面部護理/i.test(
      joined,
    )
  ) {
    return true;
  }
  if (
    /\b(facial\s+)?massage\s+(therapy|treatment|oil|room|table)\b|\bspa\s+massage\b/i.test(
      joined,
    )
  ) {
    return true;
  }
  if (
    /\bfacial\s+serum\b|\bskincare\s+serum\b|\bserum\s+ritual\b|\bapplying\s+(?:a\s+)?serum\b/i.test(
      joined,
    )
  ) {
    return true;
  }
  if (/\bspa\s+towel\b|\btowel[- ]wrapped\b|\bwarm\s+(?:spa\s+)?towel\b/i.test(joined)) {
    return true;
  }
  return false;
}

/** Industry-neutral face/close-up softens — never invent spa guest / spa room. */
const NEUTRAL_STILL_SOFTEN: Array<[RegExp, string]> = [
  [
    /close-?up of (?:a |the )?(?:calm )?face[^.!]*/gi,
    "tasteful mid-shot of the subject (face soft, not fill-frame)",
  ],
  [/close-?up (?:of )?(?:the )?face[^.!]*/gi, "mid-shot, face not filling the frame"],
  [/steam rising (?:around|on|from) (?:the )?face/gi, "soft atmospheric steam in the scene"],
  [/hands applying gentle massage on temples/gi, "hands near the subject (mid-shot, face soft)"],
  [/massage on temples/gi, "hands near temples (mid-shot)"],
  [/bare skin extreme/gi, "tasteful commercial beauty mood"],
  [/visible discount sign/gi, "small wooden price card on the table"],
  [/\bnatural skin\b/gi, "natural materials and soft light"],
];

/** Spa/beauty-service only — keep people, drop extreme mask/skin close-up language. */
const SPA_BEAUTY_STILL_SOFTEN: Array<[RegExp, string]> = [
  [
    /close-?up of (?:a |the )?(?:calm )?face[^.!]*/gi,
    "tasteful mid-shot of spa guest (face soft, not fill-frame)",
  ],
  [/close-?up (?:of )?(?:the )?face[^.!]*/gi, "mid-shot spa atmosphere, face not filling the frame"],
  [
    /steam rising (?:around|on|from) (?:the )?face/gi,
    "soft steam rising from a ceramic spa bowl beside the guest",
  ],
  [
    /hands applying gentle massage on temples/gi,
    "therapist adjusting a warm spa towel (mid-shot, faces soft)",
  ],
  [/massage on temples/gi, "therapist hands gently near towel-wrapped guest (mid-shot)"],
  [/bare skin extreme/gi, "tasteful spa skincare mood"],
  [
    /client lying on (?:a |the )?treatment bed with (?:a )?facial mask[^.|]*/gi,
    "mid-shot: therapist applying a facial treatment to a guest reclining on the spa bed in a robe — calm commercial beauty ad, soft light, faces visible but not extreme close-up",
  ],
  [
    /person lying on (?:a |the )?treatment bed with (?:a )?facial mask[^.|]*/gi,
    "mid-shot spa facial treatment in progress — guest and therapist, tasteful framing",
  ],
  [
    /client lying on (?:a |the )?treatment bed[^.|]*/gi,
    "guest reclining on spa treatment bed in a robe, mid-shot with therapist nearby",
  ],
  [
    /lying on (?:a |the )?(?:treatment )?bed with (?:a )?facial mask[^.|]*/gi,
    "spa facial treatment mid-shot with guest and therapist",
  ],
  [
    /esthetician applying (?:a )?serum[^.|]*/gi,
    "therapist applying serum during a facial — mid-shot, commercial beauty ad",
  ],
  [
    /aesthetician applying (?:a )?serum[^.|]*/gi,
    "therapist applying serum during a facial — mid-shot, commercial beauty ad",
  ],
  [
    /esthetician applying (?:a )?facial mask[^.|]*/gi,
    "therapist applying a facial treatment — mid-shot of guest and therapist",
  ],
  [/治療師為客人敷面膜[^.|]*/gi, "therapist applying facial treatment to guest, mid-shot"],
  [/客人放鬆閉眼/gi, "guest relaxing with eyes gently closed"],
];

/**
 * Soften still prompts that commonly trip Nano Banana content policy.
 * Spa lexicon only when the brief is actually spa/beauty — jewelry/coffee/etc. stay industry-neutral.
 */
export function softenStoryboardStillPromptForModeration(
  prompt: string,
  opts?: { spaBeautyBrief?: boolean },
): string {
  let out = prompt.trim();
  const spa = opts?.spaBeautyBrief ?? looksLikeSpaOrBeautyBrief(out);
  const list = spa
    ? [
        ...SPA_BEAUTY_STILL_SOFTEN,
        [/visible discount sign/gi, "small wooden price card on the table"] as [
          RegExp,
          string,
        ],
        [/\bnatural skin\b/gi, "natural materials and soft light"] as [RegExp, string],
      ]
    : NEUTRAL_STILL_SOFTEN;
  for (const [pattern, replacement] of list) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Same storyboard cell, safer wording — keep SKU / role / theme.
 * Never invent a different industry (no spa swap).
 */
export function saferSameSceneStillPrompt(vars: {
  originalPrompt: string;
  role?: string;
  theme?: string;
  productName?: string;
}): string {
  const spaBeautyBrief = looksLikeSpaOrBeautyBrief(
    vars.originalPrompt,
    vars.productName,
    vars.theme,
  );
  const softened = softenStoryboardStillPromptForModeration(vars.originalPrompt, {
    spaBeautyBrief,
  });
  const subject =
    vars.productName?.trim() || vars.theme?.trim() || "";
  return [
    softened,
    subject
      ? `Keep the same subject/category: ${subject}. Do not change product type or invent another industry.`
      : "",
    vars.role?.trim() ? `Keep this storyboard beat/role: ${vars.role.trim()}.` : "",
    "SAFETY RETRY: no photorealistic faces, no identifiable people, no celebrity likeness.",
    "No logos, trademarks, readable text, or watermarks.",
    "No extreme skin close-ups. Hands, product, packaging, and environment OK.",
    "Commercial photography of the SAME scene — not a spa, clinic, or unrelated stock set.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Ultra-safe still when a REAL spa/beauty scene still trips fal after safer retry. */
export function spaSafeStillFallbackPrompt(vars: {
  theme?: string;
  role?: string;
  marketHint?: string;
}): string {
  const theme = vars.theme?.trim() || "premium facial spa";
  return [
    `Photorealistic 9:16 spa marketing still for ${theme}.`,
    vars.role ? `Beat: ${vars.role}.` : "",
    "Show a serene spa treatment in progress OR empty spa room: white towels, wood tray, plants, soft daylight.",
    "If people appear: mid-shot only, tasteful commercial beauty ad — no extreme face/skin fill-frame.",
    "Cinematic commercial photography, warm wood tones, shallow depth of field.",
    "ZERO readable text, logos, or watermarks.",
    vars.marketHint ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const STORYBOARD_CELL_BLOCKED_PREFIX = "STORYBOARD_CELL_BLOCKED";

export function storyboardCellBlockedMessage(imageIndex: number): string {
  return `${STORYBOARD_CELL_BLOCKED_PREFIX}: Scene ${imageIndex} was blocked by the safety filter. Tap regen on this cell — same product, no faces, no brand text.`;
}

export function seedanceModerationPlannerRules(): string[] {
  return [
    "SEEDANCE MODERATION (critical): videoPrompt must pass fal safety filters.",
    "NEVER use in videoPrompt: weapon, gun, sword, rifle, fight, fighting, battle, combat, war, opponent, standoff, attack, kill, violence.",
    "For anti-violence / PSA concepts: use peaceful gathering, calm pause, figures at rest, arms at sides, gentle atmosphere, reconciliation, community, soft blue light.",
    "Mecha scenes: stylized robot figures in calm poses — no combat framing, no raised arms, no explosions.",
    "Prefer: one robot figure facing a circle of other robot silhouettes, all still, rain, cool blue light, slow camera push-in.",
  ];
}
