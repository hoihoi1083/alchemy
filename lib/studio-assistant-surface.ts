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

const HIDE_PREFIXES = ["/sign-in", "/sign-up"];

export function isAssistantSurface(raw: unknown): raw is AssistantSurface {
  return typeof raw === "string" && (ASSISTANT_SURFACES as readonly string[]).includes(raw);
}

export function shouldHideAssistant(pathname: string): boolean {
  return HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isStudioWizardPath(pathname: string): boolean {
  return pathname === "/studio" || pathname === "/studio/";
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
  return surface !== "landing" && surface !== "start";
}

export function assistantSurfaceFromPathname(pathname: string): AssistantSurface | null {
  const path = pathname.split("?")[0] || "/";
  if (shouldHideAssistant(path) || isStudioWizardPath(path)) return null;
  if (path === "/" || path === "") return "landing";
  if (path === "/start" || path.startsWith("/start/")) return "start";
  if (path === "/edit-image" || path.startsWith("/edit-image/")) return "edit-image";
  if (path === "/captions" || path.startsWith("/captions/")) return "captions";
  if (path === "/pro" || path.startsWith("/pro/")) return "pro";
  if (path === "/brand-kit" || path.startsWith("/brand-kit/")) return "brand-kit";
  if (path === "/library" || path.startsWith("/library/")) return "library";
  if (path === "/ugc" || path.startsWith("/ugc/")) return "ugc";
  return "site";
}
