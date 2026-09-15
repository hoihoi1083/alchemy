import type { AssistantSurface } from "@/lib/studio-assistant-types";

export const ASSISTANT_SURFACES = [
  "landing",
  "start",
  "studio",
  "edit-image",
  "captions",
  "pro",
  "brand-kit",
  "library",
  "ugc",
  "site",
] as const satisfies readonly AssistantSurface[];

export function isAssistantSurface(raw: unknown): raw is AssistantSurface {
  return typeof raw === "string" && (ASSISTANT_SURFACES as readonly string[]).includes(raw);
}

/** True when the global mascot assistant widget should render. */
export function isStudioAssistantMounted(pathname: string): boolean {
  const surface = assistantSurfaceFromPathname(pathname);
  if (!surface) return false;
  if (surface === "landing" || surface === "start" || surface === "site") {
    return surface === "landing";
  }
  // In-studio step coach stays dormant — wizard cards own /studio teaching.
  if (surface === "studio") return false;
  if (isToolAssistantSurface(surface)) {
    return process.env.NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES === "1";
  }
  return false;
}

export function isToolAssistantSurface(surface: AssistantSurface): boolean {
  return (
    surface === "edit-image" ||
    surface === "captions" ||
    surface === "pro" ||
    surface === "brand-kit" ||
    surface === "library" ||
    surface === "ugc"
  );
}

export function isLandingLikeSurface(surface: AssistantSurface): boolean {
  return surface === "landing" || surface === "start" || surface === "site";
}

/** Dark glow / canvas pages — logo-only launcher disappears without chrome. */
export function usesDarkAssistantChrome(surface: AssistantSurface): boolean {
  return surface !== "landing" && surface !== "start" && surface !== "studio";
}

export function assistantSurfaceFromPathname(pathname: string): AssistantSurface | null {
  const path = pathname.split("?")[0] || "/";
  if (path === "/" || path === "") return "landing";
  if (path === "/start" || path.startsWith("/start/")) return "start";
  if (path === "/studio" || path.startsWith("/studio/")) return "studio";
  if (path === "/ultra" || path.startsWith("/ultra/") || path === "/pro" || path.startsWith("/pro/")) {
    return "pro";
  }
  if (path.startsWith("/captions")) return "captions";
  if (path.startsWith("/edit-image")) return "edit-image";
  if (path.startsWith("/brand-kit")) return "brand-kit";
  if (path.startsWith("/library")) return "library";
  if (path.startsWith("/ugc")) return "ugc";
  return null;
}
