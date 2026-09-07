/**
 * Magic Expand — compute per-side outpaint pixels to hit a target aspect ratio
 * while keeping the original image centered (letterbox-style expand).
 */

export type ExpandPresetId = "square" | "story" | "landscape" | "wider";

export type ExpandPreset = {
  id: ExpandPresetId;
  /** Target width / height */
  aspect: number;
  labelKey: "expandSquare" | "expandStory" | "expandLandscape" | "expandWider";
};

export const EXPAND_PRESETS: ExpandPreset[] = [
  { id: "square", aspect: 1, labelKey: "expandSquare" },
  { id: "story", aspect: 9 / 16, labelKey: "expandStory" },
  { id: "landscape", aspect: 16 / 9, labelKey: "expandLandscape" },
  { id: "wider", aspect: 4 / 5, labelKey: "expandWider" },
];

export type ExpandSides = {
  expand_left: number;
  expand_right: number;
  expand_top: number;
  expand_bottom: number;
  targetW: number;
  targetH: number;
};

/**
 * Grow canvas to match `targetAspect` (w/h), never shrink the source.
 * Caps each side so fal outpaint stays within ~700px per side when possible.
 */
export function computeExpandSides(
  imgW: number,
  imgH: number,
  targetAspect: number,
  opts?: { maxSidePad?: number },
): ExpandSides {
  const maxPad = opts?.maxSidePad ?? 700;
  const srcAspect = imgW / Math.max(1, imgH);
  let targetW = imgW;
  let targetH = imgH;

  if (Math.abs(srcAspect - targetAspect) < 0.02) {
    // Already close — nudge all sides slightly for a true “expand” feel.
    const pad = Math.min(maxPad, Math.max(48, Math.round(Math.min(imgW, imgH) * 0.12)));
    return {
      expand_left: pad,
      expand_right: pad,
      expand_top: pad,
      expand_bottom: pad,
      targetW: imgW + pad * 2,
      targetH: imgH + pad * 2,
    };
  }

  if (srcAspect > targetAspect) {
    // Too wide → grow height
    targetH = Math.ceil(imgW / targetAspect);
    targetW = imgW;
  } else {
    // Too tall → grow width
    targetW = Math.ceil(imgH * targetAspect);
    targetH = imgH;
  }

  let left = Math.floor((targetW - imgW) / 2);
  let right = targetW - imgW - left;
  let top = Math.floor((targetH - imgH) / 2);
  let bottom = targetH - imgH - top;

  // If a side exceeds fal-friendly pad, scale the whole expansion down.
  const peak = Math.max(left, right, top, bottom);
  if (peak > maxPad) {
    const scale = maxPad / peak;
    left = Math.floor(left * scale);
    right = Math.floor(right * scale);
    top = Math.floor(top * scale);
    bottom = Math.floor(bottom * scale);
    targetW = imgW + left + right;
    targetH = imgH + top + bottom;
  }

  return {
    expand_left: Math.max(0, left),
    expand_right: Math.max(0, right),
    expand_top: Math.max(0, top),
    expand_bottom: Math.max(0, bottom),
    targetW,
    targetH,
  };
}

export function presetById(id: string): ExpandPreset | undefined {
  return EXPAND_PRESETS.find((p) => p.id === id);
}

/** Bill expand by rounded output megapixels (floor of inpaint band). */
export function estimateExpandTokens(outputMp: number): number {
  const mp = Math.max(1, Math.ceil(outputMp));
  // Keep in sync with TOKEN_COST.inpaint / fal outpaint COGS (~$0.03+/MP).
  return Math.max(41, Math.ceil(mp * 41));
}
