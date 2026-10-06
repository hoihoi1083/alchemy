import type { AuthInfo } from "@modelcontextprotocol/server";
import { verifyMcpApiKey } from "@/lib/mcp/api-keys";

export type AlchemyMcpAuthExtra = {
  clerkId: string;
  keyId: string;
  keyPrefix: string;
  keyLabel: string;
};

/**
 * Bearer verifier for mcp-handler `withMcpAuth`.
 * Accepts Alchemy personal API keys (`alk_…`) created under /account.
 */
export async function verifyAlchemyMcpBearer(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const verified = await verifyMcpApiKey(bearerToken);
  if (!verified || !bearerToken) return undefined;

  const extra: AlchemyMcpAuthExtra = {
    clerkId: verified.clerkId,
    keyId: verified.keyId,
    keyPrefix: verified.prefix,
    keyLabel: verified.label,
  };

  return {
    token: bearerToken,
    clientId: verified.keyId,
    scopes: ["alchemy:generate"],
    extra,
  };
}

export function clerkIdFromMcpAuth(authInfo: AuthInfo | undefined | null): string | null {
  const extra = authInfo?.extra as AlchemyMcpAuthExtra | undefined;
  const id = typeof extra?.clerkId === "string" ? extra.clerkId.trim() : "";
  return id || null;
}

export function mcpAuthRequiredText(): string {
  return JSON.stringify(
    {
      ok: false,
      error: "Unauthorized",
      hint:
        "Create an Alchemy MCP API key under Account, then send Authorization: Bearer alk_… on every MCP request (Grok / Cursor / ChatGPT).",
    },
    null,
    2,
  );
}
