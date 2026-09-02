"use client";

import { usePathname } from "next/navigation";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { isStudioAssistantMounted } from "@/lib/studio-assistant-surface";

/**
 * Landing-only AI assistant (mascot launcher).
 * In-studio step coach and CoachSpotlightOverlay are dormant — wizard cards coach on /studio.
 */
export function GlobalStudioAssistant() {
  const pathname = usePathname() || "/";

  if (!isStudioAssistantMounted(pathname)) return null;

  return <StudioAssistantWidget surface="landing" />;
}
