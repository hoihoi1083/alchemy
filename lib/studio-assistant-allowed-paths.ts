/** Internal markdown paths the assistant may link to in replies. */
export const ASSISTANT_ALLOWED_PATHS = new Set([
  "/",
  "/start",
  "/studio",
  "/captions",
  "/edit-image",
  "/edit-image-2",
  "/ultra",
  "/pro",
  "/brand-kit",
  "/library",
  "/ugc",
  "/pricing",
  "/account",
  "/how",
  "/sign-in",
  "/sign-up",
]);

export function isSafeAssistantPath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split("?")[0]?.split("#")[0] ?? "";
  if (ASSISTANT_ALLOWED_PATHS.has(path)) return true;
  for (const allowed of ASSISTANT_ALLOWED_PATHS) {
    if (allowed !== "/" && path.startsWith(`${allowed}/`)) return true;
  }
  return false;
}
