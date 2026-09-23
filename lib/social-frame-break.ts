/**
 * Social frame-break — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (proven Naruto/Alchemy H3 proof — Instagram 3D pop-out):
 *   Desktop IG post UI → scenic plate inside post frame → character BREAKS the
 *   LOWER edge onto white caption UI (feet on white) → brand on heart balloon.
 *
 * Required
 *   · Character still (IMAGE 1) — face / figure / mascot identity lock
 *     (NOT a lone product packshot as the pop-out hero)
 *   · Business + Headline — brand + caption punch (spell-locked)
 * Optional
 *   · Brand kit logo as IMAGE 2 — balloon / badge mark only
 *   · Subline — secondary caption mood
 * Locked
 *   · Engine MiniMax H3 · still + video AR 16:9 (desktop IG composite) · 8/10s
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const SOCIAL_FRAME_BREAK_DURATION_OPTIONS = ["8", "10"] as const;
export const SOCIAL_FRAME_BREAK_DURATION_SEC = 10;

export function clampSocialFrameBreakDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 10;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 10;
  return Math.round(n) <= 8 ? 8 : 10;
}

export function socialFrameBreakDurationOptions(): VideoDuration[] {
  return [...SOCIAL_FRAME_BREAK_DURATION_OPTIONS];
}

export const SOCIAL_FRAME_BREAK_SCHEME_IDS = ["popout-wave"] as const;
export type SocialFrameBreakSchemeId =
  (typeof SOCIAL_FRAME_BREAK_SCHEME_IDS)[number];
export type SocialFrameBreakSchemePick = SocialFrameBreakSchemeId | "auto";

export function socialFrameBreakSchemePreviewSrc(
  id: SocialFrameBreakSchemeId,
): string {
  return `/images/studio/schemes/social-frame-break/${id}.png?v=2`;
}

export function isSocialFrameBreakSchemeId(
  value: string | null | undefined,
): value is SocialFrameBreakSchemeId {
  return (SOCIAL_FRAME_BREAK_SCHEME_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseSocialFrameBreakSchemePick(
  raw: unknown,
): SocialFrameBreakSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isSocialFrameBreakSchemeId(s) ? s : "auto";
}

export function resolveSocialFrameBreakScheme(input: {
  pick: SocialFrameBreakSchemePick;
}): SocialFrameBreakSchemeId {
  if (input.pick !== "auto") return input.pick;
  return "popout-wave";
}

export type SocialFrameBreakFrame = "start" | "end";

export const SOCIAL_FRAME_CAPTION_MAX = 48;
export const SOCIAL_FRAME_BRAND_MAX = 28;

export function sanitizeSocialFrameCaption(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.slice(0, SOCIAL_FRAME_CAPTION_MAX);
}

export function sanitizeSocialFrameBrand(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.slice(0, SOCIAL_FRAME_BRAND_MAX);
}

/** Brand + caption punch for still/video spell-lock and UI preview. */
export function resolveSocialFrameWords(input: {
  business?: string;
  headline?: string;
  product?: string;
  subline?: string;
}): { brand: string; caption: string; subCaption: string } {
  const brand =
    sanitizeSocialFrameBrand(input.business ?? "") ||
    sanitizeSocialFrameBrand(input.product ?? "") ||
    "BRAND";
  const caption =
    sanitizeSocialFrameCaption(input.headline ?? "") ||
    sanitizeSocialFrameCaption(input.product ?? "") ||
    brand;
  const subCaption = sanitizeSocialFrameCaption(input.subline ?? "");
  return { brand, caption, subCaption };
}

export function formatSocialFrameOnScreenPreview(input: {
  business?: string;
  headline?: string;
  product?: string;
  subline?: string;
}): string {
  const { brand, caption, subCaption } = resolveSocialFrameWords(input);
  if (subCaption) return `${brand} · ${caption} · ${subCaption}`;
  if (brand === caption) return brand;
  return `${brand} · ${caption}`;
}

const CHARACTER_LOCK =
  "Treat IMAGE 1 as CHARACTER identity ground truth (face, hair, outfit, body). " +
  "Hero MUST be a person, anime figure, mascot, or character — NEVER a lone product packshot " +
  "(power bank, bottle, box) as the giant frame-breaker. " +
  "Keep the exact same character across start and end. " +
  "If IMAGE 2 is a logo, place that exact mark on the heart balloon and/or a tiny chest badge only.";

/** Matches proven Naruto/Alchemy H3 proof: desktop IG + lower-edge feet pop-out. */
const UI_POPOUT =
  "LAYOUT LOCK (match proven Naruto/Alchemy Instagram pop-out — desktop web, landscape): " +
  "dark charcoal Instagram chrome (NOT a bright white post card filling the screen); " +
  "SQUARE scenic photo plate center-left; THIN white like-bar + ONE short caption line DIRECTLY BELOW the plate; " +
  "comments / profile sidebar on the RIGHT. " +
  "POP-OUT GAG (mandatory, lower edge ONLY): waist / legs / feet CROSS the bottom edge of the photo card " +
  "and sit ON TOP of the white caption / like-bar UI (out-of-bounds 3D break — feet in front of likes + caption). " +
  "FORBIDDEN LAYOUT: giant speech-bubble caption boxes, multi-paragraph ad copy overlays, mobile-only tall cards, " +
  "white Instagram window with light header dominating the frame, product floating alone, " +
  "pop-out through the TOP edge, disembodied hands/emoji hands gripping the frame, mouse cursor.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same camera, desktop Instagram UI, scenic plate, and character identity. " +
  "Change the pose from INSIDE-the-card → JUMPED OUT: legs/feet now sit ON TOP of the white caption UI. " +
  "No new people, no hands on the frame rim, no new scene, no new brand spelling.";

type SchemeDef = {
  id: SocialFrameBreakSchemeId;
  label: string;
  startStill: string;
  endStill: string;
  endPlateEdit: string;
  videoLead: string;
};

const SCHEMES: Record<SocialFrameBreakSchemeId, SchemeDef> = {
  "popout-wave": {
    id: "popout-wave",
    label: "Pop-out wave",
    startStill:
      "{CHARACTER} {UI_POPOUT} START (PRE-JUMP): sunny meadow inside the square post frame. " +
      "Character stands MOSTLY INSIDE the photo card — full body contained in the scenic plate " +
      "(feet still inside the square, or only barely touching the bottom edge). " +
      "Friendly ready-to-step pose, holding ONE glossy red heart balloon in their own hand. " +
      "Balloon/badge shows brand \"{BRAND}\". Caption under the card reads exactly: \"{CAPTION}\"{SUB_NOTE}. " +
      "This is the BEFORE frame — character has NOT jumped out yet.",
    endStill:
      "{CHARACTER} {UI_POPOUT} END (JUMPED OUT): same desktop Instagram composite — character has STEPPED / JUMPED " +
      "forward out of the square plate. Waist, legs, and feet clearly sit ON TOP of the white caption / like-bar UI " +
      "(out-of-bounds 3D break). Body larger / closer; balloon drifts. " +
      "Brand \"{BRAND}\" and caption \"{CAPTION}\" stay exact. No top-edge hands.",
    endPlateEdit:
      "{END_EDIT} Pose change only: from inside-the-card → feet ON white caption UI (clear jump-out). " +
      "Keep \"{BRAND}\" / \"{CAPTION}\". Never add hands on the top frame.",
    videoLead:
      "MAIN ACTION = JUMP / STEP OUT of the Instagram photo card onto the white caption UI " +
      "(lower-edge frame-break) — NOT a tiny hand-wave with a sliding card. " +
      "0–3s: character inside or at the lip of the square plate. " +
      "3–8s: climbs / steps / pops forward so feet land ON the white UI in front of likes+caption. " +
      "8–10s: friendly wave + balloon drift WHILE feet stay on the white UI. " +
      "UI chrome stays locked; camera stays locked. " +
      "FORBIDDEN: only waving with no depth break; UI card sliding as the only motion; " +
      "character stuck fully inside the plate; disembodied hands; mouse cursor.",
  },
};

function expandTokens(
  beat: string,
  words: { brand: string; caption: string; subCaption: string },
): string {
  const subNote = words.subCaption
    ? `; secondary line: "${words.subCaption}"`
    : "";
  return beat
    .replace(/\{CHARACTER\}/g, CHARACTER_LOCK)
    .replace(/\{UI_POPOUT\}/g, UI_POPOUT)
    .replace(/\{END_EDIT\}/g, END_EDIT_LOCK)
    .replace(/\{BRAND\}/g, words.brand)
    .replace(/\{CAPTION\}/g, words.caption)
    .replace(/\{SUB_NOTE\}/g, subNote);
}

function schemeStillBeat(
  def: SchemeDef,
  frame: SocialFrameBreakFrame,
  editingStartPlate: boolean,
): string {
  if (frame === "end" && editingStartPlate) return def.endPlateEdit;
  return frame === "end" ? def.endStill : def.startStill;
}

function subject(input: { product: string; conceptMode?: boolean }): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand character" : "the character")
  );
}

function optionalStyleHint(extra: string | undefined): string {
  const t = extra?.trim().slice(0, 140);
  if (!t) return "";
  return `Optional mood only (keep pop-out + character lock): ${t}.`;
}

const PLATE_RULES =
  "Social-frame-break — desktop Instagram UI pop-out (lower edge feet on white). " +
  "No watermarks, no mouse cursor, no gibberish letters, no disembodied hands. " +
  "Spell brand and caption exactly as given.";

export function buildSocialFrameBreakStillPrompt(input: {
  scheme: SocialFrameBreakSchemeId;
  product: string;
  business?: string;
  headline?: string;
  subline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: SocialFrameBreakFrame;
  editingStartPlate?: boolean;
  /** Product path: next image after character is packaging SKU — character must hold it. */
  hasProductSku?: boolean;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const words = resolveSocialFrameWords({
    business: input.business,
    headline: input.headline,
    product: input.product,
    subline: input.subline,
  });
  const ar = input.aspectRatio?.trim() || "16:9";
  const isEndEdit = input.frame === "end" && Boolean(input.editingStartPlate);
  const beat = expandTokens(
    schemeStillBeat(def, input.frame, isEndEdit),
    words,
  );
  return [
    `High-end commercial still, ${ar} landscape, desktop Instagram UI composite (not a tall mobile screenshot).`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    "IMAGE 1 = CHARACTER (person / figure / mascot). Do NOT make a lone product packshot the pop-out hero.",
    "NEVER invent Pikachu, Groot, squirrel, profile grids, or any character from a motion reference.",
    "FORBIDDEN: giant speech-bubble caption boxes, multi-paragraph marketing copy on the plate — caption is ONE short punch line under the like bar only.",
    input.hasProductSku
      ? "PRODUCT SKU IMAGE = packaging packshot. Character MUST hold that exact SKU (small/readable) — do not omit it or invent a different product."
      : input.conceptMode
        ? "CONCEPT: IMAGE 1 character is the pop-out hero; brand words on balloon + caption."
        : "PRODUCT path: IMAGE 1 is still the CHARACTER; optional logo brands the balloon only — never replace the character with the SKU.",
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level edit only. Keep held SKU if present."
      : "Pair of stills for JUMP-OUT morph: start = inside card, end = feet on white UI.",
    `Brand must read exactly: ${words.brand}. Caption must read exactly: ${words.caption}.`,
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

/** Public path for the proven Instagram pop-out motion reference (Naruto proof DNA). */
export const SOCIAL_FRAME_BREAK_MOTION_REF_SRC =
  "/videos/studio/social-frame-break/popout-motion-ref.mp4";

export const SOCIAL_FRAME_BREAK_MOTION_REF_DURATION_SEC = 10;

/**
 * Hybrid primary path (Naruto-smooth remake):
 * Image 1 = FULL start plate (character already inside desktop IG UI) —
 * Video 1 = pop-out motion DNA only.
 * Do NOT pass a raw headshot + Pikachu video (Video 1 steals identity).
 * Passing the baked plate as Image 1 keeps character/SKU/layout locked.
 */
export function buildSocialFrameBreakReferenceVideoPrompt(input: {
  scheme: SocialFrameBreakSchemeId;
  product: string;
  business?: string;
  headline?: string;
  subline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
  hasProductSku?: boolean;
  hasLogo?: boolean;
  /** True when Image 1 is already the full IG start plate (wizard hybrid). */
  plateAsImage1?: boolean;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const sec = clampSocialFrameBreakDurationSec(input.durationSec);
  const words = resolveSocialFrameWords({
    business: input.business,
    headline: input.headline,
    product: input.product,
    subline: input.subline,
  });
  const plateLock = input.plateAsImage1
    ? [
        `Image 1 = FULL START PLATE (desktop Instagram composite already showing the hero character${input.hasProductSku ? " holding the product SKU" : ""}).`,
        `HARD LOCK Image 1 for the entire clip: same person/figure/face/outfit, same dark IG chrome, same scenic meadow plate, same balloon, same short caption spelling — never invent Pikachu, Groot, squirrel, profile grid, or a different UI.`,
        `Video 1 = POP-OUT MOTION DNA ONLY — copy the JUMP / STEP timing, depth break onto white caption UI, camera push, balloon swing. IGNORE Video 1 character identity / species / outfit / scenic plate. Video 1 has NO profile grid open — stay on the single desktop IG post the whole time.`,
      ].join(" ")
    : [
        `Image 1 = CHARACTER identity lock (face, hair, outfit, body) — this is the pop-out hero.`,
        input.hasProductSku
          ? `Image 2 = PRODUCT SKU — character HOLDS this exact product (small/readable).`
          : "",
        input.hasLogo
          ? `${input.hasProductSku ? "Image 3" : "Image 2"} = brand logo — balloon / tiny badge only.`
          : "",
        `Video 1 = motion DNA ONLY (cropped: starts already on the single desktop IG post — NO Instagram profile GRID open). FORBIDDEN: copy Video 1 character (no Pikachu/Groot/squirrel/grid).`,
      ]
        .filter(Boolean)
        .join(" ");

  return [
    plateLock,
    `Remake as a ${sec}s luxury social ad with Image 1's locked identity. Scheme: ${def.label}.`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    `PRIORITY (hard): Image 1 identity + layout lock > jump-out ACTION from Video 1 > balloon brand "${words.brand}". Never let Video 1 identity win.`,
    `GAG (match Video 1 motion timing):`,
    `- Desktop Instagram post UI (square scenic plate + thin white caption below + comments sidebar)`,
    `- Character BREAKS the lower edge: starts in/near the plate, then STEPS / JUMPS OUT so feet sit ON TOP of the white UI`,
    `- Friendly wave + red heart balloon AFTER the pop-out lands`,
    `- Caption stays exactly "${words.caption}" — short punch line under likes, NEVER a speech-bubble ad paragraph`,
    def.videoLead,
    `KEEP: same camera, same UI-break depth gag, soft daylight scenic plate.`,
    `CRITICAL: main action is JUMPING OUT onto the white UI — smooth continuous motion like the motion reference, not a stiff morph.`,
    `CRITICAL: no disembodied hands on the top rim, no mouse cursor, no gibberish text, no giant speech bubbles.`,
    `AUDIO (native H3 stereo — required): INSTRUMENTAL ONLY bed — clean upbeat modern pop / social-ad music, no singing, no rap, no chanting, no voice in ANY language (no Cantonese/Mandarin/English/gibberish vocals). Soft whoosh on the jump-out; light balloon foil rustle; bright friendly sting at the end. No voiceover, no lyrics.`,
    optionalStyleHint(input.promptExtra),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Seedance / H3 image-to-video — large start→end jump-out; scene locked to stills (user character). */
export function buildSocialFrameBreakVideoPrompt(input: {
  scheme: SocialFrameBreakSchemeId;
  product: string;
  business?: string;
  headline?: string;
  subline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
  hasProductSku?: boolean;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const sec = clampSocialFrameBreakDurationSec(input.durationSec);
  const words = resolveSocialFrameWords({
    business: input.business,
    headline: input.headline,
    product: input.product,
    subline: input.subline,
  });
  return [
    `Social frame-break ad, ${sec}s, 16:9 desktop Instagram composite.`,
    `Morph from Image 1 (START: character INSIDE the photo card) to Image 2 (END: character JUMPED OUT — feet ON white caption UI).`,
    `HARD LOCK to Image 1 / Image 2: same person/figure, same Instagram UI chrome, same scenic plate, same caption spelling — do NOT invent a profile grid, Pikachu, Groot, squirrel, or any other character.`,
    `LARGE pose delta — climb/step/jump out of the frame, NOT a tiny hand-wave and NOT sliding the UI card.`,
    input.hasProductSku
      ? `Keep the held PRODUCT SKU visible and identity-locked the whole clip.`
      : "",
    `Scheme: ${def.label}. ${def.videoLead}`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    `CRITICAL: same character the entire clip — never morph face, outfit, or species.`,
    `CRITICAL: end state must show feet / lower body ON TOP of the white Instagram caption UI.`,
    `CRITICAL: no disembodied hands, emoji hands, or limbs gripping the top of the frame.`,
    `Brand spelling stays exactly: ${words.brand}. Caption stays exactly: ${words.caption}.`,
    `AUDIO (native H3 stereo — required): INSTRUMENTAL ONLY bed — clean upbeat modern pop / social-ad music, no singing, no rap, no chanting, no voice in ANY language (no Cantonese/Mandarin/English/gibberish vocals). Soft whoosh on the jump-out; light balloon foil rustle; bright friendly sting at the end. No voiceover, no lyrics.`,
    optionalStyleHint(input.promptExtra),
    "No gibberish UI text, no mouse cursor, no hard cuts, no new scene.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function socialFrameBreakMotionStrength(
  _scheme: SocialFrameBreakSchemeId,
): number {
  return 0.72;
}

export const SOCIAL_FRAME_BREAK_NEGATIVE =
  "different character, face morph, celebrity swap, species change, " +
  "lone product packshot as hero, giant floating SKU, power bank as character, " +
  "character fully inside frame with no UI break, flat sticker, " +
  "disembodied hands, emoji hands, floating hands gripping frame, " +
  "hands on top edge, climbing hands, top-edge pop-out, " +
  "gibberish text, misspelled brand, mouse cursor, watermark, hard cut, montage";

/** Product needs character + SKU; concept needs character (logo optional). */
export function socialFrameBreakInputsReady(input: {
  conceptMode: boolean;
  hasCharacter: boolean;
  hasProductSku: boolean;
}): boolean {
  if (!input.hasCharacter) return false;
  if (input.conceptMode) return true;
  return input.hasProductSku;
}
