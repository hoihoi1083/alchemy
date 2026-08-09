"use client";

import { usePathname } from "next/navigation";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { assistantSurfaceFromPathname } from "@/lib/studio-assistant-surface";

/**
 * Site-wide AI assistant.
 * Main `/studio` keeps its own widget inside WizardProvider for live wizard context.
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
