export type ImageEditRegion = {
  id: string;
  /** Left edge, 0–100% of image width */
  xPct: number;
  /** Top edge, 0–100% of image height */
  yPct: number;
  wPct: number;
  hPct: number;
  instruction: string;
};

export const MAX_IMAGE_EDIT_REGIONS = 5;

export function newImageEditRegion(partial?: Partial<ImageEditRegion>): ImageEditRegion {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    xPct: partial?.xPct ?? 10,
    yPct: partial?.yPct ?? 10,
    wPct: partial?.wPct ?? 25,
    hPct: partial?.hPct ?? 15,
    instruction: partial?.instruction ?? "",
  };
}

export function clampRegion(region: ImageEditRegion): ImageEditRegion {
  const wPct = Math.min(90, Math.max(4, region.wPct));
  const hPct = Math.min(90, Math.max(4, region.hPct));
  const xPct = Math.min(100 - wPct, Math.max(0, region.xPct));
  const yPct = Math.min(100 - hPct, Math.max(0, region.yPct));
  return { ...region, xPct, yPct, wPct, hPct };
}

export function regionBoundsLabel(region: ImageEditRegion): string {
  const left = Math.round(region.xPct);
  const top = Math.round(region.yPct);
  const right = Math.round(region.xPct + region.wPct);
  const bottom = Math.round(region.yPct + region.hPct);
  return `horizontal ${left}%–${right}%, vertical ${top}%–${bottom}%`;
}

export function parseImageEditRegions(raw: unknown): ImageEditRegion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Partial<ImageEditRegion>;
      const instruction = typeof r.instruction === "string" ? r.instruction.trim() : "";
      if (!instruction) return null;
      return clampRegion(
        newImageEditRegion({
          id: typeof r.id === "string" ? r.id : undefined,
          xPct: typeof r.xPct === "number" ? r.xPct : undefined,
          yPct: typeof r.yPct === "number" ? r.yPct : undefined,
          wPct: typeof r.wPct === "number" ? r.wPct : undefined,
          hPct: typeof r.hPct === "number" ? r.hPct : undefined,
          instruction,
        }),
      );
    })
    .filter((r): r is ImageEditRegion => r !== null)
    .slice(0, MAX_IMAGE_EDIT_REGIONS);
}

export function buildRegionRefinePrompt(
  regions: ImageEditRegion[],
  hasHintImage: boolean,
): string {
  const parts = [
    "Edit IMAGE 1 in place.",
    "Apply ONLY the localized changes below. Keep every pixel outside each zone unchanged.",
  ];
  if (hasHintImage) {
    parts.push(
      "IMAGE 2 shows numbered red boxes — match each instruction to the same numbered zone on IMAGE 1.",
      "The final output must NOT include red guide boxes or zone numbers.",
    );
  }
  regions.forEach((region, index) => {
    parts.push(`Zone ${index + 1} (${regionBoundsLabel(region)}): ${region.instruction.trim()}`);
  });
  return parts.join(" ");
}

export const IMAGE_REGION_REFINE_SYSTEM_PROMPT = [
  "You are a precise regional image editor for social ads.",
  "Apply each edit only inside the described zone. Preserve product, layout, and colors elsewhere.",
  "When a zone guide image is provided, follow numbered boxes exactly.",
].join(" ");
