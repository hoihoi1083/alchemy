"use client";

import { usePathname } from "next/navigation";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { assistantSurfaceFromPathname } from "@/lib/studio-assistant-surface";

/**
 * Landing-only AI assistant (logo launcher). Hidden on every other route.
 */
export function GlobalStudioAssistant() {
  const pathname = usePathname() || "/";
  const surface = assistantSurfaceFromPathname(pathname);

  if (!surface) return null;

  return (
    <>
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface={surface} />
    </>
  );
}
