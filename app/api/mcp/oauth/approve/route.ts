import { auth } from "@clerk/nextjs/server";
import {
  redirectUriAllowedForClient,
  resolveMcpOauthClient,
} from "@/lib/mcp/oauth/clients";
import { MCP_OAUTH_SCOPE_STRING, mcpResourceUrl } from "@/lib/mcp/oauth/config";
import { createAuthCode } from "@/lib/mcp/oauth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated consent approval — issues an authorization code and returns
 * the redirect URL for the MCP client (Grok / Cursor / etc.).
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  const redirectUri =
    typeof body.redirect_uri === "string" ? body.redirect_uri.trim() : "";
  const codeChallenge =
    typeof body.code_challenge === "string" ? body.code_challenge.trim() : "";
  const codeChallengeMethod =
    typeof body.code_challenge_method === "string"
      ? body.code_challenge_method.trim()
      : "S256";
  const state = typeof body.state === "string" ? body.state : null;
  const scope =
    typeof body.scope === "string" && body.scope.trim()
      ? body.scope.trim()
      : MCP_OAUTH_SCOPE_STRING;
  const resource =
    typeof body.resource === "string" && body.resource.trim()
      ? body.resource.trim().replace(/\/$/, "")
      : mcpResourceUrl();

  if (!clientId || !redirectUri || !codeChallenge) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing OAuth parameters" },
      { status: 400 },
    );
  }
  if (codeChallengeMethod !== "S256") {
    return Response.json(
      {
        error: "invalid_request",
        error_description: "Only S256 code_challenge_method is supported",
      },
      { status: 400 },
    );
  }

  const client = await resolveMcpOauthClient(clientId);
  if (!client) {
    return Response.json({ error: "invalid_client" }, { status: 400 });
  }
  if (!redirectUriAllowedForClient(client, redirectUri)) {
    return Response.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  try {
    const code = await createAuthCode({
      clientId: client.clientId,
      clerkId: userId,
      redirectUri,
      codeChallenge,
      scope,
      resource,
      state,
    });
    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);
    return Response.json({
      ok: true,
      redirect_to: redirect.toString(),
      client_name: client.clientName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "server_error";
    return Response.json({ error: "server_error", error_description: message }, { status: 500 });
  }
}
