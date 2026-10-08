import {
  redirectUriAllowedForClient,
  resolveMcpOauthClient,
} from "@/lib/mcp/oauth/clients";
import { mcpOauthJson, mcpOauthOptions } from "@/lib/mcp/oauth/cors";
import { mcpResourceUrl } from "@/lib/mcp/oauth/config";
import { verifyPkceS256 } from "@/lib/mcp/oauth/pkce";
import {
  consumeAuthCode,
  issueTokens,
  normalizeResource,
  refreshAccessToken,
} from "@/lib/mcp/oauth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readParams(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  const form = await req.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * OAuth token endpoint — authorization_code (+ PKCE) and refresh_token.
 */
export async function POST(req: Request) {
  let params: Record<string, string>;
  try {
    params = await readParams(req);
  } catch {
    return mcpOauthJson({ error: "invalid_request" }, { status: 400 });
  }

  const grantType = params.grant_type?.trim();
  const clientId = params.client_id?.trim();
  if (!grantType || !clientId) {
    return mcpOauthJson(
      { error: "invalid_request", error_description: "grant_type and client_id required" },
      { status: 400 },
    );
  }

  const client = await resolveMcpOauthClient(clientId);
  if (!client) {
    return mcpOauthJson({ error: "invalid_client" }, { status: 401 });
  }

  if (grantType === "authorization_code") {
    const code = params.code?.trim();
    const redirectUri = params.redirect_uri?.trim();
    const codeVerifier = params.code_verifier?.trim();
    const resource = (params.resource?.trim() || mcpResourceUrl()).replace(/\/$/, "");

    if (!code || !redirectUri || !codeVerifier) {
      return mcpOauthJson(
        {
          error: "invalid_request",
          error_description: "code, redirect_uri, and code_verifier required",
        },
        { status: 400 },
      );
    }

    if (!redirectUriAllowedForClient(client, redirectUri)) {
      return mcpOauthJson({ error: "invalid_grant" }, { status: 400 });
    }

    const authCode = await consumeAuthCode(code);
    if (!authCode) {
      return mcpOauthJson({ error: "invalid_grant" }, { status: 400 });
    }
    if (authCode.clientId !== client.clientId || authCode.redirectUri !== redirectUri) {
      return mcpOauthJson({ error: "invalid_grant" }, { status: 400 });
    }
    if (!verifyPkceS256(codeVerifier, authCode.codeChallenge)) {
      return mcpOauthJson(
        { error: "invalid_grant", error_description: "PKCE verification failed" },
        { status: 400 },
      );
    }
    if (
      authCode.resource &&
      normalizeResource(resource) !== normalizeResource(authCode.resource)
    ) {
      return mcpOauthJson(
        { error: "invalid_target", error_description: "resource mismatch" },
        { status: 400 },
      );
    }

    try {
      const tokens = await issueTokens({
        clientId: client.clientId,
        clerkId: authCode.clerkId,
        scope: authCode.scope,
        resource: authCode.resource || resource,
      });
      return mcpOauthJson({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn,
        scope: tokens.scope,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "server_error";
      return mcpOauthJson(
        { error: "server_error", error_description: message },
        { status: 500 },
      );
    }
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.refresh_token?.trim();
    if (!refreshToken) {
      return mcpOauthJson({ error: "invalid_request" }, { status: 400 });
    }
    const tokens = await refreshAccessToken({
      refreshToken,
      clientId: client.clientId,
      resource: params.resource?.trim() || null,
    });
    if (!tokens) {
      return mcpOauthJson({ error: "invalid_grant" }, { status: 400 });
    }
    return mcpOauthJson({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType,
      expires_in: tokens.expiresIn,
      scope: tokens.scope,
    });
  }

  return mcpOauthJson({ error: "unsupported_grant_type" }, { status: 400 });
}

export function OPTIONS() {
  return mcpOauthOptions();
}
