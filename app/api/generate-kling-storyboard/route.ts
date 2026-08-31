/**
 * Compatibility alias — prefer POST /api/generate-storyboard-video.
 * Kept so older clients and docs that still hit the Kling-named URL keep working.
 *
 * Segment config must be declared here (not re-exported) so Next.js recognizes
 * runtime / maxDuration on this route.
 */
import { POST as canonicalPost } from "../generate-storyboard-video/route";

export const runtime = "nodejs";
/** Match canonical storyboard orchestrator (H3 / Seedance / Kling fallback). */
export const maxDuration = 800;

export async function POST(request: Request) {
  return canonicalPost(request);
}
