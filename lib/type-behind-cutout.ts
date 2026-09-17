/**
 * Type behind cutout (字夾產品 / 字夾人像) — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (Gary XHS ref): subject cutout · giant type BEHIND subject · cinematic plate ·
 * impact ending. Dual-frame identity recipe (same family as web-boundary / impact-poster).
 *
 * ─── Generate contract (product + concept) ───────────────────────────────────
 * Required
 *   · Hero still (IMAGE 1) — identity lock; AI must not invent a replacement hero
 *       Product: clear product photo (SKU / pack / hand+SKU OK)
 *       Concept: person / brand figure / mascot still
 *   · Headline — becomes the giant word(s) sandwiched behind the cutout
 * Optional
 *   · Business — fallback brand token if headline empty
 *   · Dialect pick — auto | city-run | minimal-run | impact-end
 *   · Duration — 8 | 10 (default 8); no "auto"
 * Locked
 *   · Engine MiniMax H3 · still AR 3:4 · video AR 9:16 · library BGM after H3
 * Pipeline
 *   1) Start still (Nano Banana) — cutout hero IN FRONT of giant type + plate
 *   2) End still — same sandwich, dialect beat (push / word change / END CUT punch)
 *   3) H3 start→end morph · micro motion only · identity locked
 * What AI may invent: plate, type chrome, light, motion — never a new hero.
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const TYPE_BEHIND_CUTOUT_DURATION_OPTIONS = ["8", "10"] as const;
export const TYPE_BEHIND_CUTOUT_DURATION_SEC = 8;

export function clampTypeBehindCutoutDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 8;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.round(n) <= 8 ? 8 : 10;
}

export function typeBehindCutoutDurationOptions(): VideoDuration[] {
  return [...TYPE_BEHIND_CUTOUT_DURATION_OPTIONS];
}

export const TYPE_BEHIND_CUTOUT_DIALECT_IDS = [
  "city-run",
  "minimal-run",
  "impact-end",
] as const;

export type TypeBehindCutoutDialectId =
  (typeof TYPE_BEHIND_CUTOUT_DIALECT_IDS)[number];
export type TypeBehindCutoutDialectPick = TypeBehindCutoutDialectId | "auto";

export function typeBehindCutoutDialectPreviewSrc(
  id: TypeBehindCutoutDialectId,
): string {
  return `/images/studio/schemes/type-behind-cutout/${id}.png?v=1`;
}

export function isTypeBehindCutoutDialectId(
  value: string | null | undefined,
): value is TypeBehindCutoutDialectId {
  return (TYPE_BEHIND_CUTOUT_DIALECT_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseTypeBehindCutoutDialectPick(
  raw: unknown,
): TypeBehindCutoutDialectPick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isTypeBehindCutoutDialectId(s) ? s : "auto";
}

export function resolveTypeBehindCutoutDialect(input: {
  pick: TypeBehindCutoutDialectPick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): TypeBehindCutoutDialectId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /impact|punch|end.?cut|bang|撞|收尾|冲击|爆/.test(text)
  ) {
    return "impact-end";
  }
  if (
    /minimal|cream|void|clean|白底|极简|極簡|简洁|簡潔/.test(text)
  ) {
    return "minimal-run";
  }
  if (
    /city|street|run|urban|hk|hong.?kong|街|城|跑|夜/.test(text)
  ) {
    return "city-run";
  }
  // Default city-run — closest to the XHS reference DNA.
  return "city-run";
}

export type TypeBehindCutoutFrame = "start" | "end";

/** Uppercase giant-type token from headline / business (short, legible). */
export const TYPE_BEHIND_WORD_MAX = 14;

export function sanitizeTypeBehindWord(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cleaned = t.replace(/[^\w\s\u4e00-\u9fff-]/g, "").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, TYPE_BEHIND_WORD_MAX).toUpperCase();
}

/** Primary word on the plate; optional second word for end-frame beat. */
export function resolveTypeBehindWords(input: {
  headline?: string;
  business?: string;
  product?: string;
  dialect: TypeBehindCutoutDialectId;
}): { startWord: string; endWord: string } {
  const fromHeadline = sanitizeTypeBehindWord(input.headline ?? "");
  const fromBusiness = sanitizeTypeBehindWord(input.business ?? "");
  const fromProduct = sanitizeTypeBehindWord(input.product ?? "");
  const primary = fromHeadline || fromBusiness || fromProduct || "MOVE";
  if (input.dialect === "impact-end") {
    return { startWord: primary, endWord: "END CUT" };
  }
  if (input.dialect === "minimal-run") {
    // One huge word both frames — end only scales / pushes.
    return { startWord: primary, endWord: primary };
  }
  // city-run: start primary, end a short kinetic cousin when headline has 2+ tokens
  const parts = primary.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { startWord: parts[0]!, endWord: parts.slice(1).join(" ") };
  }
  return { startWord: primary, endWord: "KEEP MOVING" };
}

type DialectDef = {
  id: TypeBehindCutoutDialectId;
  label: string;
  plate: string;
  startStill: string;
  endStill: string;
  endPlateEdit: string;
  videoLead: string;
};

const Z_ORDER =
  "Z-ORDER SANDWICH (mandatory): giant typography sits BETWEEN the background plate and the cutout hero — " +
  "type is BEHIND the subject, NEVER in front of the face/SKU, NEVER as a caption strip. " +
  "Hero cutout occludes letters where they overlap.";

const CUTOUT_LOCK =
  "Treat IMAGE 1 as a clean cutout matte: keep the exact hero silhouette, materials, colors, and face/SKU identity. " +
  "Remove or ignore the original photo background — replace with the dialect plate only. " +
  "Do NOT invent a different person, product, logo, or packaging.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same camera, plate, type position grammar, and hero identity. " +
  "Change ONLY micro push-in / subject drift / type scale or end-word swap — no new people, no new SKU, no new scene.";

const SCHEMES: Record<TypeBehindCutoutDialectId, DialectDef> = {
  "city-run": {
    id: "city-run",
    label: "City run",
    plate:
      "Cinematic Hong Kong / dense Asian night street plate — wet asphalt, neon storefronts soft bokeh, shallow depth. " +
      "Photoreal environment only; no UI chrome, no social watermarks.",
    startStill:
      "{PLATE} {CUTOUT} {Z_ORDER} " +
      "START: hero cutout mid-frame, slight forward lean / motion pose. " +
      "Giant sans-serif word behind subject reads exactly: {START_WORD}. " +
      "Letters partially peek around shoulders / product edges — cinematic depth, not a flat sticker.",
    endStill:
      "{PLATE} {CUTOUT} {Z_ORDER} END: same sandwich — subject drifted slightly toward camera; " +
      "giant word behind now reads exactly: {END_WORD}. Stronger parallax depth, still one locked plate.",
    endPlateEdit:
      "{END_EDIT} Nudge hero a few cm toward camera; swap / strengthen the behind-subject word to {END_WORD}; plate unchanged.",
    videoLead:
      "Locked cinematic street plate. Cutout hero drifts / soft push-in while giant type stays BEHIND the subject. " +
      "0–4s: settle sandwich. 4–8s: subject advances a few cm; type parallax. Same identity — no scene morph, no hard cut.",
  },
  "minimal-run": {
    id: "minimal-run",
    label: "Minimal run",
    plate:
      "Minimal cream / off-white seamless void — soft studio falloff, no props clutter. High-fashion poster calm.",
    startStill:
      "{PLATE} {CUTOUT} {Z_ORDER} " +
      "START: hero cutout centered. One enormous black sans word behind the subject reads exactly: {START_WORD}. " +
      "Type fills most of the frame; subject cuts cleanly through the letters.",
    endStill:
      "{PLATE} {CUTOUT} {Z_ORDER} END: same cream void + same word {END_WORD} — letters slightly larger / closer; " +
      "subject soft push-in only. Still type-behind sandwich.",
    endPlateEdit:
      "{END_EDIT} Soft push-in + slight type scale-up on {END_WORD}; keep cream void and hero identity.",
    videoLead:
      "Locked cream void. Giant black type stays BEHIND the cutout. Only a subtle push-in / type scale — same person or SKU the whole clip.",
  },
  "impact-end": {
    id: "impact-end",
    label: "Impact end",
    plate:
      "Rooftop / city skyline dusk plate OR deep charcoal void with cinematic rim light — pick one locked look for start+end.",
    startStill:
      "{PLATE} {CUTOUT} {Z_ORDER} " +
      "START: calm sandwich — hero cutout with giant word behind reading exactly: {START_WORD}. Tension before impact.",
    endStill:
      "{PLATE} {CUTOUT} {Z_ORDER} END IMPACT LOCKUP: hard punch composition — subject closer, " +
      "giant word behind reads exactly: {END_WORD}. Optional subtle debris / light streak — type still BEHIND subject, not over face/SKU.",
    endPlateEdit:
      "{END_EDIT} Impact punch: push hero closer, swap behind-subject word to {END_WORD}, add subtle impact energy — identity locked.",
    videoLead:
      "Build to IMPACT END: calm type-behind sandwich → hard punch lockup on END CUT. " +
      "Type always BEHIND cutout. One continuous morph — no montage, no freeze-frame collage.",
  },
};

function expandDialectTokens(
  beat: string,
  input: {
    dialect: TypeBehindCutoutDialectId;
    startWord: string;
    endWord: string;
  },
): string {
  const def = SCHEMES[input.dialect];
  return beat
    .replace(/\{PLATE\}/g, def.plate)
    .replace(/\{CUTOUT\}/g, CUTOUT_LOCK)
    .replace(/\{Z_ORDER\}/g, Z_ORDER)
    .replace(/\{END_EDIT\}/g, END_EDIT_LOCK)
    .replace(/\{START_WORD\}/g, input.startWord)
    .replace(/\{END_WORD\}/g, input.endWord);
}

function schemeStillBeat(
  def: Pick<DialectDef, "startStill" | "endStill" | "endPlateEdit">,
  frame: TypeBehindCutoutFrame,
  editingStartPlate: boolean,
): string {
  if (frame === "end" && editingStartPlate) return def.endPlateEdit;
  return frame === "end" ? def.endStill : def.startStill;
}

function subject(input: { product: string; conceptMode?: boolean }): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand figure" : "the product")
  );
}

function photoLock(hero: string, conceptMode?: boolean): string {
  const role = conceptMode
    ? "person / brand figure / mascot"
    : "product (or hand+product)";
  return [
    `IMAGE 1 locks the ${role} identity — cutout hero only.`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Label "${hero}" only — never swap category or cast a different face/SKU.`
      : "Keep IMAGE 1 exact silhouette, materials, and identity.",
    "AI may invent plate + typography only — never invent a new hero.",
  ].join(" ");
}

function optionalStyleHint(extra?: string): string {
  const t = extra?.trim().slice(0, 140);
  return t
    ? `Optional mood (keep sandwich + identity locked): ${t}.`
    : "";
}

const PLATE_RULES =
  "Type-behind-cutout — cutout IN FRONT, giant type BEHIND, plate furthest back. " +
  "No gibberish letters, captions, watermarks, UI chrome, or social stickers.";

export function buildTypeBehindCutoutStillPrompt(input: {
  dialect: TypeBehindCutoutDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: TypeBehindCutoutFrame;
  /** True when Nano Banana receives the start plate as first ref (end keyframe path). */
  editingStartPlate?: boolean;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const words = resolveTypeBehindWords({
    headline: input.headline,
    business: input.business,
    product: input.product,
    dialect: input.dialect,
  });
  const ar = input.aspectRatio?.trim() || "3:4";
  const isEndEdit = input.frame === "end" && Boolean(input.editingStartPlate);
  const beat = expandDialectTokens(
    schemeStillBeat(def, input.frame, isEndEdit),
    {
      dialect: input.dialect,
      startWord: words.startWord,
      endWord: words.endWord,
    },
  );
  const wordNote =
    input.frame === "end"
      ? `Behind-subject type must read exactly: ${words.endWord}.`
      : `Behind-subject type must read exactly: ${words.startWord}.`;
  return [
    `Photoreal cinematic still, ${ar}, commercial advertising photography.`,
    photoLock(hero, input.conceptMode),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level edit only."
      : "Single sandwich composition ready for subtle start→end morph.",
    wordNote,
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

export function buildTypeBehindCutoutVideoPrompt(input: {
  dialect: TypeBehindCutoutDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const sec = clampTypeBehindCutoutDurationSec(input.durationSec);
  const words = resolveTypeBehindWords({
    headline: input.headline,
    business: input.business,
    product: input.product,
    dialect: input.dialect,
  });
  return [
    `Type-behind-cutout ad, ${sec}s. Continuous morph from Image 1 (start) to Image 2 (end) with MINIMAL delta.`,
    `Dialect: ${def.label}. ${def.videoLead}`,
    nameIsClaimImage1IsObjectLine(hero),
    `Giant type stays BEHIND the cutout hero — start word "${words.startWord}", end word "${words.endWord}".`,
    "CRITICAL: same person/SKU identity for the entire clip — never morph into a different face, gender, outfit, or product.",
    "CRITICAL: typography must remain behind the subject — never flip in front of the face or SKU as a caption.",
    "Locked plate. No hard cuts, no montage, no camera orbit into a new scene.",
    optionalStyleHint(input.promptExtra),
    "No gibberish letters, no social watermarks, no UI chrome, no fashion multi-cut reel energy.",
  ].join(" ");
}

export const TYPE_BEHIND_CUTOUT_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "blurry product, morphing identity, different person, gender swap, age change, new outfit, " +
  "invent competitor brands, talking head vlog, fashion montage, rapid scene change, " +
  "garbled text, illegible letters, melted typography, random glyphs, lorem ipsum junk, " +
  "type in front of face, caption bar, lower-third text, UI chrome, social stickers, " +
  "extra fingers, melted hands, wrong occlusion, type overlay on product logo, " +
  "forcing perfume bottles when the upload is not perfume, morph into different product category";

/** H3 motion strength 0–100 — keep moderate so sandwich stays locked. */
export const TYPE_BEHIND_CUTOUT_MOTION_STRENGTH = 58;
