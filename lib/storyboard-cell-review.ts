/** Keep viewed indices whose still URL did not change (sig: `imageIndex:url|…`). */

export function urlsFromStoryboardSceneSig(sig: string): string[] {
  if (!sig.trim()) return [];
  return sig.split("|").map((part) => {
    const colon = part.indexOf(":");
    return colon >= 0 ? part.slice(colon + 1) : part;
  });
}

export function retainStoryboardCellViewed(
  viewed: number[],
  prevSig: string,
  nextSig: string,
): number[] {
  const prevUrls = urlsFromStoryboardSceneSig(prevSig);
  const nextUrls = urlsFromStoryboardSceneSig(nextSig);
  return viewed.filter((i) => prevUrls[i] && prevUrls[i] === nextUrls[i]);
}

export function allStoryboardCellsViewed(
  sceneCount: number,
  viewed: number[],
): boolean {
  if (sceneCount <= 0) return false;
  const set = new Set(viewed);
  for (let i = 0; i < sceneCount; i += 1) {
    if (!set.has(i)) return false;
  }
  return true;
}
