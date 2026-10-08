import {
  getDcrClient,
  type ResolvedMcpOauthClient,
} from "@/lib/mcp/oauth/store";

const CIMD_FETCH_TIMEOUT_MS = 8_000;

export function isHttpsClientId(clientId: string): boolean {
  try {
    const u = new URL(clientId);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Redirect URIs allowed for public MCP clients (Grok, Cursor, Claude, etc.).
 * Loopback http + any https.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.protocol === "https:") return true;
  if (u.protocol === "http:") {
    const host = u.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
  }
  // Custom schemes used by some desktop agents (e.g. cursor://)
  if (/^[a-z][a-z0-9+.-]*:$/i.test(u.protocol) && u.protocol !== "javascript:") {
    return true;
  }
  return false;
}

export function redirectUriAllowedForClient(
  client: ResolvedMcpOauthClient,
  redirectUri: string,
): boolean {
  return client.redirectUris.some((allowed) => allowed === redirectUri);
}

type CimdDocument = {
  client_id?: string;
  client_name?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
};

async function fetchCimdClient(clientIdUrl: string): Promise<ResolvedMcpOauthClient | null> {
  if (!isHttpsClientId(clientIdUrl)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CIMD_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(clientIdUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as CimdDocument;
    if (typeof doc.client_id !== "string" || doc.client_id !== clientIdUrl) return null;
    if (!Array.isArray(doc.redirect_uris) || doc.redirect_uris.length === 0) return null;
    const redirectUris = doc.redirect_uris.filter(
      (u): u is string => typeof u === "string" && isAllowedRedirectUri(u),
    );
    if (redirectUris.length === 0) return null;
    return {
      clientId: clientIdUrl,
      clientName:
        typeof doc.client_name === "string" && doc.client_name.trim()
          ? doc.client_name.trim().slice(0, 128)
          : "MCP Client",
      redirectUris,
      tokenEndpointAuthMethod:
        typeof doc.token_endpoint_auth_method === "string"
          ? doc.token_endpoint_auth_method
          : "none",
      source: "cimd",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve DCR-registered or CIMD URL client_id. */
export async function resolveMcpOauthClient(
  clientId: string,
): Promise<ResolvedMcpOauthClient | null> {
  const id = clientId.trim();
  if (!id) return null;
  if (isHttpsClientId(id)) {
    return fetchCimdClient(id);
  }
  return getDcrClient(id);
}
