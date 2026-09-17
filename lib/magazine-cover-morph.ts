/**
 * Magazine cover morph (杂志封面变装) — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (诗泳研AI XHS): fashion-magazine cover chrome · masthead BEHIND the head ·
 * cover lines beside the subject · outfit-change morph, same face.
 * Dual-frame identity recipe (same family as type-behind / wet-glass).
 *
 * ─── Generate contract ───────────────────────────────────────────────────────
 * Required
 *   · Hero still (IMAGE 1) — identity lock; never invent a replacement face/SKU
 *       Concept (primary): person / brand figure still (face readable)
 *       Product: person+SKU still preferred; SKU-only → cover hero is the product
 *   · Headline — becomes the masthead (AURA / DREAM VISUAL / VELVET MODE energy)
 * Optional
 *   · Business — fallback masthead token
 *   · Dialect — auto | red-masthead | pastel-dream | dark-velvet
 *   · Duration — 6 | 8 (default 8); no "auto"
 * Locked
 *   · Engine MiniMax H3 · still AR 3:4 · video AR 9:16 · BGM after H3
 * Pipeline
 *   1) Start still — magazine cover, IMAGE 1 face + IMAGE 1 outfit (or SKU look)
 *   2) End still — SAME face / SKU, NEW editorial outfit or look, SAME cover chrome
 *   3) H3 morph — outfit-change transition; cover layout locked
 * What AI may invent: wardrobe, cover type chrome, studio void — never a new face/SKU.
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const MAGAZINE_COVER_MORPH_DURATION_OPTIONS = ["6", "8"] as const;
export const MAGAZINE_COVER_MORPH_DURATION_SEC = 8;

export function clampMagazineCoverMorphDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 8;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.round(n) <= 6 ? 6 : 8;
}

export function magazineCoverMorphDurationOptions(): VideoDuration[] {
  return [...MAGAZINE_COVER_MORPH_DURATION_OPTIONS];
}

export const MAGAZINE_COVER_MORPH_DIALECT_IDS = [
  "red-masthead",
  "pastel-dream",
  "dark-velvet",
] as const;

export type MagazineCoverMorphDialectId =
  (typeof MAGAZINE_COVER_MORPH_DIALECT_IDS)[number];
export type MagazineCoverMorphDialectPick = MagazineCoverMorphDialectId | "auto";

export function magazineCoverMorphDialectPreviewSrc(
  id: MagazineCoverMorphDialectId,
): string {
  return `/images/studio/schemes/magazine-cover-morph/${id}.png?v=1`;
}

export function isMagazineCoverMorphDialectId(
  value: string | null | undefined,
): value is MagazineCoverMorphDialectId {
  return (MAGAZINE_COVER_MORPH_DIALECT_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseMagazineCoverMorphDialectPick(
  raw: unknown,
): MagazineCoverMorphDialectPick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isMagazineCoverMorphDialectId(s) ? s : "auto";
}

export function resolveMagazineCoverMorphDialect(input: {
  pick: MagazineCoverMorphDialectPick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): MagazineCoverMorphDialectId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (/pastel|dream|pink|soft|花|粉|梦|夢/.test(text)) {
    return "pastel-dream";
  }
  if (/velvet|dark|edgy|leather|黑|丝绒|絲絨|暗/.test(text)) {
    return "dark-velvet";
  }
  return "red-masthead";
}

export type MagazineCoverMorphFrame = "start" | "end";

export const MAGAZINE_MASTHEAD_MAX = 18;

export function sanitizeMagazineMasthead(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cleaned = t.replace(/[^\w\s\u4e00-\u9fff-]/g, "").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, MAGAZINE_MASTHEAD_MAX).toUpperCase();
}

export function resolveMagazineMasthead(input: {
  headline?: string;
  business?: string;
  product?: string;
  dialect: MagazineCoverMorphDialectId;
}): string {
  const fromHeadline = sanitizeMagazineMasthead(input.headline ?? "");
  const fromBusiness = sanitizeMagazineMasthead(input.business ?? "");
  const fromProduct = sanitizeMagazineMasthead(input.product ?? "");
  if (fromHeadline) return fromHeadline;
  if (fromBusiness) return fromBusiness;
  if (fromProduct) return fromProduct;
  if (input.dialect === "pastel-dream") return "DREAM VISUAL";
  if (input.dialect === "dark-velvet") return "VELVET MODE";
  return "VISUAL MODE";
}

type DialectDef = {
  id: MagazineCoverMorphDialectId;
  label: string;
  look: string;
  startOutfit: string;
  endOutfit: string;
  videoLead: string;
};

const LOCKED_CAMERA =
  "Fixed front magazine cover camera — no zoom, no pan, no orbit. Cover geometry stays locked.";

const Z_ORDER =
  "Z-ORDER: giant masthead sits BEHIND the subject's head/hair (letters occluded where they overlap). " +
  "Cover-line columns sit BESIDE the subject on the white void — never as a caption bar over the face. " +
  "Hero cutout is IN FRONT of the masthead.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same camera, masthead spelling, cover-line layout, studio void, and face/SKU identity. " +
  "Change ONLY wardrobe / editorial look (outfit-change). No new person, no new SKU, no new masthead word.";

const SCHEMES: Record<MagazineCoverMorphDialectId, DialectDef> = {
  "red-masthead": {
    id: "red-masthead",
    label: "Red masthead",
    look:
      "High-fashion magazine cover on a clean WHITE studio void. Giant RED serif masthead. " +
      "Black cover-line columns left and right (sparse, high-end Vogue energy). No social UI.",
    startOutfit:
      "START: wear the EXACT outfit / silhouette from IMAGE 1 — keep those clothes, hair, and styling. " +
      "Centered editorial pose, mid-thigh or waist-up. Face matches IMAGE 1.",
    endOutfit:
      "END: SAME face, hair color, body, and identity — NEW complementary editorial outfit " +
      "(street leather / graphic crop / editorial accessories). Pose may shift slightly. Masthead unchanged.",
    videoLead:
      "Locked magazine cover. Outfit-change morph only: clothes transition from Image 1 look to Image 2 look. " +
      "Face, masthead, cover lines, and studio void stay locked. No hard cut, no montage.",
  },
  "pastel-dream": {
    id: "pastel-dream",
    label: "Pastel dream",
    look:
      "Soft feminine magazine cover — white void, PINK serif masthead, airy pastel wardrobe world. " +
      "Cover lines in black + pink italic. Clean, bright, editorial.",
    startOutfit:
      "START: keep IMAGE 1 outfit and face. Soft centered fashion pose.",
    endOutfit:
      "END: SAME face and identity — NEW pastel / lace / fuzzy-cardigan editorial look. Masthead unchanged.",
    videoLead:
      "Locked pastel magazine cover. Soft outfit-change morph. Face and cover chrome stay identical.",
  },
  "dark-velvet": {
    id: "dark-velvet",
    label: "Dark velvet",
    look:
      "Edgy fashion magazine cover — off-white void, bold RED masthead, black leather / harness editorial energy. " +
      "Cover lines in black serif. High contrast, restrained.",
    startOutfit:
      "START: keep IMAGE 1 outfit and face. Assertive editorial pose (standing or seated stool OK if IMAGE 1 supports it).",
    endOutfit:
      "END: SAME face and identity — NEW dark editorial look (leather, chains, boots) without changing the person. Masthead unchanged.",
    videoLead:
      "Locked velvet-mode cover. Outfit-change morph only. Same face, same masthead, no scene jump.",
  },
};

function coverChrome(masthead: string): string {
  return (
    `Masthead reads exactly: ${masthead}. Spell those letters only — no extra English on the masthead. ` +
    "Optional sparse cover lines beside the subject (2–4 short real words max per column) — " +
    "no lorem ipsum, no random glyphs, no social watermarks."
  );
}

function expandBeat(
  beat: string,
  dialect: MagazineCoverMorphDialectId,
  masthead: string,
): string {
  const def = SCHEMES[dialect];
  return beat
    .replace(/\{LOOK\}/g, def.look)
    .replace(/\{CAMERA\}/g, LOCKED_CAMERA)
    .replace(/\{Z_ORDER\}/g, Z_ORDER)
    .replace(/\{CHROME\}/g, coverChrome(masthead))
    .replace(/\{END_EDIT\}/g, END_EDIT_LOCK);
}

function subject(input: { product: string; conceptMode?: boolean }): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "the person" : "the product")
  );
}

function photoLock(hero: string, conceptMode?: boolean): string {
  const role = conceptMode
    ? "person / brand figure (face lock)"
    : "person+SKU when present, otherwise the product as cover hero";
  return [
    `IMAGE 1 locks the ${role}.`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    "Reuse the EXACT face, hair, and body from IMAGE 1. Do NOT cast a different model.",
    conceptMode
      ? "AI may invent a new editorial outfit on the end frame — never a new face."
      : "If IMAGE 1 shows a product, keep that exact SKU in both frames (held or as cover object). Never swap category.",
    "AI may invent magazine type chrome + wardrobe — never invent a new hero.",
  ].join(" ");
}

function optionalStyleHint(extra?: string): string {
  const t = extra?.trim().slice(0, 140);
  return t
    ? `Optional mood (keep cover + identity locked): ${t}.`
    : "";
}

const PLATE_RULES =
  "Magazine-cover-morph — masthead behind head, cover lines beside, outfit change, same identity. " +
  "No gibberish letters, captions, watermarks, UI chrome, or extra people.";

export function buildMagazineCoverMorphStillPrompt(input: {
  dialect: MagazineCoverMorphDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: MagazineCoverMorphFrame;
  editingStartPlate?: boolean;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const masthead = resolveMagazineMasthead({
    headline: input.headline,
    business: input.business,
    product: input.product,
    dialect: input.dialect,
  });
  const ar = input.aspectRatio?.trim() || "3:4";
  const isEndEdit = input.frame === "end" && Boolean(input.editingStartPlate);
  const rawBeat = isEndEdit
    ? `{END_EDIT} Swap only the wardrobe to the end editorial look. ${def.endOutfit}`
    : input.frame === "end"
      ? `{LOOK} {CAMERA} {Z_ORDER} {CHROME} ${def.endOutfit}`
      : `{LOOK} {CAMERA} {Z_ORDER} {CHROME} ${def.startOutfit}`;
  const beat = expandBeat(rawBeat, input.dialect, masthead);
  return [
    `Photoreal high-fashion magazine cover still, ${ar}, commercial editorial photography.`,
    photoLock(hero, input.conceptMode),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level wardrobe edit only."
      : "Single locked cover composition ready for outfit-change morph.",
    `Masthead must read exactly: ${masthead}.`,
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

export function buildMagazineCoverMorphVideoPrompt(input: {
  dialect: MagazineCoverMorphDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const sec = clampMagazineCoverMorphDurationSec(input.durationSec);
  const masthead = resolveMagazineMasthead({
    headline: input.headline,
    business: input.business,
    product: input.product,
    dialect: input.dialect,
  });
  const reveal = input.conceptMode
    ? "Same face and hair for the entire clip — only clothes / styling morph."
    : "Same face (when present) and same SKU category for the entire clip — only wardrobe / editorial look morph.";
  return [
    `Magazine-cover outfit-change ad, ${sec}s. Continuous morph from Image 1 (start cover) to Image 2 (end cover) with MINIMAL layout delta.`,
    `Dialect: ${def.label}. ${def.videoLead}`,
    nameIsClaimImage1IsObjectLine(hero),
    LOCKED_CAMERA,
    reveal,
    `Masthead stays exactly: ${masthead} — behind the head the whole time.`,
    "CRITICAL: never morph into a different face, gender, age, or product. Cover lines stay legible; no new captions.",
    "No hard cuts, no montage, no camera orbit into a new scene.",
    optionalStyleHint(input.promptExtra),
    "No gibberish letters, no social watermarks, no UI chrome, no extra people walking in.",
  ].join(" ");
}

export const MAGAZINE_COVER_MORPH_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "morphing identity, different person, gender swap, age change, new face, " +
  "invent competitor brands, talking head vlog, fashion multi-cut reel, " +
  "garbled text, illegible letters, melted typography, random glyphs, lorem ipsum junk, " +
  "type covering the face, lower-third text, UI chrome, social stickers, " +
  "extra fingers, extra people, masthead in front of the head, " +
  "forcing perfume bottles when the upload is not perfume, morph into different product category";

export const MAGAZINE_COVER_MORPH_MOTION_STRENGTH = 62;
