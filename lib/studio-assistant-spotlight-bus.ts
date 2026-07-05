import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";

export const COACH_SPOTLIGHT_EVENT = "alchemy-coach-spotlight";

export function dispatchCoachSpotlight(task: CoachTaskKind | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COACH_SPOTLIGHT_EVENT, { detail: task }));
}

export function subscribeCoachSpotlight(
  handler: (task: CoachTaskKind | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<CoachTaskKind | null>).detail ?? null);
  };
  window.addEventListener(COACH_SPOTLIGHT_EVENT, listener);
  return () => window.removeEventListener(COACH_SPOTLIGHT_EVENT, listener);
}
