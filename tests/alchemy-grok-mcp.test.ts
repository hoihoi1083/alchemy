import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alchemyGrokMcpHandler } from "../lib/mcp/alchemy-grok-server";
import {
  hashMcpApiKeyForTests,
  looksLikeMcpApiKey,
  MCP_API_KEY_PREFIX,
} from "../lib/mcp/api-keys";
import { clerkIdFromMcpAuth, mcpAuthRequiredText } from "../lib/mcp/auth";

describe("alchemy grok MCP", () => {
  it("exports a request handler", () => {
    assert.equal(typeof alchemyGrokMcpHandler, "function");
  });

  it("answers initialize over streamable HTTP without a key", async () => {
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
    assert.ok(res.status >= 200 && res.status < 500, `status ${res.status}`);
    const text = await res.text();
    assert.match(text, /alchemy-grok|Alchemy|serverInfo|protocolVersion/i);
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
    assert.match(mcpAuthRequiredText(), /Unauthorized|alk_/);
  });
});
