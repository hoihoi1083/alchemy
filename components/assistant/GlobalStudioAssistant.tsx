"use client";

import { usePathname } from "next/navigation";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { assistantSurfaceFromPathname } from "@/lib/studio-assistant-surface";

/**
 * Landing + studio AI assistant (logo launcher).
 */
export function GlobalStudioAssistant() {
  const pathname = usePathname() || "/";
  const surface = assistantSurfaceFromPathname(pathname);

  if (surface !== "landing") return null;

  return (
    <>
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface={surface} />
    </>
  );
}
