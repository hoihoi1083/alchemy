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
 * Soften still prompts that commonly trip Nano Banana content policy.
 * Spa / beauty services ARE allowed — avoid extreme skin/mask close-ups, not people entirely.
 */
export function softenStoryboardStillPromptForModeration(prompt: string): string {
  let out = prompt.trim();
  const replacements: Array<[RegExp, string]> = [
    [/close-?up of (?:a |the )?(?:calm )?face[^.!]*/gi, "tasteful mid-shot of spa guest (face soft, not fill-frame)"],
    [/close-?up (?:of )?(?:the )?face[^.!]*/gi, "mid-shot spa atmosphere, face not filling the frame"],
    [/steam rising (?:around|on|from) (?:the )?face/gi, "soft steam rising from a ceramic spa bowl beside the guest"],
    [/massage on temples/gi, "therapist hands gently near towel-wrapped guest (mid-shot)"],
    [/hands applying gentle massage on temples/gi, "therapist adjusting a warm spa towel (mid-shot, faces soft)"],
    [/bare skin extreme/gi, "tasteful spa skincare mood"],
    // Treatment-bed facial: keep PEOPLE, drop extreme mask-on-skin close-up language
    [/client lying on (?:a |the )?treatment bed with (?:a )?facial mask[^.|]*/gi,
      "mid-shot: therapist applying a facial treatment to a guest reclining on the spa bed in a robe — calm commercial beauty ad, soft light, faces visible but not extreme close-up"],
    [/person lying on (?:a |the )?treatment bed with (?:a )?facial mask[^.|]*/gi,
      "mid-shot spa facial treatment in progress — guest and therapist, tasteful framing"],
    [/client lying on (?:a |the )?treatment bed[^.|]*/gi,
      "guest reclining on spa treatment bed in a robe, mid-shot with therapist nearby"],
    [/lying on (?:a |the )?(?:treatment )?bed with (?:a )?facial mask[^.|]*/gi,
      "spa facial treatment mid-shot with guest and therapist"],
    [/esthetician applying (?:a )?serum[^.|]*/gi,
      "therapist applying serum during a facial — mid-shot, commercial beauty ad"],
    [/aesthetician applying (?:a )?serum[^.|]*/gi,
      "therapist applying serum during a facial — mid-shot, commercial beauty ad"],
    [/esthetician applying (?:a )?facial mask[^.|]*/gi,
      "therapist applying a facial treatment — mid-shot of guest and therapist"],
    [/治療師為客人敷面膜[^.|]*/gi, "therapist applying facial treatment to guest, mid-shot"],
    [/客人放鬆閉眼/gi, "guest relaxing with eyes gently closed"],
    [/visible discount sign/gi, "small wooden price card on the table"],
    [/\bnatural skin\b/gi, "natural materials and soft light"],
  ];
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Ultra-safe still when a spa/beauty scene still trips fal after softening — room + props only. */
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

export function looksLikeSpaOrBeautyBrief(...samples: (string | undefined)[]): boolean {
  const joined = samples.filter(Boolean).join("\n").toLowerCase();
  return /spa|facial|skincare|esthetician|aesthetician|massage|treatment bed|serum|towel|rejuvenat/i.test(
    joined,
  );
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
