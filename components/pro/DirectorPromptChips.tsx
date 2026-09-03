"use client";

import {
  DIRECTOR_PROMPT_CHIPS,
  insertDirectorPromptBlock,
  type DirectorPromptChipId,
} from "@/lib/pro-canvas-director-prompt";

type Props = {
  labels: Record<DirectorPromptChipId, string>;
  onInsert: (nextPrompt: string) => void;
  prompt: string;
  disabled?: boolean;
};

export function DirectorPromptChips({
  labels,
  onInsert,
  prompt,
  disabled = false,
}: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {DIRECTOR_PROMPT_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          disabled={disabled}
          onClick={() => onInsert(insertDirectorPromptBlock(prompt, chip.block))}
          className="rounded-md border border-amber-500/30 bg-amber-950/25 px-2 py-0.5 text-[10px] font-medium text-amber-100/90 hover:bg-amber-950/45 disabled:opacity-40"
        >
          + {labels[chip.id]}
        </button>
      ))}
    </div>
  );
}
