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

/** True when the global mascot assistant widget should render (landing only). */
export function isStudioAssistantMounted(pathname: string): boolean {
  return assistantSurfaceFromPathname(pathname) === "landing";
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
  if (path === "/studio" || path.startsWith("/studio/")) return "studio";
  if (path === "/ultra" || path.startsWith("/ultra/")) return null;
  return null;
}
