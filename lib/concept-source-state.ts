import { stripContentResearchStyleExtra } from "@/lib/content-research-promote";
import type { ConceptSource } from "@/lib/wizard-micro-steps.types";

export type { ConceptSource };

/** Remove concept-assistant-only promptExtra fragments (audience / visual metaphor). */
export function stripConceptAssistantPromptExtra(extra: string): string {
  return extra
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      if (part.startsWith("Target audience:")) return false;
      if (part.startsWith("Visual metaphor and scene direction:")) return false;
      return true;
    })
    .join(" | ");
}

export type ConceptSourceWizardApi = {
  setImageRefPhoto: (file: File | null) => void;
  setImageCreativeMode: (mode: "promo-ai" | "reference-concept") => void;
  setExtraKitPhotos: (files: File[]) => void;
  setContentResearchApplyRef: (ref: null) => void;
  setUserReferenceBrief: (brief: null) => void;
  setReferenceAnalyzeNote?: (note: null) => void;
  setPromptExtra: (value: string | ((prev: string) => string)) => void;
  setCreativeVideoBrief: (value: string) => void;
  setHeadline: (value: string) => void;
  setSubline: (value: string) => void;
  setOffer: (value: string) => void;
  onReferenceAdFile: (file: File | null) => void;
};

/** User chose 概念助手 — drop platform-research reference state. */
export function clearConceptResearchState(wizard: ConceptSourceWizardApi): void {
  wizard.setImageRefPhoto(null);
  wizard.setImageCreativeMode("promo-ai");
  wizard.setExtraKitPhotos([]);
  wizard.setContentResearchApplyRef(null);
  wizard.setUserReferenceBrief(null);
  wizard.setReferenceAnalyzeNote?.(null);
  wizard.onReferenceAdFile(null);
  wizard.setPromptExtra((prev) => stripContentResearchStyleExtra(prev));
}

/** User chose 平台研究 — drop concept-assistant copy extras; keep conceptIdea as topic anchor. */
export function clearConceptAssistantState(wizard: ConceptSourceWizardApi): void {
  wizard.setPromptExtra((prev) => stripConceptAssistantPromptExtra(stripContentResearchStyleExtra(prev)));
  wizard.setCreativeVideoBrief("");
  wizard.setHeadline("");
  wizard.setSubline("");
  wizard.setOffer("");
}
