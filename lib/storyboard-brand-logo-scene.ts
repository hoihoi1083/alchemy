/**
 * Opt-in brand logo on storyboard stills.
 * - useBrandLogo off → never treat as logo scene
 * - on → last scene is the centered end-card hero; earlier scenes get a corner badge
 */
export function isStoryboardEndCardLogoScene(
  scene: { role?: string; imageIndex: number },
  totalScenes: number,
  opts?: { useBrandLogo?: boolean },
): boolean {
  if (!opts?.useBrandLogo) return false;
  return totalScenes > 0 && scene.imageIndex === totalScenes;
}

/** @deprecated Use isStoryboardEndCardLogoScene */
export function isStoryboardBrandLogoScene(
  scene: { role?: string; imageIndex: number },
  totalScenes: number,
  opts?: { endWithBrandLogo?: boolean; useBrandLogo?: boolean },
): boolean {
  return isStoryboardEndCardLogoScene(scene, totalScenes, {
    useBrandLogo: opts?.useBrandLogo ?? opts?.endWithBrandLogo,
  });
}
