import { isAllowedRedirectUri } from "@/lib/mcp/oauth/clients";
import { mcpOauthJson, mcpOauthOptions } from "@/lib/mcp/oauth/cors";
import { registerDcrClient } from "@/lib/mcp/oauth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 7591 Dynamic Client Registration (public clients, auth method none).
 * Grok / Cursor / Claude use this when CIMD is unavailable.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return mcpOauthJson({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const redirectUrisRaw = body.redirect_uris;
  if (!Array.isArray(redirectUrisRaw) || redirectUrisRaw.length === 0) {
    return mcpOauthJson(
      { error: "invalid_redirect_uri", error_description: "redirect_uris required" },
      { status: 400 },
    );
  }

  const redirectUris = redirectUrisRaw.filter((u): u is string => typeof u === "string");
  if (redirectUris.length === 0 || redirectUris.some((u) => !isAllowedRedirectUri(u))) {
    return mcpOauthJson(
      {
        error: "invalid_redirect_uri",
        error_description: "Only https and loopback http redirect URIs are allowed",
      },
      { status: 400 },
    );
  }

  const clientName =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim()
      : "MCP Client";

  try {
    const client = await registerDcrClient({
      clientName,
      redirectUris,
      grantTypes: Array.isArray(body.grant_types)
        ? body.grant_types.filter((g): g is string => typeof g === "string")
        : undefined,
      responseTypes: Array.isArray(body.response_types)
        ? body.response_types.filter((g): g is string => typeof g === "string")
        : undefined,
      tokenEndpointAuthMethod:
        typeof body.token_endpoint_auth_method === "string"
          ? body.token_endpoint_auth_method
          : "none",
    });

    return mcpOauthJson(
      {
        client_id: client.clientId,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "registration_failed";
    return mcpOauthJson(
      { error: "server_error", error_description: message },
      { status: 500 },
    );
  }
}

export function OPTIONS() {
  return mcpOauthOptions();
}
