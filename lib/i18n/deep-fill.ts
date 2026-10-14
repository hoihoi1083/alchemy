/**
 * Fill holes in a locale catalog from a fallback catalog.
 * Used so zh-tw / zh-cn never crash the studio when a new en/zh string
 * lands before translations are copied (same class of bug as missing
 * videoCreativeModes["social-frame-break"]).
 */
export function deepFillMissing(primary: unknown, fallback: unknown): unknown {
  if (primary === null || primary === undefined) return fallback;
  if (
    fallback === null ||
    fallback === undefined ||
    typeof fallback !== "object" ||
    Array.isArray(fallback)
  ) {
    return primary;
  }
  if (typeof primary !== "object" || Array.isArray(primary)) {
    return primary;
  }

  const out: Record<string, unknown> = {
    ...(primary as Record<string, unknown>),
  };
  for (const [key, fbVal] of Object.entries(fallback as Record<string, unknown>)) {
    if (!(key in out)) {
      out[key] = fbVal;
    } else {
      out[key] = deepFillMissing(out[key], fbVal);
    }
  }
  return out;
}
