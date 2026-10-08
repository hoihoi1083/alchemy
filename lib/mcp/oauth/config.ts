import { PRODUCT_NAME, PRODUCT_SITE_URL, productSiteUrl } from "@/lib/brand";

/** OAuth 2.1 scopes for Alchemy MCP. */
export const MCP_OAUTH_SCOPES = ["alchemy:generate"] as const;
export type McpOauthScope = (typeof MCP_OAUTH_SCOPES)[number];

export const MCP_OAUTH_SCOPE_STRING = MCP_OAUTH_SCOPES.join(" ");

/** Authorization code TTL. */
export const MCP_AUTH_CODE_TTL_MS = 10 * 60 * 1000;
/** Access token TTL. */
export const MCP_ACCESS_TOKEN_TTL_SEC = 60 * 60;
/** Refresh token TTL. */
export const MCP_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const MCP_ACCESS_TOKEN_PREFIX = "ato_";
export const MCP_REFRESH_TOKEN_PREFIX = "rto_";
export const MCP_AUTH_CODE_PREFIX = "mcc_";
export const MCP_DCR_CLIENT_PREFIX = "mcl_";

export function mcpIssuerUrl(): string {
  return productSiteUrl().replace(/\/$/, "");
}

export function mcpResourceUrl(): string {
  return `${mcpIssuerUrl()}/api/grok-mcp`;
}

export function mcpAuthorizationEndpoint(): string {
  return `${mcpIssuerUrl()}/oauth/mcp/authorize`;
}

export function mcpTokenEndpoint(): string {
  return `${mcpIssuerUrl()}/api/mcp/oauth/token`;
}

export function mcpRegistrationEndpoint(): string {
  return `${mcpIssuerUrl()}/api/mcp/oauth/register`;
}

export function mcpProtectedResourceMetadataPath(): string {
  return "/.well-known/oauth-protected-resource/api/grok-mcp";
}

export function mcpProtectedResourceMetadataUrl(): string {
  return `${mcpIssuerUrl()}${mcpProtectedResourceMetadataPath()}`;
}

export function mcpOauthServiceName(): string {
  return PRODUCT_NAME;
}

/** Canonical prod resource (for docs / account UI). */
export const MCP_PUBLIC_RESOURCE_URL = `${PRODUCT_SITE_URL.replace(/\/$/, "")}/api/grok-mcp`;
