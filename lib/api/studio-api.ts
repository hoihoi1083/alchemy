import { ApiClientError } from "@/lib/api/errors";
import {
  notifyCreditBalance,
  readCreditBalanceFromResponse,
} from "@/lib/credits-client";

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (
      res.status === 413 ||
      /request entity too large|payload too large|entity too large/i.test(text)
    ) {
      return {
        error:
          "Upload too large for this server. Use shorter clips or fewer/smaller images, then try again.",
        code: "REQUEST_TOO_LARGE",
      };
    }
    return {
      error: text.slice(0, 160) || (res.status >= 500 ? "Server error" : "Request failed"),
    };
  }
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err.trim();
  }
  return status >= 500 ? "Server error" : "Request failed";
}

function syncCreditsFromBody(data: unknown): void {
  notifyCreditBalance(readCreditBalanceFromResponse(data));
}

export async function apiPostJson<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
    ...init,
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new ApiClientError(extractErrorMessage(data, res.status), res.status, data);
  }
  syncCreditsFromBody(data);
  return data as T;
}

export async function apiPostForm<T>(path: string, fd: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body: fd });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new ApiClientError(extractErrorMessage(data, res.status), res.status, data);
  }
  syncCreditsFromBody(data);
  return data as T;
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new ApiClientError("Could not download file", res.status);
  return res.blob();
}
