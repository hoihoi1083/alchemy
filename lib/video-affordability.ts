/**
 * Free grant is sized for 1 still + 8s 480p — not 12s MiniMax H3.
 * Before charging H3, offer Kling stitch when it fits and H3 does not.
 */

export const STORYBOARD_ENGINE_CHOICE_CODE = "STORYBOARD_ENGINE_CHOICE" as const;

export class StoryboardEngineChoiceError extends Error {
  readonly code = STORYBOARD_ENGINE_CHOICE_CODE;
  readonly balance: number;
  readonly h3Cost: number;
  readonly klingCost: number;

  constructor(opts: { balance: number; h3Cost: number; klingCost: number }) {
    super(
      "MiniMax H3 needs more tokens than your balance. Kling stitch fits now.",
    );
    this.name = "StoryboardEngineChoiceError";
    this.balance = opts.balance;
    this.h3Cost = opts.h3Cost;
    this.klingCost = opts.klingCost;
  }
}

export type StoryboardEnginePrefer = "h3" | "kling" | "seedance" | null;

export type StoryboardAffordDecision =
  | { action: "run-seedance" }
  | { action: "run-h3" }
  | { action: "run-kling" }
  | {
      action: "offer-kling";
      balance: number;
      h3Cost: number;
      klingCost: number;
    }
  | { action: "upgrade"; balance: number; required: number };

function canAfford(balance: number | null, cost: number): boolean {
  if (balance == null) return true;
  return balance >= cost;
}

export function evaluateStoryboardVideoAffordability(input: {
  /** null = billing off (dev) — run the requested engine. */
  balance: number | null;
  hasReel: boolean;
  allowKling: boolean;
  klingCanHitDuration: boolean;
  h3Cost: number;
  klingCost: number;
  seedanceCost: number;
  preferEngine?: StoryboardEnginePrefer;
  firstEngine: "seedance" | "minimax-h3";
}): StoryboardAffordDecision {
  const balance = input.balance;
  const klingReady =
    input.allowKling && input.klingCanHitDuration && !input.hasReel;

  if (input.hasReel) {
    if (input.firstEngine === "seedance") {
      if (canAfford(balance, input.seedanceCost)) return { action: "run-seedance" };
      if (canAfford(balance, input.h3Cost)) return { action: "run-h3" };
      if (balance == null) return { action: "run-seedance" };
      return {
        action: "upgrade",
        balance,
        required: Math.min(input.seedanceCost, input.h3Cost),
      };
    }
    if (canAfford(balance, input.h3Cost)) return { action: "run-h3" };
    if (balance == null) return { action: "run-h3" };
    return { action: "upgrade", balance, required: input.h3Cost };
  }

  if (input.preferEngine === "kling" && klingReady) {
    if (canAfford(balance, input.klingCost)) return { action: "run-kling" };
    if (balance == null) return { action: "run-kling" };
    return { action: "upgrade", balance, required: input.klingCost };
  }

  if (canAfford(balance, input.h3Cost)) return { action: "run-h3" };

  if (klingReady && balance != null && balance >= input.klingCost) {
    return {
      action: "offer-kling",
      balance,
      h3Cost: input.h3Cost,
      klingCost: input.klingCost,
    };
  }

  if (balance == null) return { action: "run-h3" };
  return { action: "upgrade", balance, required: input.h3Cost };
}

export function parsePreferEngine(
  raw: FormDataEntryValue | string | null | undefined,
): StoryboardEnginePrefer {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "kling" || v === "h3" || v === "seedance") return v;
  return null;
}
