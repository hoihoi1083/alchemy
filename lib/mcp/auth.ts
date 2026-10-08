import type { AuthInfo } from "@modelcontextprotocol/server";
import { looksLikeMcpApiKey, verifyMcpApiKey } from "@/lib/mcp/api-keys";
import {
  looksLikeMcpAccessToken,
  verifyMcpOauthAccessToken,
} from "@/lib/mcp/oauth/store";

export type AlchemyMcpAuthExtra = {
  clerkId: string;
  keyId: string;
  keyPrefix: string;
  keyLabel: string;
  /** alk_ personal key | oauth access token */
  authKind: "api_key" | "oauth";
};

/**
 * Bearer verifier for mcp-handler `withMcpAuth`.
 * Accepts:
 * - Alchemy personal API keys (`alk_…`) from /account
 * - OAuth access tokens (`ato_…`) from Sign in with Alchemy
 */
export async function verifyAlchemyMcpBearer(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  if (looksLikeMcpApiKey(bearerToken)) {
    const verified = await verifyMcpApiKey(bearerToken);
    if (!verified) return undefined;
    const extra: AlchemyMcpAuthExtra = {
      clerkId: verified.clerkId,
      keyId: verified.keyId,
      keyPrefix: verified.prefix,
      keyLabel: verified.label,
      authKind: "api_key",
    };
    return {
      token: bearerToken,
      clientId: verified.keyId,
      scopes: ["alchemy:generate"],
      extra,
    };
  }

  if (looksLikeMcpAccessToken(bearerToken)) {
    const verified = await verifyMcpOauthAccessToken(bearerToken);
    if (!verified) return undefined;
    const scopes = verified.scope
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const extra: AlchemyMcpAuthExtra = {
      clerkId: verified.clerkId,
      keyId: verified.clientId,
      keyPrefix: "ato_",
      keyLabel: "OAuth",
      authKind: "oauth",
    };
    return {
      token: bearerToken,
      clientId: verified.clientId,
      scopes: scopes.length ? scopes : ["alchemy:generate"],
      expiresAt: verified.expiresAt,
      extra,
    };
  }

  return undefined;
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
        "Connect via OAuth (Grok Bot Custom MCP → Sign in with Alchemy) or send Authorization: Bearer alk_… from Account → MCP API keys.",
    },
    null,
    2,
  );
}
