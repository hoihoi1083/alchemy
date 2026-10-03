import { NextResponse } from "next/server";
import { assertProCanvasAllowedForUser } from "@/lib/billing/assert-pro-canvas";
import { SERVER_ERRORS } from "@/lib/api/server-errors";
import {
  normalizeUltraDescribeRefs,
  planUltraBoardFromDescription,
} from "@/lib/ultra-plan-board";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { requireAppUser } from "@/lib/require-app-user";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import { serializeUltraCanvasSnapshot } from "@/lib/ultra-canvas-snapshot";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;

  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let body: {
    description?: string;
    labels?: Record<string, string>;
    refs?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const description = body.description?.trim() ?? "";
  if (!description) {
    return NextResponse.json(
      { error: "Describe the creative job you want on the board." },
      { status: 400 },
    );
  }

  const refs = normalizeUltraDescribeRefs(body.refs).filter((r) =>
    isHttpOrLibraryMediaUrl(r.url),
  );
  if (Array.isArray(body.refs) && body.refs.length > 0 && refs.length === 0) {
    return NextResponse.json(
      { error: "Uploaded refs must be valid library/http media URLs." },
      { status: 400 },
    );
  }

  try {
    const graph = await planUltraBoardFromDescription({
      description,
      labels: body.labels,
      refs,
    });
    const snapshot = serializeUltraCanvasSnapshot(
      graph.nodes,
      graph.edges,
      graph.nodeCounterSeed,
    );
    return NextResponse.json({
      title: graph.title,
      qualityNote: graph.qualityNote,
      snapshot,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    const status = message.includes("DEEPSEEK")
      ? 503
      : message.includes("Plan") || message.includes("node") || message.includes("edge")
        ? 422
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
