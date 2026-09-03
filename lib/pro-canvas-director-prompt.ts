/** Director-style prompt blocks (TapNow / 专业导演 method). */

export type DirectorPromptChipId = "camera" | "lighting" | "beats";

export type DirectorPromptChip = {
  id: DirectorPromptChipId;
  block: string;
};

export const DIRECTOR_PROMPT_CHIPS: DirectorPromptChip[] = [
  {
    id: "camera",
    block:
      "[镜头语言] Locked tripod, shallow DOF, medium close-up. Slow push-in only — no orbit, no whip pan.",
  },
  {
    id: "lighting",
    block:
      "[光影] Soft window light + cool office fill. Natural skin texture, subtle shadows — photoreal, not plastic.",
  },
  {
    id: "beats",
    block:
      "[动作节拍] 0–2s: setup. 2–4s: micro reaction. 4–6s: main beat. 6–8s: settle. Minimal delta — no scene morph.",
  },
];

export function directorPromptChipBlock(id: DirectorPromptChipId): string {
  return DIRECTOR_PROMPT_CHIPS.find((c) => c.id === id)?.block ?? "";
}

/** Append a director block if its tag is not already present. */
export function insertDirectorPromptBlock(
  prompt: string,
  block: string,
): string {
  const tag = block.match(/^\[[^\]]+\]/)?.[0];
  if (tag && prompt.includes(tag)) return prompt;
  const trimmed = prompt.trim();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}
