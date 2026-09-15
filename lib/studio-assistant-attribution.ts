/**
 * Persists Ask-AI → studio attribution so Generate Started/Success can join the funnel.
 * Written with handoff; survives consume() of the payload key.
 */
export const ASSISTANT_GENERATE_ATTRIBUTION_KEY =
  "alchemy-assistant-generate-attribution";

/** Draft question to restore after sign-in redirect. */
export const ASSISTANT_SIGNIN_DRAFT_KEY = "alchemy-assistant-signin-draft";

export type AssistantGenerateAttribution = {
  handoffId?: string;
  assistantActionId?: string;
  recipe?: string;
  createdAt?: string;
};

export function writeAssistantSignInDraft(text: string): void {
  if (typeof sessionStorage === "undefined") return;
  const t = text.trim().slice(0, 2000);
  if (!t) return;
  try {
    sessionStorage.setItem(ASSISTANT_SIGNIN_DRAFT_KEY, t);
  } catch {
    /* ignore */
  }
}

export function consumeAssistantSignInDraft(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ASSISTANT_SIGNIN_DRAFT_KEY);
    sessionStorage.removeItem(ASSISTANT_SIGNIN_DRAFT_KEY);
    const t = raw?.trim();
    return t || null;
  } catch {
    return null;
  }
}

export function writeAssistantGenerateAttribution(
  attr: AssistantGenerateAttribution,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      ASSISTANT_GENERATE_ATTRIBUTION_KEY,
      JSON.stringify(attr),
    );
  } catch {
    /* ignore quota */
  }
}

export function readAssistantGenerateAttribution(): AssistantGenerateAttribution | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ASSISTANT_GENERATE_ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssistantGenerateAttribution;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAssistantGenerateAttribution(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ASSISTANT_GENERATE_ATTRIBUTION_KEY);
}

/** Props to merge into Mixpanel generate events. */
export function assistantAttributionAnalyticsProps(): Record<
  string,
  string | boolean | null
> {
  const attr = readAssistantGenerateAttribution();
  if (!attr?.handoffId && !attr?.assistantActionId) return {};
  return {
    fromAssistant: true,
    handoffId: attr.handoffId ?? null,
    assistantActionId: attr.assistantActionId ?? null,
    assistantRecipe: attr.recipe ?? null,
  };
}
