/**
 * Type behind cutout (字夾產品 / 字夾人像) — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (inspired by Gary XHS — NOT a copy): subject cutout · giant type BEHIND subject ·
 * cinematic street plate · readable type peeking around the figure · optional impact end.
 *
 * ─── Generate contract ───────────────────────────────────────────────────────
 * Required
 *   · Hero still (IMAGE 1) — identity lock
 *       Product: SKU / pack / hand+SKU / person+SKU. If SKU-only, invent a presenter
 *         body holding the EXACT SKU (never invent a different product).
 *       Concept: person / brand figure / mascot still (figure is the cutout hero)
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
 *   3) H3 start→end morph · City run = continuous jog; Minimal = soft push-in · identity locked
 * What AI may invent: plate, type chrome, light, locomotion, (product) presenter body —
 * never a new SKU / face when IMAGE 1 already has one.
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
  return `/images/studio/schemes/type-behind-cutout/${id}.png?v=2`;
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

/** Uppercase giant-type token — keep short so Nano Banana / H3 stay legible. */
export const TYPE_BEHIND_WORD_MAX = 10;

const TYPE_BEHIND_STOPWORDS = new Set([
  "A",
  "AN",
  "THE",
  "AND",
  "OR",
  "OF",
  "TO",
  "FOR",
  "WITH",
  "YOUR",
  "YOU",
  "OUR",
  "MY",
  "IN",
  "ON",
  "AT",
  "BY",
  "FROM",
  "IS",
  "ARE",
  "BE",
  "AS",
]);

export function sanitizeTypeBehindWord(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cleaned = t.replace(/[^\w\s\u4e00-\u9fff-]/g, "").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, TYPE_BEHIND_WORD_MAX).toUpperCase();
}

/** Prefer short punch tokens from a long marketing headline. */
export function punchTypeBehindTokens(raw: string): string[] {
  const cleaned = raw
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!cleaned) return [];
  // CJK: take first 2–4 chars as one punch token when no spaces.
  if (/^[\u4e00-\u9fff]+$/.test(cleaned)) {
    return [cleaned.slice(0, Math.min(4, cleaned.length))];
  }
  return cleaned
    .split(/\s+/)
    .map((w) => w.slice(0, TYPE_BEHIND_WORD_MAX))
    .filter((w) => w.length >= 2 && !TYPE_BEHIND_STOPWORDS.has(w));
}

/** Primary word on the plate; optional second word for end-frame beat. */
export function resolveTypeBehindWords(input: {
  headline?: string;
  business?: string;
  product?: string;
  dialect: TypeBehindCutoutDialectId;
}): { startWord: string; endWord: string } {
  const fromHeadline = punchTypeBehindTokens(input.headline ?? "");
  const fromBusiness = punchTypeBehindTokens(input.business ?? "");
  const fromProduct = punchTypeBehindTokens(input.product ?? "");
  const tokens =
    fromHeadline.length > 0
      ? fromHeadline
      : fromBusiness.length > 0
        ? fromBusiness
        : fromProduct;

  const fallback =
    sanitizeTypeBehindWord(input.headline ?? "") ||
    sanitizeTypeBehindWord(input.business ?? "") ||
    sanitizeTypeBehindWord(input.product ?? "") ||
    "MOVE";
  const primaryWord = (tokens[0] ?? fallback).slice(0, TYPE_BEHIND_WORD_MAX);

  if (input.dialect === "impact-end") {
    return { startWord: primaryWord, endWord: "END CUT" };
  }
  if (input.dialect === "minimal-run") {
    return { startWord: primaryWord, endWord: primaryWord };
  }
  // city-run: two short punch words when available; else one word → kinetic cousin
  if (tokens.length >= 2) {
    return {
      startWord: tokens[0]!.slice(0, TYPE_BEHIND_WORD_MAX),
      endWord: tokens[1]!.slice(0, TYPE_BEHIND_WORD_MAX),
    };
  }
  return { startWord: primaryWord, endWord: "KEEP MOVING" };
}

/** Live UI preview — what giant type will paint (e.g. POWER → ANYWHERE). */
export function formatTypeBehindOnScreenPreview(input: {
  headline?: string;
  business?: string;
  product?: string;
  dialect: TypeBehindCutoutDialectId;
}): string {
  const { startWord, endWord } = resolveTypeBehindWords(input);
  if (!startWord) return "";
  if (startWord === endWord) return startWord;
  return `${startWord} → ${endWord}`;
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

/** Shared street cinematic plate — record-inspired, not a location copy. */
const STREET_PLATE =
  "Cinematic dense Asian night street / alley plate — wet asphalt, neon storefront soft bokeh, shallow depth, film grit. " +
  "Photoreal urban environment only. FORBIDDEN: living-room tabletop, cream studio void, marble desk, cozy interior packshot, " +
  "copying a specific real-world landmark or XHS frame.";

const Z_ORDER =
  "Z-ORDER SANDWICH (mandatory): giant typography sits BETWEEN the background plate and the cutout hero — " +
  "type is BEHIND the subject, NEVER in front of the face/SKU, NEVER as a caption strip. " +
  "Hero cutout occludes letters only where they overlap.";

const TYPE_READABLE =
  "TYPE READABILITY (mandatory): ONE horizontal giant word in high-contrast white distressed sans — phone-readable at a glance. " +
  "Offset the cutout left OR right so the FULL word reads left-to-right in a single clear line behind the figure. " +
  "At least ~55% of every letter stroke must stay visible (shoulders/hips clear of the word core). " +
  "Hold the SKU to the side or lower third — never a fat packshot dead-center covering the word. " +
  "FORBIDDEN: stacking the same word 3× vertically; scrambled letter columns that break the spelling; " +
  "illegible glow blobs; mirrored/warped glyphs; caption bars; type that only peeks as unreadable fragments.";

const CUTOUT_LOCK =
  "Treat IMAGE 1 as identity ground truth for the locked subject (SKU and/or face). " +
  "Remove or ignore the original photo background — replace with the dialect plate only. " +
  "Do NOT invent a different product, logo, packaging, or a different face when IMAGE 1 already has one.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same camera, plate, type position grammar, and hero identity. " +
  "Change ONLY micro push-in / subject drift / type scale or end-word swap — no new people, no new SKU, no new scene.";

const SCHEMES: Record<TypeBehindCutoutDialectId, DialectDef> = {
  "city-run": {
    id: "city-run",
    label: "City run",
    plate: STREET_PLATE,
    startStill:
      "{PLATE} {CUTOUT} {Z_ORDER} {TYPE_READABLE} " +
      "START: cutout hero MID-JOG / brisk street run toward camera — one foot forward, weight shifting, " +
      "arm swing holding the SKU (or figure running with purpose). NOT a static standing portrait. " +
      "Giant distressed editorial sans word behind subject reads exactly: {START_WORD}. " +
      "Letters peek around the moving figure — cinematic depth, not a flat sticker.",
    endStill:
      "{PLATE} {CUTOUT} {Z_ORDER} {TYPE_READABLE} END: same continuous street RUN — hero closer / larger in frame, " +
      "still mid-stride jogging toward camera (legs mid-gait, forward lean). " +
      "Giant word behind now reads exactly: {END_WORD}. Stronger run parallax; one locked street plate.",
    endPlateEdit:
      "{END_EDIT} {TYPE_READABLE} Advance the RUN: hero closer mid-stride toward camera; " +
      "swap / strengthen the behind-subject word to {END_WORD}; plate + identity unchanged — keep jogging pose, not a standstill.",
    videoLead:
      "CITY RUN = real street locomotion (mandatory): continuous jog / brisk run toward camera on the locked night-street plate. " +
      "Legs cycle mid-gait, torso advances, arms swing while holding the SKU; giant type stays BEHIND and readable with parallax. " +
      "0–3s: establish run sandwich. 3–8s: keep RUNNING closer — bigger in frame, never freeze into a static present. " +
      "FORBIDDEN: standing still, soft push-in only, product-demo close-ups, apply-to-skin montage, camera orbit into a new scene.",
  },
  "minimal-run": {
    id: "minimal-run",
    label: "Minimal run",
    plate:
      "Minimal cream / off-white seamless void — soft studio falloff, no props clutter. High-fashion poster calm. " +
      "Still enforce readable type-behind sandwich — not a packshot covering the word.",
    startStill:
      "{PLATE} {CUTOUT} {Z_ORDER} {TYPE_READABLE} " +
      "START: cutout hero centered with fashion-poster calm. One enormous black sans word behind reads exactly: {START_WORD}. " +
      "Type fills most of the frame; subject cuts cleanly through letters with visible side strokes.",
    endStill:
      "{PLATE} {CUTOUT} {Z_ORDER} {TYPE_READABLE} END: same cream void + same word {END_WORD} — letters slightly larger / closer; " +
      "subject soft push-in only. Still type-behind sandwich.",
    endPlateEdit:
      "{END_EDIT} {TYPE_READABLE} Soft push-in + slight type scale-up on {END_WORD}; keep cream void and hero identity.",
    videoLead:
      "Locked cream void. Giant black type stays BEHIND the cutout and readable around the figure. " +
      "Only a subtle push-in / type scale — same person or SKU the whole clip.",
  },
  "impact-end": {
    id: "impact-end",
    label: "Impact end",
    plate: STREET_PLATE,
    startStill:
      "{PLATE} {CUTOUT} {Z_ORDER} {TYPE_READABLE} " +
      "START: calm street sandwich — cutout hero with giant distressed word behind reading exactly: {START_WORD}. Tension before impact.",
    endStill:
      "{PLATE} {CUTOUT} {Z_ORDER} {TYPE_READABLE} END IMPACT LOCKUP: hard punch composition — subject closer, " +
      "giant word behind reads exactly: {END_WORD}. Optional subtle debris / light streak — type still BEHIND and readable, not over face/SKU.",
    endPlateEdit:
      "{END_EDIT} {TYPE_READABLE} Impact punch: push hero closer, swap behind-subject word to {END_WORD}, add subtle impact energy — identity locked.",
    videoLead:
      "Same street plate DNA as City run. Build to IMPACT END: calm type-behind sandwich → hard punch lockup on END CUT. " +
      "Type always BEHIND cutout and readable. One continuous morph — no montage, no freeze-frame collage, no living-room packshot.",
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
    .replace(/\{TYPE_READABLE\}/g, TYPE_READABLE)
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

/**
 * Product: presenter + SKU (record-inspired human cutout energy).
 * Concept: person / figure is the cutout hero.
 */
function heroStaging(input: {
  product: string;
  conceptMode?: boolean;
}): string {
  const hero = subject(input);
  if (input.conceptMode) {
    return [
      "CONCEPT STAGING: IMAGE 1 person / brand figure / mascot is the cutout hero.",
      "Keep exact face / figure identity. On City run: real jog/run energy — not a static lean.",
      "Giant type stays behind the figure with readable side peeks — not a face caption.",
      nameIsClaimImage1IsObjectLine(hero || undefined),
    ].join(" ");
  }
  return [
    "PRODUCT STAGING (presenter + SKU — mandatory):",
    "Do NOT float a lone packshot that covers the giant word.",
    "Compose a person presenting / holding / wearing the EXACT product from IMAGE 1 as the cutout hero.",
    "If IMAGE 1 already shows a hand+product or person+product, keep that person/hand identity.",
    "If IMAGE 1 is SKU-only, invent a plausible presenter body/outfit holding the EXACT SKU — never invent a different product, logo, or packaging.",
    "SKU must stay sharp and recognizable in the hand / against the body; letters peek around shoulders and hips.",
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Product label "${hero}" only — power bank stays power bank; never swap category.`
      : "Keep IMAGE 1 exact SKU silhouette, materials, and identity.",
  ].join(" ");
}

function optionalStyleHint(
  extra: string | undefined,
  dialect: TypeBehindCutoutDialectId,
): string {
  const t = extra?.trim().slice(0, 140);
  if (!t) return "";
  const dialectWins =
    dialect === "city-run"
      ? "Dialect wins: keep the street RUN locomotion — ignore demo / close-up / apply-to-skin beats in this note."
      : "Dialect wins: keep type-behind sandwich + locked identity — ignore conflicting montage beats.";
  return `Optional mood only (${dialectWins}): ${t}.`;
}

const PLATE_RULES =
  "Type-behind-cutout — cutout IN FRONT, giant type BEHIND, plate furthest back. " +
  "Inspired by cinematic street cutout ads — do NOT copy any specific XHS frame, landmark, or trademarked mark. " +
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
    heroStaging(input),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level edit only."
      : "Single sandwich composition ready for subtle start→end morph.",
    wordNote,
    optionalStyleHint(input.promptExtra, input.dialect),
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
  const staging = input.conceptMode
    ? "Concept: keep the same person/figure cutout identity for the entire clip."
    : "Product: keep the same presenter + EXACT SKU — never morph into a different product or swap the held item.";
  const morphDelta =
    input.dialect === "city-run"
      ? "Continuous morph from Image 1 (start mid-jog) to Image 2 (end closer mid-stride) — locomotion advances, identity locked."
      : "Continuous morph from Image 1 (start) to Image 2 (end) with small compositional delta — identity locked.";
  return [
    `Type-behind-cutout ad, ${sec}s. ${morphDelta}`,
    `Dialect: ${def.label}. ${def.videoLead}`,
    staging,
    nameIsClaimImage1IsObjectLine(hero),
    `Giant type stays BEHIND the cutout hero and stays readable around the figure — start word "${words.startWord}", end word "${words.endWord}".`,
    "CRITICAL: same person/SKU identity for the entire clip — never morph into a different face, gender, or product.",
    "CRITICAL: typography must remain behind the subject — never flip in front of the face or SKU as a caption.",
    "CRITICAL: do not let the product fully cover the word — keep side peeks of letters.",
    "CRITICAL: type must stay ONE clear horizontal word — never stack duplicates or scramble letter columns.",
    "Locked plate. No hard cuts, no montage, no camera orbit into a new scene, no living-room tabletop packshot.",
    optionalStyleHint(input.promptExtra, input.dialect),
    "No gibberish letters, no social watermarks, no UI chrome, no fashion multi-cut reel energy.",
  ].join(" ");
}

export const TYPE_BEHIND_CUTOUT_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "blurry product, morphing identity, different person, gender swap, age change, " +
  "invent competitor brands, talking head vlog, fashion montage, rapid scene change, " +
  "garbled text, illegible letters, melted typography, random glyphs, lorem ipsum junk, " +
  "stacked duplicate words, vertical letter columns, scrambled spelling, unreadable type fragments, " +
  "type in front of face, caption bar, lower-third text, UI chrome, social stickers, " +
  "extra fingers, melted hands, wrong occlusion, type overlay on product logo, " +
  "lone floating packshot covering all letters, product fully blocking typography, " +
  "living room tabletop, cream desk still life, cozy interior product shot, " +
  "forcing perfume bottles when the upload is not perfume, morph into different product category";

/** Default H3 motion strength — prefer {@link typeBehindCutoutMotionStrength}. */
export const TYPE_BEHIND_CUTOUT_MOTION_STRENGTH = 58;

/** Per-dialect motion: City run needs real gait; Minimal stays soft. */
export function typeBehindCutoutMotionStrength(
  dialect: TypeBehindCutoutDialectId,
): number {
  switch (dialect) {
    case "city-run":
      return 78;
    case "impact-end":
      return 68;
    case "minimal-run":
      return 52;
    default:
      return TYPE_BEHIND_CUTOUT_MOTION_STRENGTH;
  }
}
