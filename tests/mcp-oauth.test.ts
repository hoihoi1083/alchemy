import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedRedirectUri } from "../lib/mcp/oauth/clients";
import {
  MCP_ACCESS_TOKEN_PREFIX,
  MCP_OAUTH_SCOPES,
  mcpAuthorizationEndpoint,
  mcpProtectedResourceMetadataPath,
  mcpResourceUrl,
  mcpTokenEndpoint,
} from "../lib/mcp/oauth/config";
import {
  mcpAuthorizationServerMetadata,
  mcpProtectedResourceMetadata,
} from "../lib/mcp/oauth/metadata";
import { pkceS256Challenge, verifyPkceS256 } from "../lib/mcp/oauth/pkce";
import { looksLikeMcpAccessToken } from "../lib/mcp/oauth/store";
import { alchemyGrokMcpHandler } from "../lib/mcp/alchemy-grok-server";

describe("mcp oauth helpers", () => {
  it("allows https and loopback redirect URIs", () => {
    assert.equal(isAllowedRedirectUri("https://grok.x.ai/oauth/callback"), true);
    assert.equal(isAllowedRedirectUri("http://127.0.0.1:8787/callback"), true);
    assert.equal(isAllowedRedirectUri("http://localhost:3000/cb"), true);
    assert.equal(isAllowedRedirectUri("cursor://oauth/callback"), true);
    assert.equal(isAllowedRedirectUri("http://evil.example/cb"), false);
    assert.equal(isAllowedRedirectUri("javascript:alert(1)"), false);
  });

  it("verifies PKCE S256", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = pkceS256Challenge(verifier);
    assert.equal(verifyPkceS256(verifier, challenge), true);
    assert.equal(verifyPkceS256("wrong", challenge), false);
  });

  it("advertises AS + PRM metadata", () => {
    const prm = mcpProtectedResourceMetadata();
    assert.equal(prm.resource, mcpResourceUrl());
    assert.ok(prm.authorization_servers.length >= 1);
    assert.deepEqual(prm.scopes_supported, [...MCP_OAUTH_SCOPES]);

    const as = mcpAuthorizationServerMetadata();
    assert.equal(as.authorization_endpoint, mcpAuthorizationEndpoint());
    assert.equal(as.token_endpoint, mcpTokenEndpoint());
    assert.equal(as.code_challenge_methods_supported.includes("S256"), true);
    assert.equal(as.client_id_metadata_document_supported, true);
  });

  it("recognizes ato_ access token shape", () => {
    assert.equal(looksLikeMcpAccessToken(`${MCP_ACCESS_TOKEN_PREFIX}${"ab".repeat(32)}`), true);
    assert.equal(looksLikeMcpAccessToken("alk_abc"), false);
  });
});

describe("mcp oauth challenge", () => {
  it("returns 401 + WWW-Authenticate without a bearer token", async () => {
    const req = new Request("http://localhost/api/grok-mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "alchemy-oauth-test", version: "0.0.1" },
        },
      }),
    });
    const res = await alchemyGrokMcpHandler(req);
    assert.equal(res.status, 401);
    const www = res.headers.get("www-authenticate") || "";
    assert.match(www, /Bearer/i);
    assert.match(www, /resource_metadata=/i);
    assert.match(www, new RegExp(mcpProtectedResourceMetadataPath().replace(/\//g, "\\/")));
  });
});
