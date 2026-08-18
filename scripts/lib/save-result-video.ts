import type { Page } from "playwright";
import { writeFileSync } from "node:fs";

/** Download the in-page result <video> (library / blob / CDN) to a local mp4. */
export async function savePageResultVideo(page: Page, dest: string): Promise<void> {
  const bytes = await page.evaluate(async () => {
    const videos = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
    const v =
      videos.find(
        (el) => el.videoWidth > 80 && Number.isFinite(el.duration) && el.duration > 1,
      ) ?? videos[0];
    if (!v) return null;
    const src = v.currentSrc || v.src;
    if (!src) return null;
    const res = await fetch(src);
    if (!res.ok) return null;
    return Array.from(new Uint8Array(await res.arrayBuffer()));
  });
  if (!bytes?.length) {
    throw new Error("Could not download the generated result video from the page");
  }
  writeFileSync(dest, Buffer.from(bytes));
}
