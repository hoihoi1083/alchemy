/**
 * Product analytics helpers (Mixpanel).
 * Prefer these over raw trackEvent so funnel names stay consistent.
 */
import { trackEvent } from "@/components/MixpanelProvider";

export { trackEvent };

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Image / video / music generation funnel. */
export function trackGenerateStarted(
  kind: "image" | "video" | "music",
  props?: AnalyticsProps,
) {
  trackEvent("Generate Started", { kind, ...props });
}

export function trackGenerateSuccess(
  kind: "image" | "video" | "music",
  props?: AnalyticsProps,
) {
  trackEvent("Generate Success", { kind, ...props });
}

export function trackGenerateFailed(
  kind: "image" | "video" | "music",
  props?: AnalyticsProps,
) {
  trackEvent("Generate Failed", { kind, ...props });
}

/** Stripe checkout / subscribe / top-up. */
export function trackCheckoutStarted(props?: AnalyticsProps) {
  trackEvent("Checkout Started", props);
}

export function trackCheckoutRedirected(props?: AnalyticsProps) {
  trackEvent("Checkout Redirected", props);
}

export function trackCheckoutFailed(props?: AnalyticsProps) {
  trackEvent("Checkout Failed", props);
}

export function trackSubscribeSuccess(props?: AnalyticsProps) {
  trackEvent("Subscribe Success", props);
}

export function trackTopupSuccess(props?: AnalyticsProps) {
  trackEvent("Topup Success", props);
}

/** Map API paths used by studio-api helpers → funnel kind. */
export function trackApiGenerateLifecycle(
  path: string,
  phase: "started" | "success" | "failed",
  props?: AnalyticsProps,
) {
  let kind: "image" | "video" | "music" | null = null;
  if (path.includes("generate-music")) kind = "music";
  else if (
    path.includes("generate-image") ||
    path.includes("generate-campaign") ||
    path.includes("generate-teaching") ||
    path.includes("generate-storyboard-images") ||
    path.includes("generate-cinematic-scenes") ||
    path.includes("inpaint") ||
    path.includes("/api/compose")
  ) {
    kind = "image";
  } else if (
    path === "/api/generate" ||
    path.includes("generate-kling") ||
    path.includes("generate-digital-presenter") ||
    path.includes("stitch-videos")
  ) {
    kind = "video";
  }
  if (!kind) return;
  if (phase === "started") trackGenerateStarted(kind, { path, ...props });
  else if (phase === "success") trackGenerateSuccess(kind, { path, ...props });
  else trackGenerateFailed(kind, { path, ...props });
}
