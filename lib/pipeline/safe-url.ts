function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "[::1]") return true;
  if (host === "0.0.0.0") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map((n) => Number.parseInt(n, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // Block obvious private/internal hostnames.
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home")
  ) {
    return true;
  }

  return false;
}

function isAllowedRemoteHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const allowed = [
    "fal.media",
    "fal.ai",
    "fal.run",
    "falcdn.net",
    "storage.googleapis.com",
    "googleusercontent.com",
  ];
  return allowed.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function isFalCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("fal.media") ||
      host.includes("falcdn.net") ||
      host.endsWith(".fal.ai") ||
      host === "fal.ai"
    );
  } catch {
    return false;
  }
}

export function isPipelineFileUrl(url: string): boolean {
  return url.includes("/api/pipeline-files/");
}

export function assertSafeRemoteMediaUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid media URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS media URLs are allowed.");
  }
  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error("Private or local network media URLs are not allowed.");
  }
  if (!isAllowedRemoteHost(parsed.hostname)) {
    throw new Error("Untrusted media host.");
  }

  return parsed;
}
