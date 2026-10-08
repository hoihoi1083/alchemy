import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alchemyGrokMcpHandler } from "../lib/mcp/alchemy-grok-server";
import {
  hashMcpApiKeyForTests,
  looksLikeMcpApiKey,
  MCP_API_KEY_PREFIX,
} from "../lib/mcp/api-keys";
import { clerkIdFromMcpAuth, mcpAuthRequiredText } from "../lib/mcp/auth";
import { estimateCampaignTokens } from "../lib/billing/token-costs";
import { resolveMcpMediaUrl } from "../lib/mcp/library";
import { parsePublicHttpsMediaUrl } from "../lib/mcp/public-media-url";
import { libraryAssetIdFromUrl } from "../lib/storage/library-asset-url";

describe("alchemy grok MCP", () => {
  it("exports a request handler", () => {
    assert.equal(typeof alchemyGrokMcpHandler, "function");
  });

  it("challenges unauthenticated initialize with OAuth metadata", async () => {
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
          clientInfo: { name: "alchemy-test", version: "0.0.1" },
        },
      }),
    });
    const res = await alchemyGrokMcpHandler(req);
    assert.equal(res.status, 401);
    assert.match(res.headers.get("www-authenticate") || "", /resource_metadata=/i);
  });

  it("recognizes alk_ key shape and hashes deterministically", () => {
    const secret = `${MCP_API_KEY_PREFIX}${"ab".repeat(32)}`;
    assert.equal(looksLikeMcpApiKey(secret), true);
    assert.equal(looksLikeMcpApiKey("sk-openai"), false);
    const a = hashMcpApiKeyForTests(secret);
    const b = hashMcpApiKeyForTests(secret);
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it("reads clerkId from AuthInfo.extra", () => {
    assert.equal(clerkIdFromMcpAuth(undefined), null);
    assert.equal(
      clerkIdFromMcpAuth({
        token: "alk_x",
        clientId: "mk_1",
        scopes: [],
        extra: { clerkId: "user_123" },
      }),
      "user_123",
    );
    assert.match(mcpAuthRequiredText(), /Unauthorized|OAuth|alk_/);
  });
});

describe("mcp public media urls", () => {
  it("accepts https and rejects localhost", () => {
    assert.ok(parsePublicHttpsMediaUrl("https://cdn.example.com/car.png"));
    assert.equal(parsePublicHttpsMediaUrl("http://cdn.example.com/car.png"), null);
    assert.equal(parsePublicHttpsMediaUrl("https://localhost/x.png"), null);
    assert.equal(parsePublicHttpsMediaUrl("/tmp/car.png"), null);
  });
});

describe("mcp library + campaign", () => {
  it("extracts library asset ids from durable URLs", () => {
    const id = "507f1f77bcf86cd799439011";
    assert.equal(libraryAssetIdFromUrl(`/api/library/download/${id}`), id);
    assert.equal(
      libraryAssetIdFromUrl(`https://www.alchemyailab.com/api/library/download/${id}?inline=1`),
      id,
    );
  });

  it("requires a public URL or library id", async () => {
    const res = await resolveMcpMediaUrl({ clerkId: "user_x" });
    assert.equal(res.ok, false);
    if (!res.ok) assert.match(res.error, /image_url|library_asset_id/);
  });

  it("rejects localhost image_url", async () => {
    const res = await resolveMcpMediaUrl({
      clerkId: "user_x",
      imageUrl: "https://localhost/x.png",
    });
    assert.equal(res.ok, false);
  });

  it("campaign token estimate is plan + 3 stills", () => {
    const n = estimateCampaignTokens("1K");
    assert.ok(n > 100);
    assert.equal(n, estimateCampaignTokens("1K"));
  });
});
