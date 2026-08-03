/** Caption / beat copy to show under a generated storyboard still. */
export function storyboardSceneDisplayCopy(scene: {
  onImageCopyZh?: string;
  sceneDescriptionZh?: string;
  role?: string;
}): { caption: string | null; beat: string | null } {
  const caption = scene.onImageCopyZh?.trim() || null;
  const beatRaw = scene.sceneDescriptionZh?.trim() || scene.role?.trim() || null;
  const beat =
    beatRaw && (!caption || beatRaw !== caption) ? beatRaw : caption ? null : beatRaw;
  return { caption, beat };
}

/** Prefer consumer caption script; fall back to scene beat. */
export function storyboardScenePrimaryScript(scene: {
  onImageCopyZh?: string;
  sceneDescriptionZh?: string;
  role?: string;
}): string {
  const { caption, beat } = storyboardSceneDisplayCopy(scene);
  return caption || beat || "";
}

/** Infer Kling clip length from existing scene timing spans. */
export function inferKlingClipFromScenes(
  scenes: Array<{ startSec?: number; endSec?: number }>,
): 5 | 10 {
  if (!scenes.length) return 5;
  const spans = scenes.map((s) =>
    Math.max(0, (Number(s.endSec) || 0) - (Number(s.startSec) || 0)),
  );
  const avg = spans.reduce((a, b) => a + b, 0) / spans.length;
  return avg > 5.5 ? 10 : 5;
}
