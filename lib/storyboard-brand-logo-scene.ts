/**
 * Opt-in brand logo on storyboard stills.
 * Previously treated the last scene as a centered end-card; that path is retired.
 * Logo opt-in now means Mode A (or stamp fallback) on every scene equally —
 * natural placement, no blank logo-hero last frame.
 */
export function isStoryboardEndCardLogoScene(
  _scene: { role?: string; imageIndex: number },
  _totalScenes: number,
  _opts?: { useBrandLogo?: boolean },
): boolean {
  return false;
}

/** @deprecated Use isStoryboardEndCardLogoScene (always false — end-card path retired). */
export function isStoryboardBrandLogoScene(
  scene: { role?: string; imageIndex: number },
  totalScenes: number,
  opts?: { endWithBrandLogo?: boolean; useBrandLogo?: boolean },
): boolean {
  return isStoryboardEndCardLogoScene(scene, totalScenes, {
    useBrandLogo: opts?.useBrandLogo ?? opts?.endWithBrandLogo,
  });
}
