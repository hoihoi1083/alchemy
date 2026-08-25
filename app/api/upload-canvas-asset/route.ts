import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

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
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image too large (max ${MAX_BYTES / (1024 * 1024)} MB).` },
      { status: 413 },
    );
  }

  const mime = (file.type || "").toLowerCase();
  const name = file.name?.toLowerCase() ?? "";
  const looksImage =
    ALLOWED_MIME.has(mime) ||
    /\.(jpe?g|png|webp|gif|avif)$/i.test(name) ||
    mime.startsWith("image/");
  if (!looksImage) {
    return NextResponse.json(
      { error: "Only image files are allowed (JPEG, PNG, WebP, GIF, AVIF)." },
      { status: 400 },
    );
  }

  try {
    const url = await fal.storage.upload(file);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
