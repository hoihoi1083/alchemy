"use client";

import {
  DIRECTOR_PROMPT_CHIPS,
  insertDirectorPromptBlock,
  type DirectorPromptChipId,
} from "@/lib/pro-canvas-director-prompt";

type Props = {
  labels: Record<DirectorPromptChipId, string>;
  /** Short line under chips — what these buttons do. */
  hint?: string;
  onInsert: (nextPrompt: string) => void;
  prompt: string;
  disabled?: boolean;
};

export function DirectorPromptChips({
  labels,
  hint,
  onInsert,
  prompt,
  disabled = false,
}: Props) {
  return (
    <div
      className="nodrag nopan nowheel mt-2"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {hint ? (
        <p className="mb-1 text-[9px] leading-snug text-slate-500">{hint}</p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {DIRECTOR_PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            title={chip.block}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInsert(insertDirectorPromptBlock(prompt, chip.block));
            }}
            className="rounded-md border border-amber-500/30 bg-amber-950/25 px-2 py-0.5 text-[10px] font-medium text-amber-100/90 hover:bg-amber-950/45 disabled:opacity-40"
          >
            + {labels[chip.id] ?? chip.id}
          </button>
        ))}
      </div>
    </div>
  );
}
