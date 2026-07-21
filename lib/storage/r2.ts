import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertSafeRemoteMediaUrl } from "@/lib/pipeline/safe-url";

/**
 * Cloudflare R2 storage (S3-compatible). Private bucket:
 * uploads use the API token; downloads use short-lived signed URLs
 * or an app proxy route. Never expose keys to the client.
 */

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl?: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim() || undefined;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function getClient(config: R2Config): S3Client {
  if (cachedClient && cachedConfig && cachedConfig.endpoint === config.endpoint) {
    return cachedClient;
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedConfig = config;
  return cachedClient;
}

export type R2PutResult = {
  key: string;
  /** Public URL when a public base is configured; otherwise null (use signed URL). */
  url: string | null;
  contentType: string;
};

/** Upload raw bytes to R2 under the given key. */
export async function putR2Object(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<R2PutResult> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");
  const client = getClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  const url = config.publicBaseUrl
    ? `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`
    : null;
  return { key, url, contentType };
}

/** Fetch a remote (fal/CDN) URL and mirror the bytes into R2. */
export async function mirrorRemoteToR2(
  remoteUrl: string,
  key: string,
  fallbackContentType = "application/octet-stream",
): Promise<R2PutResult> {
  // Block SSRF: only allowlisted HTTPS hosts (fal CDN, etc.).
  assertSafeRemoteMediaUrl(remoteUrl);
  const res = await fetch(remoteUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source (${res.status}) for R2 mirror.`);
  }
  const contentType = res.headers.get("content-type") || fallbackContentType;
  const ct = contentType.toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/json")) {
    throw new Error(`Refusing to mirror non-media content-type: ${contentType}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // Guard against error pages mislabeled as images.
  if (
    buf.length >= 2 &&
    buf[0] === 0x3c &&
    (buf[1] === 0x21 || buf[1] === 0x68 || buf[1] === 0x48)
  ) {
    throw new Error("Refusing to mirror HTML body as media.");
  }
  return putR2Object(key, buf, contentType);
}

/** Short-lived signed GET URL for a private object. */
export async function signR2GetUrl(
  key: string,
  expiresInSec = 3600,
  options?: { downloadFilename?: string; contentType?: string },
): Promise<string> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");
  const client = getClient(config);
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ...(options?.downloadFilename
        ? {
            ResponseContentDisposition: `attachment; filename="${options.downloadFilename.replace(/"/g, "")}"`,
          }
        : {}),
      ...(options?.contentType ? { ResponseContentType: options.contentType } : {}),
    }),
    { expiresIn: expiresInSec },
  );
}

export async function getR2ObjectBytes(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");
  const client = getClient(config);
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );
    const body = await res.Body?.transformToByteArray();
    if (!body) return null;
    return { body, contentType: res.ContentType || "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");
  const client = getClient(config);
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
