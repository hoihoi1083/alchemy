/**
 * Mixpanel helpers for the landing / tool Ask-AI funnel.
 * Prefer these over raw trackEvent so event names stay consistent.
 */
import { trackEvent } from "@/lib/analytics";

type AssistantAnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackAssistantOpened(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Opened", props);
}

export function trackAssistantSend(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Send", props);
}

export function trackAssistantReply(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Reply", props);
}

export function trackAssistantActionClick(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Action Click", props);
}

export function trackAssistantQuotaExceeded(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Quota Exceeded", props);
}

export function trackAssistantHandoff(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Handoff", props);
}

export function trackAssistantError(props?: AssistantAnalyticsProps) {
  trackEvent("Assistant Error", props);
}
