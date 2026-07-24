import { ApiError, ValidationError } from "@fal-ai/client";
import { isFalContentPolicyThrowable } from "@/lib/seedance-moderation";

function falDetailSnippet(e: ApiError<unknown> | ValidationError): string {
  try {
    if (e instanceof ValidationError && e.fieldErrors?.length) {
      return e.fieldErrors
        .map((err) => String(err.msg || err.type || "").trim())
        .filter(Boolean)
        .slice(0, 2)
        .join("; ");
    }
    const body = e.body as { detail?: unknown } | undefined;
    const detail = body?.detail;
    if (typeof detail === "string") return detail.trim();
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          if (!d || typeof d !== "object") return String(d ?? "");
          const row = d as { msg?: unknown; type?: unknown };
          return String(row.msg || row.type || "").trim();
        })
        .filter(Boolean)
        .slice(0, 2)
        .join("; ");
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** User-facing fal error — prefer content-policy guidance over bare "Unprocessable Entity". */
export function formatFalGenerationError(e: unknown, fallback = "Generation failed"): string {
  if (e instanceof ApiError || e instanceof ValidationError) {
    const detail = falDetailSnippet(e);
    const requestSuffix = e.requestId ? ` (fal request: ${e.requestId})` : "";
    if (isFalContentPolicyThrowable(e, `${e.message} ${detail}`)) {
      return (
        "fal blocked this scene (content safety). Spa/beauty ads are allowed — avoid faces, treatment-bed body shots, and skin close-ups; use room, towels, products, hands instead." +
        requestSuffix
      );
    }
    const base = detail || e.message || fallback;
    return `${base}${requestSuffix}`;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message) || fallback;
  }
  return fallback;
}
