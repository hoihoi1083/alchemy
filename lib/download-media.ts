function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

/**
 * Download a generated image or video through our server (works on localhost + production).
 * Always fetches bytes first — anchor navigation to API routes is unreliable in Chrome.
 */
export async function downloadMediaUrl(url: string, filename: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!url?.trim()) throw new Error("No image URL to download.");

  const res = await fetch("/api/studio-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ image_url: url, filename }),
  });

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* binary or empty */
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || contentType.includes("text/html")) {
    throw new Error("Download failed — file not available");
  }

  const blob = await res.blob();
  if (blob.size < 64) throw new Error("Download failed — empty file");
  triggerBlobDownload(blob, filename);
}

/** Sequential downloads — browsers block rapid-fire save dialogs. */
export async function downloadMediaUrls(
  items: Array<{ url: string; filename: string }>,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await downloadMediaUrl(items[i].url, items[i].filename);
    if (i < items.length - 1) await sleep(800);
  }
}
