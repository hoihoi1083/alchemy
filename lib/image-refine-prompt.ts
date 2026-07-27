const TEXT_REMOVAL_RE =
  /\b(?:remove|erase|delete|clear)\b|去掉|移除|刪除|清除|去除/i;

const TEXT_TOPIC_RE =
  /text|logo|caption|watermark|headline|title|copy|wording|字|標題|文字|商標|文案|字體|字型/i;

const TEXT_EDIT_RE =
  /\b(?:change|update|replace|edit|modify|make|bigger|larger|smaller|bold|bolder|font|typography|size)\b|改|換|放大|縮小|加粗|變大|變小/i;

function wantsTextRemoval(note: string): boolean {
  return TEXT_REMOVAL_RE.test(note) && TEXT_TOPIC_RE.test(note);
}

function wantsTextEdit(note: string): boolean {
  return TEXT_TOPIC_RE.test(note) && TEXT_EDIT_RE.test(note) && !wantsTextRemoval(note);
}

/** Targeted edit prompt for nano-banana-2/edit (plain language, not @Image1 tags). */
export function buildImageRefinePrompt(userNote: string): string {
  const note = userNote.trim();
  const parts = [note, "Edit the attached image in place."];
  if (wantsTextRemoval(note)) {
    parts.push(
      "Remove all requested on-image text, logos, and captions.",
      "Repaint those areas so they blend with the surrounding art — no blank boxes or smudges.",
      "Keep the same layout, product, colors, and framing.",
    );
  } else if (wantsTextEdit(note)) {
    parts.push(
      "Update only the on-image typography exactly as described.",
      "Apply the requested wording, size, weight, color, and style for headline or caption text.",
      "Keep the product, layout, background, and framing the same unless the note requires otherwise.",
    );
  } else {
    parts.push(
      "Keep the same layout, product, colors, and framing unless the change above requires otherwise.",
    );
  }
  return parts.join(" ");
}

export type LogoPlacement =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center"
  | "replace";

const LOGO_PLACEMENT_HINT: Record<LogoPlacement, string> = {
  "bottom-right": "Place IMAGE 2 in the bottom-right corner with comfortable margin.",
  "bottom-left": "Place IMAGE 2 in the bottom-left corner with comfortable margin.",
  "top-right": "Place IMAGE 2 in the top-right corner with comfortable margin.",
  "top-left": "Place IMAGE 2 in the top-left corner with comfortable margin.",
  center: "Place IMAGE 2 as a centered brand badge, sized appropriately for a social ad.",
  replace: "Replace any existing brand logo or watermark in IMAGE 1 with IMAGE 2.",
};

export function buildLogoRefinePrompt(opts: {
  placement: LogoPlacement;
  userNote?: string;
}): string {
  const parts = [
    "Two images. IMAGE 1 = the social ad to edit. IMAGE 2 = the brand logo (use exactly as provided).",
    LOGO_PLACEMENT_HINT[opts.placement],
    "Composite IMAGE 2 onto IMAGE 1 with crisp edges and natural integration — do not distort the logo.",
    "Keep IMAGE 1 layout, product, colors, and copy unchanged except where the logo is placed.",
  ];
  const note = opts.userNote?.trim();
  if (note) parts.push(note);
  return parts.join(" ");
}

/**
 * Mode A: second-pass logo composite after a textless still exists.
 * Natural placement — not a forced corner sticker.
 */
export function buildStoryboardLogoModeAPrompt(): string {
  return [
    "Two images. IMAGE 1 = the finished storyboard still. IMAGE 2 = the client's real brand logo PNG.",
    "Composite IMAGE 2 onto IMAGE 1 with natural brand presence (subtle badge, packaging mark, or clean corner — you choose what fits the frame).",
    "Keep IMAGE 2 geometry, colors, and letterforms exact — never redraw or invent alternate letters.",
    "Do not add other logos, watermarks, slogans, or readable marketing copy.",
    "Do not invent gibberish text on phone/laptop screens — leave UI chrome blank if present.",
    "Keep IMAGE 1 composition, product, people, and lighting unchanged except for the logo placement.",
  ].join(" ");
}

/**
 * End-card Mode A: brand logo is the centered hero (not a corner sticker).
 */
export function buildStoryboardEndCardLogoModeAPrompt(): string {
  return [
    "Two images. IMAGE 1 = a clean end-card backdrop. IMAGE 2 = the client's real brand logo PNG — this is the HERO.",
    "Place IMAGE 2 large and perfectly CENTERED as the main subject of the frame (~28–36% of the short side).",
    "Keep IMAGE 2 geometry, colors, and letterforms exact — never redraw, morph, or invent an alternate mark.",
    "Do not invent a second logo, glowing fake wordmark, slogan line, Chinese/Latin copy, or watermark.",
    "Keep a soft premium backdrop; leave lower third fairly clear for burned captions later.",
    "IMAGE 2 is the only brand identity allowed on this still.",
  ].join(" ");
}

/** First-pass still for end cards — empty center reserved for the real logo stamp/edit. */
export function buildStoryboardEndCardStillPrompt(theme?: string): string {
  const mood = theme?.trim() || "premium social brand";
  return [
    "9:16 vertical brand END CARD still for a social ad.",
    `Soft premium gradient backdrop (${mood} mood) — calm, uncluttered, cinematic.`,
    "Leave the CENTER of the frame empty and clear — a logo will be placed there next.",
    "NO product bottle, NO people, NO phone/laptop UI, NO readable text, NO fake logos, NO slogans, NO watermarks.",
    "Empty commercial end-card backdrop only.",
  ].join(" ");
}

export const IMAGE_LOGO_REFINE_SYSTEM_PROMPT = [
  "You are a precise image editor for social ads.",
  "IMAGE 1 is the ad; IMAGE 2 is a logo file to composite onto the ad.",
  "Place the logo cleanly without covering the main product or headline.",
].join(" ");

export const IMAGE_REFINE_SYSTEM_PROMPT = [
  "You are a precise image editor.",
  "Apply only the requested change to the attached image.",
  "When removing text or logos, repaint those regions to match the surrounding illustration.",
  "When changing on-image text, update typography and wording exactly as requested.",
].join(" ");

export function normalizeImageSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("v");
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function isSameImageAsset(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin && ua.pathname === ub.pathname;
  } catch {
    return a === b;
  }
}
