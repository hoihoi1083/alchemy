import {
  MCP_OAUTH_SCOPES,
  mcpAuthorizationEndpoint,
  mcpIssuerUrl,
  mcpRegistrationEndpoint,
  mcpResourceUrl,
  mcpTokenEndpoint,
} from "@/lib/mcp/oauth/config";

/** RFC 9728 Protected Resource Metadata */
export function mcpProtectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [mcpIssuerUrl()],
    scopes_supported: [...MCP_OAUTH_SCOPES],
    bearer_methods_supported: ["header"],
    resource_documentation: `${mcpIssuerUrl()}/account`,
  };
}

/** RFC 8414 Authorization Server Metadata */
export function mcpAuthorizationServerMetadata() {
  return {
    issuer: mcpIssuerUrl(),
    authorization_endpoint: mcpAuthorizationEndpoint(),
    token_endpoint: mcpTokenEndpoint(),
    registration_endpoint: mcpRegistrationEndpoint(),
    scopes_supported: [...MCP_OAUTH_SCOPES],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
  };
}
