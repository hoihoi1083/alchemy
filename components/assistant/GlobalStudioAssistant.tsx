"use client";

import { usePathname } from "next/navigation";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import {
  assistantSurfaceFromPathname,
  isStudioAssistantMounted,
} from "@/lib/studio-assistant-surface";

/**
 * Ask-AI mascot — landing by default; tool surfaces when NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES=1.
 * In-studio step coach stays dormant — wizard cards coach on /studio.
 */
export function GlobalStudioAssistant() {
  const pathname = usePathname() || "/";

  if (!isStudioAssistantMounted(pathname)) return null;

  const surface = assistantSurfaceFromPathname(pathname) ?? "landing";
  return <StudioAssistantWidget surface={surface} />;
}
