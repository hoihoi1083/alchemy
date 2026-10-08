import { mcpOauthJson, mcpOauthOptions } from "@/lib/mcp/oauth/cors";
import { mcpAuthorizationServerMetadata } from "@/lib/mcp/oauth/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 8414 Authorization Server Metadata for Alchemy MCP OAuth. */
export function GET() {
  return mcpOauthJson(mcpAuthorizationServerMetadata());
}

export function OPTIONS() {
  return mcpOauthOptions();
}
