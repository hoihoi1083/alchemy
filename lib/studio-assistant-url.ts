const URL_RE =
  /https?:\/\/[^\s<>"')\]]+/i;

export function extractUrlFromText(text: string): string | null {
  const m = text.match(URL_RE);
  if (!m) return null;
  return m[0].replace(/[.,;:!?]+$/, "");
}

export function extractUrlFromMessages(
  messages: Array<{ role: string; content: string }>,
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    const url = extractUrlFromText(msg.content);
    if (url) return url;
  }
  return null;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return url;
  }
}
