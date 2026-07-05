import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 30;

function safeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind = String(body.kind ?? "video");
  const product = String(body.product ?? "").trim() || "project";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `alchemy-edit-pack-${safeName(product)}-${kind}-${stamp}.json`;

  const pack = {
    app: "alchemy.ai",
    kind,
    created_at: new Date().toISOString(),
    payload: body,
    notes: [
      "Use this JSON as an edit reference in CapCut/Premiere timeline.",
      "For storyboard mode, map scene_images to @Image1..N in order.",
      "Prompt and constraints are preserved for quick re-generation.",
    ],
  };

  return NextResponse.json({
    filename,
    content: JSON.stringify(pack, null, 2),
  });
}
