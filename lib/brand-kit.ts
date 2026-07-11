/** Persisted brand assets — logo, colors, fonts — reused across projects. */
export type BrandKit = {
  logoUrl: string | null;
  logoPipelinePath: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontPreset: "noto" | "pingfang" | "inter";
  tagline: string;
  updatedAt: string;
};

export const BRAND_KIT_STORAGE_KEY = "alchemy-brand-kit-v1";

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoUrl: null,
  logoPipelinePath: null,
  primaryColor: "#10b981",
  secondaryColor: "#0f172a",
  accentColor: "#f59e0b",
  fontPreset: "noto",
  tagline: "",
  updatedAt: new Date(0).toISOString(),
};

export function parseBrandKit(raw: unknown): BrandKit {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRAND_KIT };
  const row = raw as Record<string, unknown>;
  const font = row.fontPreset;
  return {
    logoUrl: typeof row.logoUrl === "string" ? row.logoUrl : null,
    logoPipelinePath: typeof row.logoPipelinePath === "string" ? row.logoPipelinePath : null,
    primaryColor: typeof row.primaryColor === "string" ? row.primaryColor : DEFAULT_BRAND_KIT.primaryColor,
    secondaryColor:
      typeof row.secondaryColor === "string" ? row.secondaryColor : DEFAULT_BRAND_KIT.secondaryColor,
    accentColor: typeof row.accentColor === "string" ? row.accentColor : DEFAULT_BRAND_KIT.accentColor,
    fontPreset: font === "pingfang" || font === "inter" ? font : "noto",
    tagline: typeof row.tagline === "string" ? row.tagline : "",
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  };
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
  localStorage.setItem(
    BRAND_KIT_STORAGE_KEY,
    JSON.stringify({ ...kit, updatedAt: new Date().toISOString() }),
  );
}
