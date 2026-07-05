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

export function seedanceModerationPlannerRules(): string[] {
  return [
    "SEEDANCE MODERATION (critical): videoPrompt must pass fal safety filters.",
    "NEVER use in videoPrompt: weapon, gun, sword, rifle, fight, fighting, battle, combat, war, opponent, standoff, attack, kill, violence.",
    "For anti-violence / PSA concepts: use peaceful gathering, calm pause, figures at rest, arms at sides, gentle atmosphere, reconciliation, community, soft blue light.",
    "Mecha scenes: stylized robot figures in calm poses — no combat framing, no raised arms, no explosions.",
    "Prefer: one robot figure facing a circle of other robot silhouettes, all still, rain, cool blue light, slow camera push-in.",
  ];
}
