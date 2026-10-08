import { mcpOauthJson, mcpOauthOptions } from "@/lib/mcp/oauth/cors";
import { mcpProtectedResourceMetadata } from "@/lib/mcp/oauth/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 9728 — root Protected Resource Metadata (points at Alchemy MCP). */
export function GET() {
  return mcpOauthJson(mcpProtectedResourceMetadata());
}

export function OPTIONS() {
  return mcpOauthOptions();
}
