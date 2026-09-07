import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOADS_PER_HOUR = 60;

const uploadCounts = new Map<string, { count: number; resetAt: number }>();

function checkUploadRate(clerkId: string): boolean {
  const now = Date.now();
  const row = uploadCounts.get(clerkId);
  if (!row || now > row.resetAt) {
    uploadCounts.set(clerkId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (row.count >= MAX_UPLOADS_PER_HOUR) return false;
  row.count += 1;
  return true;
}

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Image upload for /edit-image-2 — any signed-in plan (not Ultra Master-gated).
 * Durable library asset URL returned; free (no tokens).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  if (!checkUploadRate(auth.user.userId)) {
    return NextResponse.json(
      { error: "Upload rate limit reached — try again in an hour." },
      { status: 429 },
    );
  }

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  const name = file.name?.toLowerCase() ?? "";
  const okMime =
    ALLOWED_IMAGE_MIME.has(mime) ||
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif)$/i.test(name);
  if (!okMime) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, GIF, or AVIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image too large (max 25 MB)." }, { status: 413 });
  }

  try {
    const falUrl = await fal.storage.upload(file);
    const durableUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrl: falUrl,
      fallbackUrl: falUrl,
      name: file.name || "edit-image-2-upload",
    });
    return NextResponse.json({ url: durableUrl, kind: "image" as const });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
