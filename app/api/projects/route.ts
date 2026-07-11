import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { createProject, listProjectsForUser } from "@/lib/db/projects";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import { EMPTY_PROJECT_SNAPSHOT } from "@/lib/project-snapshot";
import { isPromotionMode, type PromotionMode } from "@/lib/promotion-mode";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const projects = await listProjectsForUser(auth.user.userId);
  return NextResponse.json({
    projects: projects.map((p) => ({
      id: String(p._id),
      name: p.name,
      promotionMode: p.promotionMode,
      templateId: p.templateId,
      imageUrl: p.imageUrl,
      videoUrl: p.videoUrl,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  let body: { name?: string; snapshot?: ProjectSnapshot; promotionMode?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const promotionMode: PromotionMode = isPromotionMode(body?.promotionMode ?? "")
    ? (body!.promotionMode as PromotionMode)
    : (body?.snapshot?.settings.promotionMode ?? "physical");
  const snapshot =
    body?.snapshot && body.snapshot.version === 1
      ? body.snapshot
      : EMPTY_PROJECT_SNAPSHOT(promotionMode);

  const project = await createProject({
    clerkId: auth.user.userId,
    name:
      body?.name ??
      (snapshot.inputs.product || snapshot.inputs.headline || "New project"),
    snapshot,
  });

  return NextResponse.json({
    id: String(project._id),
    name: project.name,
    snapshot: project.snapshot,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
