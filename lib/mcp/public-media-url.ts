const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

/**
 * Remote MCP clients (Grok Bot) must pass a public HTTPS URL fal can fetch.
 * Reject private / loopback hosts to avoid SSRF into our VPC.
 */
export function parsePublicHttpsMediaUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local")) return null;
  if (/^(10\.|192\.168\.|169\.254\.)/.test(host)) return null;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
  return url.toString();
}

export const MCP_IMAGE_RATIOS = new Set([
  "1:1",
  "9:16",
  "16:9",
  "4:5",
  "5:4",
  "3:4",
  "4:3",
  "3:2",
  "2:3",
]);

export function mcpAspectRatio(raw: string | null | undefined, fallback = "9:16"): string {
  const v = raw?.trim();
  return v && MCP_IMAGE_RATIOS.has(v) ? v : fallback;
}
