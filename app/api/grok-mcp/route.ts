import { alchemyGrokMcpHandler } from "@/lib/mcp/alchemy-grok-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Image generation via fal may exceed the default serverless window. */
export const maxDuration = 300;

/**
 * Public Alchemy MCP endpoint for Grok Bot, Cursor, ChatGPT MCP, etc.
 * Auth: optional Bearer `alk_…` personal API key (required for whoami + generate).
 *
 * Local:  http://localhost:3000/api/grok-mcp
 * Prod:   https://www.alchemyailab.com/api/grok-mcp
 */
export { alchemyGrokMcpHandler as GET, alchemyGrokMcpHandler as POST };
