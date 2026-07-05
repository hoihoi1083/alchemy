import { ApiClientError } from "@/lib/api/errors";

async function parseJsonResponse(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err.trim();
  }
  return status >= 500 ? "Server error" : "Request failed";
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
  return data as T;
}

export async function apiPostForm<T>(path: string, fd: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body: fd });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new ApiClientError(extractErrorMessage(data, res.status), res.status, data);
  }
  return data as T;
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new ApiClientError("Could not download file", res.status);
  return res.blob();
}
