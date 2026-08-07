/** Persisted brand assets — logo, colors, fonts — reused across projects. */
export type BrandKit = {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontPreset: "noto" | "pingfang" | "inter";
  tagline: string;
  /**
   * When true and a logo is set: Mode A composites Brand kit logo onto every
   * storyboard still (model picks natural placement; stamp fallback = corner).
   * Default false — no logo unless the user opts in.
   */
  useBrandLogo: boolean;
  updatedAt: string;
};

export const BRAND_KIT_STORAGE_KEY = "alchemy-brand-kit-v1";

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoUrl: null,
  primaryColor: "#10b981",
  secondaryColor: "#0f172a",
  accentColor: "#f59e0b",
  fontPreset: "noto",
  tagline: "",
  useBrandLogo: false,
  updatedAt: new Date(0).toISOString(),
};

export function parseBrandKit(raw: unknown): BrandKit {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRAND_KIT };
  const row = raw as Record<string, unknown>;
  const font = row.fontPreset;
  // Accept legacy endWithBrandLogo from older kits.
  const useBrandLogo = row.useBrandLogo === true || row.endWithBrandLogo === true;
  return {
    logoUrl: typeof row.logoUrl === "string" ? row.logoUrl : null,
    primaryColor: typeof row.primaryColor === "string" ? row.primaryColor : DEFAULT_BRAND_KIT.primaryColor,
    secondaryColor:
      typeof row.secondaryColor === "string" ? row.secondaryColor : DEFAULT_BRAND_KIT.secondaryColor,
    accentColor: typeof row.accentColor === "string" ? row.accentColor : DEFAULT_BRAND_KIT.accentColor,
    fontPreset: font === "pingfang" || font === "inter" ? font : "noto",
    tagline: typeof row.tagline === "string" ? row.tagline : "",
    useBrandLogo,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  };
}

export function brandKitUpdatedAtMs(kit: BrandKit | null | undefined): number {
  if (!kit?.updatedAt) return 0;
  const t = Date.parse(kit.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Cloud hydrate must not wipe a newer local logo/colors.
 * Equal timestamps keep local (avoids race where GET returns mid-upload kit).
 */
export function preferNewerBrandKit(local: BrandKit, remote: BrandKit): BrandKit {
  const localMs = brandKitUpdatedAtMs(local);
  const remoteMs = brandKitUpdatedAtMs(remote);
  if (remoteMs > localMs) return parseBrandKit(remote);
  return parseBrandKit(local);
}

export function isBrandLogoDataUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim().startsWith("data:image/"));
}

/**
 * Merge cloud brand kit into localStorage (newer wins). Safe to call from wizard
 * mount even when BrandKitPanel never opens.
 */
export async function hydrateBrandKitFromCloud(
  seed?: BrandKit,
): Promise<BrandKit> {
  const local = seed ?? loadBrandKitFromStorage();
  if (typeof window === "undefined") return local;
  try {
    const res = await fetch("/api/brand-kit", { credentials: "include" });
    if (!res.ok) return local;
    const data = (await res.json()) as { kit?: BrandKit | null };
    if (!data.kit) return local;
    // Re-read — user may have patched local while the request was in flight.
    const latestLocal = loadBrandKitFromStorage();
    const merged = preferNewerBrandKit(latestLocal, data.kit);
    saveBrandKitToStorage(merged);
    return merged;
  } catch {
    return local;
  }
}

export function loadBrandKitFromStorage(): BrandKit {
  if (typeof window === "undefined") return { ...DEFAULT_BRAND_KIT };
  try {
    const raw = localStorage.getItem(BRAND_KIT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_KIT };
    return parseBrandKit(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BRAND_KIT };
  }
}

export function saveBrandKitToStorage(kit: BrandKit): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      BRAND_KIT_STORAGE_KEY,
      JSON.stringify({ ...kit, updatedAt: kit.updatedAt || new Date().toISOString() }),
    );
  } catch (e) {
    console.warn("[brand-kit] localStorage save failed (quota?)", e);
  }
}
