import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ALLOWED_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
]);

function detectKind(file: File): "image" | "audio" | null {
  const mime = (file.type || "").toLowerCase();
  const name = file.name?.toLowerCase() ?? "";
  if (
    ALLOWED_IMAGE_MIME.has(mime) ||
    /\.(jpe?g|png|webp|gif|avif)$/i.test(name) ||
    mime.startsWith("image/")
  ) {
    return "image";
  }
  if (
    ALLOWED_AUDIO_MIME.has(mime) ||
    /\.(mp3|wav|aac|m4a|ogg)$/i.test(name) ||
    mime.startsWith("audio/")
  ) {
    return "audio";
  }
  return null;
}

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

  const kind = detectKind(file);
  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Use JPEG/PNG/WebP/GIF/AVIF for images or MP3/WAV/M4A for audio.",
      },
      { status: 400 },
    );
  }

  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${maxBytes / (1024 * 1024)} MB).` },
      { status: 413 },
    );
  }

  try {
    const url = await fal.storage.upload(file);
    return NextResponse.json({ url, kind });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
