import type { AssetKind } from "@/lib/db/types";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import { persistUserAsset } from "@/lib/storage/persist-asset";
import { isR2Configured } from "@/lib/storage/r2";

type MediaItem = { url: string; kind: AssetKind; name: string };

function collectSnapshotMedia(snapshot: ProjectSnapshot, baseName: string): MediaItem[] {
  const items: MediaItem[] = [];
  const media = snapshot.media;

  if (media.imageUrl) items.push({ url: media.imageUrl, kind: "image", name: `${baseName} — image` });
  media.imageVariantUrls?.forEach((url, i) =>
    items.push({ url, kind: "image", name: `${baseName} — variant ${i + 1}` }),
  );
  if (media.videoUrl) items.push({ url: media.videoUrl, kind: "video", name: `${baseName} — video` });
  media.campaignSlideUrls?.forEach((url, i) =>
    items.push({ url, kind: "image", name: `${baseName} — campaign ${i + 1}` }),
  );
  media.storyboardSceneUrls?.forEach((url, i) =>
    items.push({ url, kind: "image", name: `${baseName} — scene ${i + 1}` }),
  );
  media.carouselSlideUrls?.forEach((url, i) =>
    items.push({ url, kind: "image", name: `${baseName} — carousel ${i + 1}` }),
  );
  return items;
}

/**
 * Mirror any new remote media in a saved project into durable R2 assets.
 * Best-effort and idempotent (dedupe by source URL). Safe to await; only
 * uploads URLs it hasn't seen before, so repeat autosaves are cheap.
 */
export async function mirrorProjectMedia(
  clerkId: string,
  projectId: string,
  snapshot: ProjectSnapshot,
): Promise<void> {
  if (!isR2Configured()) return;
  const baseName =
    snapshot.inputs.product?.trim() ||
    snapshot.inputs.headline?.trim() ||
    "Project";
  const items = collectSnapshotMedia(snapshot, baseName);
  if (items.length === 0) return;

  for (const item of items) {
    await persistUserAsset({
      clerkId,
      projectId,
      kind: item.kind,
      sourceUrl: item.url,
      name: item.name,
    });
  }
}
