import { createHash, randomBytes } from "node:crypto";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  MCP_ACCESS_TOKEN_PREFIX,
  MCP_ACCESS_TOKEN_TTL_SEC,
  MCP_AUTH_CODE_PREFIX,
  MCP_AUTH_CODE_TTL_MS,
  MCP_DCR_CLIENT_PREFIX,
  MCP_OAUTH_SCOPE_STRING,
  MCP_REFRESH_TOKEN_PREFIX,
  MCP_REFRESH_TOKEN_TTL_MS,
} from "@/lib/mcp/oauth/config";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function newId(prefix: string, bytes = 24): string {
  return `${prefix}${randomBytes(bytes).toString("hex")}`;
}

export type McpOauthClientRecord = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod: string;
  /** dcr | cimd */
  source: "dcr" | "cimd";
  createdAt: Date;
};

export type McpOauthAuthCodeRecord = {
  codeHash: string;
  clientId: string;
  clerkId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  scope: string;
  resource: string;
  state: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export type McpOauthAccessTokenRecord = {
  tokenHash: string;
  tokenPrefix: string;
  clientId: string;
  clerkId: string;
  scope: string;
  resource: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export type McpOauthRefreshTokenRecord = {
  tokenHash: string;
  clientId: string;
  clerkId: string;
  scope: string;
  resource: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export type ResolvedMcpOauthClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: string;
  source: "dcr" | "cimd";
};

export function looksLikeMcpAccessToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const t = token.trim();
  return t.startsWith(MCP_ACCESS_TOKEN_PREFIX) && t.length >= MCP_ACCESS_TOKEN_PREFIX.length + 16;
}

export async function ensureMcpOauthIndexes(): Promise<void> {
  if (!isMongoConfigured()) return;
  const db = await getDb();
  await Promise.all([
    db.collection("mcp_oauth_clients").createIndex({ clientId: 1 }, { unique: true }),
    db.collection("mcp_oauth_auth_codes").createIndex({ codeHash: 1 }, { unique: true }),
    db.collection("mcp_oauth_auth_codes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("mcp_oauth_access_tokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("mcp_oauth_refresh_tokens").createIndex({ tokenHash: 1 }, { unique: true }),
  ]).catch(() => {
    /* best-effort */
  });
}

export async function registerDcrClient(input: {
  clientName: string;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  tokenEndpointAuthMethod?: string;
}): Promise<ResolvedMcpOauthClient> {
  if (!isMongoConfigured()) throw new Error("Database is not configured.");
  await ensureMcpOauthIndexes();
  const clientId = newId(MCP_DCR_CLIENT_PREFIX, 16);
  const row: McpOauthClientRecord = {
    clientId,
    clientName: input.clientName.slice(0, 128) || "MCP Client",
    redirectUris: input.redirectUris,
    grantTypes: input.grantTypes?.length ? input.grantTypes : ["authorization_code", "refresh_token"],
    responseTypes: input.responseTypes?.length ? input.responseTypes : ["code"],
    tokenEndpointAuthMethod: input.tokenEndpointAuthMethod || "none",
    source: "dcr",
    createdAt: new Date(),
  };
  const db = await getDb();
  await db.collection<McpOauthClientRecord>("mcp_oauth_clients").insertOne(row);
  return {
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUris: row.redirectUris,
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    source: "dcr",
  };
}

export async function getDcrClient(clientId: string): Promise<ResolvedMcpOauthClient | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const row = await db.collection<McpOauthClientRecord>("mcp_oauth_clients").findOne({
    clientId: clientId.trim(),
  });
  if (!row) return null;
  return {
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUris: row.redirectUris,
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    source: row.source,
  };
}

export async function createAuthCode(input: {
  clientId: string;
  clerkId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
  state?: string | null;
}): Promise<string> {
  if (!isMongoConfigured()) throw new Error("Database is not configured.");
  await ensureMcpOauthIndexes();
  const code = newId(MCP_AUTH_CODE_PREFIX, 24);
  const now = new Date();
  const row: McpOauthAuthCodeRecord = {
    codeHash: hashSecret(code),
    clientId: input.clientId,
    clerkId: input.clerkId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: "S256",
    scope: input.scope || MCP_OAUTH_SCOPE_STRING,
    resource: input.resource,
    state: input.state ?? null,
    expiresAt: new Date(now.getTime() + MCP_AUTH_CODE_TTL_MS),
    createdAt: now,
  };
  const db = await getDb();
  await db.collection<McpOauthAuthCodeRecord>("mcp_oauth_auth_codes").insertOne(row);
  return code;
}

export async function consumeAuthCode(code: string): Promise<McpOauthAuthCodeRecord | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const row = await db.collection<McpOauthAuthCodeRecord>("mcp_oauth_auth_codes").findOneAndDelete({
    codeHash: hashSecret(code.trim()),
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export type IssuedMcpOauthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  tokenType: "Bearer";
};

export async function issueTokens(input: {
  clientId: string;
  clerkId: string;
  scope: string;
  resource: string;
}): Promise<IssuedMcpOauthTokens> {
  if (!isMongoConfigured()) throw new Error("Database is not configured.");
  await ensureMcpOauthIndexes();
  const accessToken = newId(MCP_ACCESS_TOKEN_PREFIX, 32);
  const refreshToken = newId(MCP_REFRESH_TOKEN_PREFIX, 32);
  const now = new Date();
  const accessExpires = new Date(now.getTime() + MCP_ACCESS_TOKEN_TTL_SEC * 1000);
  const refreshExpires = new Date(now.getTime() + MCP_REFRESH_TOKEN_TTL_MS);

  const accessRow: McpOauthAccessTokenRecord = {
    tokenHash: hashSecret(accessToken),
    tokenPrefix: accessToken.slice(0, MCP_ACCESS_TOKEN_PREFIX.length + 8),
    clientId: input.clientId,
    clerkId: input.clerkId,
    scope: input.scope || MCP_OAUTH_SCOPE_STRING,
    resource: input.resource,
    expiresAt: accessExpires,
    revokedAt: null,
    createdAt: now,
    lastUsedAt: null,
  };
  const refreshRow: McpOauthRefreshTokenRecord = {
    tokenHash: hashSecret(refreshToken),
    clientId: input.clientId,
    clerkId: input.clerkId,
    scope: input.scope || MCP_OAUTH_SCOPE_STRING,
    resource: input.resource,
    expiresAt: refreshExpires,
    revokedAt: null,
    createdAt: now,
  };

  const db = await getDb();
  await Promise.all([
    db.collection<McpOauthAccessTokenRecord>("mcp_oauth_access_tokens").insertOne(accessRow),
    db.collection<McpOauthRefreshTokenRecord>("mcp_oauth_refresh_tokens").insertOne(refreshRow),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: MCP_ACCESS_TOKEN_TTL_SEC,
    scope: accessRow.scope,
    tokenType: "Bearer",
  };
}

export async function refreshAccessToken(input: {
  refreshToken: string;
  clientId: string;
  resource?: string | null;
}): Promise<IssuedMcpOauthTokens | null> {
  if (!isMongoConfigured()) return null;
  const token = input.refreshToken.trim();
  if (!token.startsWith(MCP_REFRESH_TOKEN_PREFIX)) return null;

  const db = await getDb();
  const row = await db.collection<McpOauthRefreshTokenRecord>("mcp_oauth_refresh_tokens").findOne({
    tokenHash: hashSecret(token),
    revokedAt: null,
  });
  if (!row) return null;
  if (row.clientId !== input.clientId) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  if (input.resource && row.resource && normalizeResource(input.resource) !== normalizeResource(row.resource)) {
    return null;
  }

  return issueTokens({
    clientId: row.clientId,
    clerkId: row.clerkId,
    scope: row.scope,
    resource: row.resource,
  });
}

export type VerifiedMcpOauthAccess = {
  clerkId: string;
  clientId: string;
  scope: string;
  resource: string;
  expiresAt: number;
};

export async function verifyMcpOauthAccessToken(
  secret: string | undefined | null,
): Promise<VerifiedMcpOauthAccess | null> {
  if (!looksLikeMcpAccessToken(secret) || !isMongoConfigured()) return null;
  const token = secret!.trim();
  const db = await getDb();
  const row = await db.collection<McpOauthAccessTokenRecord>("mcp_oauth_access_tokens").findOne({
    tokenHash: hashSecret(token),
    revokedAt: null,
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  void db
    .collection<McpOauthAccessTokenRecord>("mcp_oauth_access_tokens")
    .updateOne({ tokenHash: row.tokenHash }, { $set: { lastUsedAt: new Date() } })
    .catch(() => {
      /* non-fatal */
    });

  return {
    clerkId: row.clerkId,
    clientId: row.clientId,
    scope: row.scope,
    resource: row.resource,
    expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
  };
}

export function normalizeResource(resource: string): string {
  return resource.trim().replace(/\/$/, "").toLowerCase();
}

/** Test helper */
export function hashMcpOauthSecretForTests(secret: string): string {
  return hashSecret(secret);
}
