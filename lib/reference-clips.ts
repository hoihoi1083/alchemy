/** Built-in silent reference clips — add MP4 files under public/references/ */
export type ReferenceClipId = "product-push-in" | "gentle-orbit" | "cozy-lifestyle";

export type ReferenceClipDef = {
  id: ReferenceClipId;
  /** Path served from Next public folder */
  publicPath: string;
  tags: string[];
};

export const REFERENCE_CLIPS: ReferenceClipDef[] = [
  {
    id: "product-push-in",
    publicPath: "/references/product-push-in.mp4",
    tags: ["product", "push-in", "clean"],
  },
  {
    id: "gentle-orbit",
    publicPath: "/references/gentle-orbit.mp4",
    tags: ["product", "orbit", "premium"],
  },
  {
    id: "cozy-lifestyle",
    publicPath: "/references/cozy-lifestyle.mp4",
    tags: ["lifestyle", "warm", "slow"],
  },
];

export function getReferenceClip(id: ReferenceClipId): ReferenceClipDef | undefined {
  return REFERENCE_CLIPS.find((c) => c.id === id);
}

/** True when the MP4 exists under public/references/. */
export async function isReferenceClipAvailable(
  clip: ReferenceClipDef,
  baseUrl = "",
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}${clip.publicPath}`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listAvailableReferenceClips(baseUrl = ""): Promise<ReferenceClipDef[]> {
  const checks = await Promise.all(
    REFERENCE_CLIPS.map(async (clip) =>
      (await isReferenceClipAvailable(clip, baseUrl)) ? clip : null,
    ),
  );
  return checks.filter((c): c is ReferenceClipDef => c !== null);
}

/** Fetch a public reference clip as a File for upload APIs. */
export async function fetchReferenceClipAsFile(
  clipId: ReferenceClipId,
  baseUrl = "",
): Promise<File> {
  const clip = getReferenceClip(clipId);
  if (!clip) throw new Error("Reference clip not found.");
  const url = `${baseUrl}${clip.publicPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      "Reference clip file missing. Add MP4 to public/references/ — see public/references/README.md",
    );
  }
  const blob = await res.blob();
  const name = clip.publicPath.split("/").pop() ?? "reference.mp4";
  return new File([blob], name, { type: blob.type || "video/mp4" });
}
