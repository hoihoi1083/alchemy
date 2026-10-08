import { mcpOauthJson, mcpOauthOptions } from "@/lib/mcp/oauth/cors";
import { mcpProtectedResourceMetadata } from "@/lib/mcp/oauth/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728 path-aware PRM for resource https://…/api/grok-mcp
 * (clients insert the MCP path after /.well-known/oauth-protected-resource).
 */
export function GET() {
  return mcpOauthJson(mcpProtectedResourceMetadata());
}

export function OPTIONS() {
  return mcpOauthOptions();
}
