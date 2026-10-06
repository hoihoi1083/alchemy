import { createHash, randomBytes } from "node:crypto";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export const MCP_API_KEY_PREFIX = "alk_";
const KEY_BYTES = 32;
const MAX_ACTIVE_KEYS = 5;
const LABEL_MAX = 64;

export type McpApiKeyRecord = {
  keyId: string;
  clerkId: string;
  /** sha256 hex of the full secret (never store plaintext). */
  keyHash: string;
  /** First characters of the secret for UI (e.g. alk_a1b2c3d4). */
  prefix: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export type McpApiKeyPublic = {
  keyId: string;
  prefix: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function newKeyId(): string {
  return `mk_${randomBytes(12).toString("hex")}`;
}

function newSecret(): string {
  return `${MCP_API_KEY_PREFIX}${randomBytes(KEY_BYTES).toString("hex")}`;
}

function toPublic(row: McpApiKeyRecord): McpApiKeyPublic {
  return {
    keyId: row.keyId,
    prefix: row.prefix,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

export function looksLikeMcpApiKey(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const t = token.trim();
  return t.startsWith(MCP_API_KEY_PREFIX) && t.length >= MCP_API_KEY_PREFIX.length + 16;
}

/**
 * Create a personal Alchemy MCP API key. Returns the plaintext secret once.
 */
export async function createMcpApiKey(input: {
  clerkId: string;
  label?: string | null;
}): Promise<{ key: McpApiKeyPublic; secret: string }> {
  if (!isMongoConfigured()) {
    throw new Error("Database is not configured.");
  }
  const clerkId = input.clerkId.trim();
  if (!clerkId) throw new Error("Missing user.");

  const label = (input.label?.trim() || "Grok / MCP").slice(0, LABEL_MAX);
  const db = await getDb();
  const col = db.collection<McpApiKeyRecord>("mcp_api_keys");

  const active = await col.countDocuments({
    clerkId,
    revokedAt: null,
  });
  if (active >= MAX_ACTIVE_KEYS) {
    throw new Error(`You can have at most ${MAX_ACTIVE_KEYS} active MCP keys. Revoke one first.`);
  }

  const secret = newSecret();
  const now = new Date();
  const row: McpApiKeyRecord = {
    keyId: newKeyId(),
    clerkId,
    keyHash: hashSecret(secret),
    prefix: secret.slice(0, MCP_API_KEY_PREFIX.length + 8),
    label,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  };
  await col.insertOne(row);
  return { key: toPublic(row), secret };
}

export async function listMcpApiKeys(clerkId: string): Promise<McpApiKeyPublic[]> {
  if (!isMongoConfigured()) return [];
  const db = await getDb();
  const rows = await db
    .collection<McpApiKeyRecord>("mcp_api_keys")
    .find({ clerkId: clerkId.trim() })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return rows.map(toPublic);
}

export async function revokeMcpApiKey(input: {
  clerkId: string;
  keyId: string;
}): Promise<boolean> {
  if (!isMongoConfigured()) return false;
  const db = await getDb();
  const now = new Date();
  const result = await db.collection<McpApiKeyRecord>("mcp_api_keys").findOneAndUpdate(
    {
      clerkId: input.clerkId.trim(),
      keyId: input.keyId.trim(),
      revokedAt: null,
    },
    { $set: { revokedAt: now } },
    { returnDocument: "after" },
  );
  return Boolean(result);
}

export type VerifiedMcpApiKey = {
  clerkId: string;
  keyId: string;
  prefix: string;
  label: string;
};

/**
 * Resolve a Bearer Alchemy MCP key to the owning Clerk user.
 * Touches lastUsedAt (best-effort).
 */
export async function verifyMcpApiKey(
  secret: string | undefined | null,
): Promise<VerifiedMcpApiKey | null> {
  if (!looksLikeMcpApiKey(secret) || !isMongoConfigured()) return null;
  const token = secret!.trim();
  const db = await getDb();
  const row = await db.collection<McpApiKeyRecord>("mcp_api_keys").findOne({
    keyHash: hashSecret(token),
    revokedAt: null,
  });
  if (!row) return null;

  void db
    .collection<McpApiKeyRecord>("mcp_api_keys")
    .updateOne({ keyId: row.keyId }, { $set: { lastUsedAt: new Date() } })
    .catch(() => {
      /* non-fatal */
    });

  return {
    clerkId: row.clerkId,
    keyId: row.keyId,
    prefix: row.prefix,
    label: row.label,
  };
}

/** Test helper — hash without DB. */
export function hashMcpApiKeyForTests(secret: string): string {
  return hashSecret(secret);
}
