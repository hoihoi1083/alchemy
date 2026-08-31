import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { deleteProject, getProjectForUser, updateProject } from "@/lib/db/projects";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import { projectDisplayName } from "@/lib/project-snapshot";
import { mirrorProjectMedia } from "@/lib/storage/mirror-project-media";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const project = await getProjectForUser(auth.user.userId, id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: String(project._id),
    name: project.name,
    snapshot: project.snapshot,
    imageUrl: project.imageUrl,
    videoUrl: project.videoUrl,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  let body: { name?: string; snapshot?: ProjectSnapshot } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.name && !body?.snapshot) {
    return NextResponse.json({ error: "Provide name and/or snapshot." }, { status: 400 });
  }
  if (body.snapshot && body.snapshot.version !== 1) {
    return NextResponse.json({ error: "Unsupported snapshot version." }, { status: 400 });
  }

  const project = await updateProject(auth.user.userId, id, {
    name:
      body.name?.trim() ||
      (body.snapshot ? projectDisplayName(body.snapshot.inputs) : undefined),
    snapshot: body.snapshot,
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // Mirror any new fal/CDN media into durable R2 storage (best-effort, idempotent).
  if (body.snapshot) {
    try {
      await mirrorProjectMedia(auth.user.userId, id, body.snapshot);
    } catch {
      /* durable mirroring is best-effort — never block the save */
    }
  }

  return NextResponse.json({
    id: String(project._id),
    name: project.name,
    updatedAt: project.updatedAt,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const ok = await deleteProject(auth.user.userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
