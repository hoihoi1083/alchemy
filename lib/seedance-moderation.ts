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

export function seedanceSafePlannerRules(): string[] {
  return [...SEEDANCE_SAFE_STILL_RULES];
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
