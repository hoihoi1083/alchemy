import {
  buildPromptVariables,
  buildWizardImagePrompt,
  resolveImagePromptMode,
} from "@/lib/prompt-variables";
import type { PromotionMode } from "@/lib/promotion-mode";
import { getVisualStyle, type VisualStyleId } from "@/lib/visual-styles";

export type GoldenPromptCase = {
  visualStyleId: VisualStyleId;
  promotionMode: PromotionMode;
  workflowMode: "image-only" | "combined";
  imageCreativeMode: "promo-ai" | "reference-concept";
  /** Substrings expected in the built English prompt (case-insensitive). */
  expectedInPrompt: string[];
  /** Substrings that must NOT appear (e.g. wrong topic). */
  mustNotContain?: string[];
};

export const GOLDEN_PROMPT_CASES: GoldenPromptCase[] = [
  {
    visualStyleId: "product",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["pink crystal bracelet", "social media", "9:16"],
    mustNotContain: ["水瓶座", "zodiac"],
  },
  {
    visualStyleId: "dark-premium",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["luxury", "dark", "premium"],
  },
  {
    visualStyleId: "warm-shop",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["warm", "shop", "inviting"],
  },
  {
    visualStyleId: "model-wear",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["lifestyle", "model", "wearing"],
  },
  {
    visualStyleId: "service-promo",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["service", "social ad"],
  },
  {
    visualStyleId: "info-poster",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["info poster"],
  },
  {
    visualStyleId: "pricing-offer",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["pricing", "offer"],
  },
  {
    visualStyleId: "website-launch",
    promotionMode: "physical",
    workflowMode: "image-only",
    imageCreativeMode: "promo-ai",
    expectedInPrompt: ["launch", "website"],
  },
];

const GOLDEN_VARS = {
  product: "Madagascar pink crystal bracelet",
  headline: "Pink crystal bracelet | gentle energy",
  subline: "Daily wear recommendation",
  market: "en" as const,
  framing: "auto" as const,
  extra:
    "Style reference (Xiaohongshu). Borrow ONLY layout rhythm and palette. All copy about Madagascar pink crystal bracelet. Do NOT copy reference subject matter.",
};

export type GoldenPromptResult = {
  visualStyleId: VisualStyleId;
  mode: string;
  prompt: string;
  missing: string[];
  forbidden: string[];
  pass: boolean;
};

/** Derive 2–3 hint keywords from visual style definition (sanity check). */
export function hintKeywordsForStyle(id: VisualStyleId): string[] {
  const hint = getVisualStyle(id).promptHint.toLowerCase();
  if (!hint) return [];
  const tokens = hint
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return [...new Set(tokens)].slice(0, 3);
}

export function evaluateGoldenPrompts(): GoldenPromptResult[] {
  return GOLDEN_PROMPT_CASES.map((c) => {
    const vars = buildPromptVariables({
      product: GOLDEN_VARS.product,
      headline: GOLDEN_VARS.headline,
      subline: GOLDEN_VARS.subline,
      market: GOLDEN_VARS.market,
      framing: GOLDEN_VARS.framing,
      extra: GOLDEN_VARS.extra,
    });
    const mode = resolveImagePromptMode(c.visualStyleId, c.imageCreativeMode, {
      promotionMode: c.promotionMode,
      workflowMode: c.workflowMode,
    });
    const prompt = buildWizardImagePrompt(vars, mode, null, c.visualStyleId);
    const lower = prompt.toLowerCase();
    const missing = c.expectedInPrompt.filter((kw) => !lower.includes(kw.toLowerCase()));
    const forbidden = (c.mustNotContain ?? []).filter((kw) =>
      lower.includes(kw.toLowerCase()),
    );
    return {
      visualStyleId: c.visualStyleId,
      mode,
      prompt: prompt.slice(0, 240),
      missing,
      forbidden,
      pass: missing.length === 0 && forbidden.length === 0,
    };
  });
}
