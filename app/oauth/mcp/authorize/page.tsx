import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { McpOAuthConsentClient } from "@/components/McpOAuthConsentClient";
import {
  isAllowedRedirectUri,
  redirectUriAllowedForClient,
  resolveMcpOauthClient,
} from "@/lib/mcp/oauth/clients";
import { MCP_OAUTH_SCOPE_STRING, mcpResourceUrl } from "@/lib/mcp/oauth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function McpOauthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { userId } = await auth();

  const clientId = first(sp.client_id).trim();
  const redirectUri = first(sp.redirect_uri).trim();
  const responseType = first(sp.response_type).trim() || "code";
  const codeChallenge = first(sp.code_challenge).trim();
  const codeChallengeMethod = first(sp.code_challenge_method).trim() || "S256";
  const state = first(sp.state).trim() || null;
  const scope = first(sp.scope).trim() || MCP_OAUTH_SCOPE_STRING;
  const resource = (first(sp.resource).trim() || mcpResourceUrl()).replace(/\/$/, "");

  const returnParams = new URLSearchParams();
  if (responseType) returnParams.set("response_type", responseType);
  if (clientId) returnParams.set("client_id", clientId);
  if (redirectUri) returnParams.set("redirect_uri", redirectUri);
  if (codeChallenge) returnParams.set("code_challenge", codeChallenge);
  if (codeChallengeMethod) {
    returnParams.set("code_challenge_method", codeChallengeMethod);
  }
  if (state) returnParams.set("state", state);
  if (scope) returnParams.set("scope", scope);
  if (resource) returnParams.set("resource", resource);
  const returnPath = `/oauth/mcp/authorize?${returnParams.toString()}`;

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`);
  }

  let error: string | null = null;
  let clientName: string | null = null;

  if (responseType !== "code") {
    error = "Unsupported response_type (only code is supported).";
  } else if (!clientId || !redirectUri || !codeChallenge) {
    error = "Missing client_id, redirect_uri, or code_challenge.";
  } else if (codeChallengeMethod !== "S256") {
    error = "Only S256 PKCE is supported.";
  } else if (!isAllowedRedirectUri(redirectUri)) {
    error = "This redirect_uri is not allowed.";
  } else {
    const client = await resolveMcpOauthClient(clientId);
    if (!client) {
      error = "Unknown OAuth client. Reconnect from Grok so it can register again.";
    } else if (!redirectUriAllowedForClient(client, redirectUri)) {
      error = "redirect_uri does not match this client registration.";
    } else {
      clientName = client.clientName;
    }
  }

  return (
    <McpOAuthConsentClient
      params={{
        clientId,
        clientName,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        state,
        scope,
        resource,
        error,
      }}
    />
  );
}
