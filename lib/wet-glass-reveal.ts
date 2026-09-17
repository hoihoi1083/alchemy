/**
 * Wet glass reveal (液态玻璃揭示) — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (XHS AIGC liquid motion): product/hero behind fogged wet glass →
 * condensation clears via droplet trail / wipe → logo or mark becomes sharp.
 * Dual-frame identity recipe (same family as web-boundary / type-behind-cutout).
 *
 * ─── Generate contract (product + concept) ───────────────────────────────────
 * Required
 *   · Hero still (IMAGE 1) — identity lock; never invent a replacement hero
 *       Product: clear product photo (label/logo readable on upload)
 *       Concept: person / brand figure / logo / packaging still
 *   · Headline — optional mood; brand word is NOT burned as type overlay
 * Optional
 *   · Dialect — auto | droplet-trail | finger-wipe | mono-macro
 *   · Duration — 6 | 8 (default 6); no "auto"
 * Locked
 *   · Engine MiniMax H3 · still AR 3:4 · video AR 9:16 · locked camera · BGM after H3
 * Pipeline
 *   1) Start still — full wet/fogged glass; logo/mark ILLEGIBLE
 *   2) End still — same locked plate; clear trail/wipe reveals logo/mark sharp
 *   3) H3 morph — slow droplet/wipe physics only; product geometry locked
 * What AI may invent: glass, condensation, droplets, wipe path — never a new hero.
 *
 * Dialects are SAME concept, different skins:
 *   droplet-trail — one large drop slides, carries fog away (main tutorial motion)
 *   finger-wipe   — diagonal / vertical clear streak (hand wipe look, no hand visible)
 *   mono-macro    — B&W close wet-glass macro (BAUME-style) — another look, same reveal
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const WET_GLASS_REVEAL_DURATION_OPTIONS = ["6", "8"] as const;
export const WET_GLASS_REVEAL_DURATION_SEC = 6;

export function clampWetGlassRevealDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 6;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 6;
  return Math.round(n) <= 6 ? 6 : 8;
}

export function wetGlassRevealDurationOptions(): VideoDuration[] {
  return [...WET_GLASS_REVEAL_DURATION_OPTIONS];
}

export const WET_GLASS_REVEAL_DIALECT_IDS = [
  "droplet-trail",
  "finger-wipe",
  "mono-macro",
] as const;

export type WetGlassRevealDialectId =
  (typeof WET_GLASS_REVEAL_DIALECT_IDS)[number];
export type WetGlassRevealDialectPick = WetGlassRevealDialectId | "auto";

export function wetGlassRevealDialectPreviewSrc(
  id: WetGlassRevealDialectId,
): string {
  return `/images/studio/schemes/wet-glass-reveal/${id}.png?v=1`;
}

export function isWetGlassRevealDialectId(
  value: string | null | undefined,
): value is WetGlassRevealDialectId {
  return (WET_GLASS_REVEAL_DIALECT_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseWetGlassRevealDialectPick(
  raw: unknown,
): WetGlassRevealDialectPick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isWetGlassRevealDialectId(s) ? s : "auto";
}

export function resolveWetGlassRevealDialect(input: {
  pick: WetGlassRevealDialectPick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): WetGlassRevealDialectId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /mono|bw|b&w|black.?white|macro|baume|黑白|微距|特写|特寫/.test(text)
  ) {
    return "mono-macro";
  }
  if (/wipe|finger|swipe|擦|抹|刮/.test(text)) {
    return "finger-wipe";
  }
  if (/drop|droplet|drip|rain|liquid|水珠|液滴|雨/.test(text)) {
    return "droplet-trail";
  }
  // Default — main tutorial physics (single droplet trail).
  return "droplet-trail";
}

export type WetGlassRevealFrame = "start" | "end";

type DialectDef = {
  id: WetGlassRevealDialectId;
  label: string;
  look: string;
  startStill: string;
  endStill: string;
  endPlateEdit: string;
  videoLead: string;
};

const LOCKED_CAMERA =
  "Fixed front camera, completely locked — no zoom, no pan, no orbit, no push-in.";

const HERO_LOCK =
  "IMAGE 1 locks hero identity: exact silhouette, materials, label layout, logo spelling, cap/pump. " +
  "Do NOT invent a different bottle, face, logo, or packaging. " +
  "Do NOT stretch, warp, or morph product proportions between frames.";

const GLASS_LAYER =
  "Foreground is a pane of glass covering the entire frame — condensation, mist, and water droplets sit ON the glass in front of the hero. " +
  "Hero stays behind the glass; glass never becomes a caption or UI overlay.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same locked camera, hero position/scale, label geometry, and glass plane. " +
  "Change ONLY the condensation clear-path (droplet trail / wipe) — no new products, no new people, no lighting reset.";

const SCHEMES: Record<WetGlassRevealDialectId, DialectDef> = {
  "droplet-trail": {
    id: "droplet-trail",
    label: "Droplet trail",
    look:
      "Warm premium beauty/fragrance still — amber / soft grey mood, shallow depth, photoreal wet glass.",
    startStill:
      "{LOOK} {CAMERA} {HERO} {GLASS} " +
      "START: glass fully fogged with dense mist + fine droplets + soft vertical runs. " +
      "Hero silhouette faintly visible; logo/label/text ILLEGIBLE — cannot read brand words.",
    endStill:
      "{LOOK} {CAMERA} {HERO} {GLASS} END: same locked plate. " +
      "One large water droplet has slid down the center (or slight diagonal), carrying fog away — " +
      "an irregular clear wet trail reveals the logo/label SHARP and readable. " +
      "Trail edges stay wet: residual micro-droplets, soft refraction — NOT a hard rectangle wipe.",
    endPlateEdit:
      "{END_EDIT} Add one realistic downward droplet trail that clears fog over the logo/label zone only; keep everything else identical.",
    videoLead:
      "Locked tripod. After a brief hold on the fully fogged start, ONE large droplet gathers near the top and slowly slides down, " +
      "physically carrying condensation away into an irregular transparent trail over the logo. " +
      "Slow, restrained, realistic — discovery-in-hiding. No magic glow, no particles burst, no hand in frame.",
  },
  "finger-wipe": {
    id: "finger-wipe",
    label: "Finger wipe",
    look:
      "Warm premium product still behind steamy glass — same world as droplet-trail, wipe grammar instead of a single drop.",
    startStill:
      "{LOOK} {CAMERA} {HERO} {GLASS} " +
      "START: heavy condensation + rain-bead texture; logo/label fully illegible.",
    endStill:
      "{LOOK} {CAMERA} {HERO} {GLASS} END: same locked plate. " +
      "A diagonal or vertical clear streak (as if a finger wiped the glass — NO hand visible) " +
      "reveals the logo/label sharp in the cleared path; surrounding glass stays fogged with droplets.",
    endPlateEdit:
      "{END_EDIT} Clear a natural wipe streak over the logo/label; keep fog + droplets elsewhere; no hand.",
    videoLead:
      "Locked tripod. Fogged hold → a natural wipe streak clears across the logo zone (no visible hand). " +
      "Irregular wet edges, residual droplets. Slow premium pacing — not a hard wipe transition effect.",
  },
  "mono-macro": {
    id: "mono-macro",
    label: "Mono macro",
    look:
      "High-contrast BLACK AND WHITE macro / close wet-glass editorial — BAUME-style texture world. " +
      "Same reveal concept: fogged wet glass → clear path shows mark sharp. NOT a color beauty plate.",
    startStill:
      "{LOOK} {CAMERA} {HERO} {GLASS} " +
      "START: extreme close / tight crop through rippled wet glass; monochrome; mark/text illegible in the mist.",
    endStill:
      "{LOOK} {CAMERA} {HERO} {GLASS} END: same mono wet-glass lock. " +
      "A clear wet path / droplet distortion window reveals the brand mark or key lettering sharp — " +
      "surrounding glass stays heavily textured and wet.",
    endPlateEdit:
      "{END_EDIT} Open a clear wet window over the mark/lettering; keep B&W macro wet texture elsewhere.",
    videoLead:
      "Locked macro camera. Mono wet-glass texture holds, then a clear path opens over the mark. " +
      "Same identity — only condensation clears. Slow, tactile, editorial.",
  },
};

function expandDialectTokens(
  beat: string,
  dialect: WetGlassRevealDialectId,
): string {
  const def = SCHEMES[dialect];
  return beat
    .replace(/\{LOOK\}/g, def.look)
    .replace(/\{CAMERA\}/g, LOCKED_CAMERA)
    .replace(/\{HERO\}/g, HERO_LOCK)
    .replace(/\{GLASS\}/g, GLASS_LAYER)
    .replace(/\{END_EDIT\}/g, END_EDIT_LOCK);
}

function schemeStillBeat(
  def: Pick<DialectDef, "startStill" | "endStill" | "endPlateEdit">,
  frame: WetGlassRevealFrame,
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
    ? "person / brand figure / logo / packaging"
    : "product (label + silhouette)";
  const revealTarget = conceptMode
    ? "Reveal eyes, mark, or key brand detail sharp in the clear path — not a random invented face."
    : "Reveal the exact IMAGE 1 logo/label sharp in the clear path — spell brand words as on IMAGE 1.";
  return [
    `IMAGE 1 locks the ${role} behind the glass.`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Label "${hero}" only — never swap category or cast a different hero.`
      : "Keep IMAGE 1 exact silhouette, materials, and identity.",
    revealTarget,
    "AI may invent glass condensation + droplet physics only — never invent a new hero.",
  ].join(" ");
}

function optionalStyleHint(extra?: string): string {
  const t = extra?.trim().slice(0, 140);
  return t
    ? `Optional mood (keep wet-glass reveal + identity locked): ${t}.`
    : "";
}

const PLATE_RULES =
  "Wet-glass-reveal — hero behind glass, condensation on glass, clear path reveals identity. " +
  "No gibberish letters, captions, watermarks, UI chrome, visible hands, or magic VFX.";

export function buildWetGlassRevealStillPrompt(input: {
  dialect: WetGlassRevealDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: WetGlassRevealFrame;
  editingStartPlate?: boolean;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "3:4";
  const isEndEdit = input.frame === "end" && Boolean(input.editingStartPlate);
  const beat = expandDialectTokens(
    schemeStillBeat(def, input.frame, isEndEdit),
    input.dialect,
  );
  return [
    `Photoreal advertising still, ${ar}.`,
    photoLock(hero, input.conceptMode),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level condensation edit only."
      : "Single locked plate ready for subtle start→end condensation morph.",
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

export function buildWetGlassRevealVideoPrompt(input: {
  dialect: WetGlassRevealDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const sec = clampWetGlassRevealDurationSec(input.durationSec);
  return [
    `Wet-glass-reveal ad, ${sec}s. Continuous morph from Image 1 (fogged) to Image 2 (cleared path) with MINIMAL delta.`,
    `Dialect: ${def.label}. ${def.videoLead}`,
    nameIsClaimImage1IsObjectLine(hero),
    LOCKED_CAMERA,
    "CRITICAL: same hero identity and geometry for the entire clip — never morph bottle/face/logo, never change proportions.",
    "CRITICAL: only condensation / droplets / clear trail animate — no hard cuts, no montage, no particle magic, no visible hand.",
    "Rhythm: slow, restrained, realistic — high-end discovery-in-hiding.",
    optionalStyleHint(input.promptExtra),
    "No gibberish letters, no social watermarks, no UI chrome, no sudden wipe transition effect.",
  ].join(" ");
}

export const WET_GLASS_REVEAL_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "blurry product identity morph, different bottle, different person, gender swap, " +
  "stretching product, warped label, melted logo, invent competitor brands, " +
  "visible hand wiping glass, finger in frame, magic glow, light streaks as VFX, " +
  "particle burst, glitter, lens flare spam, camera zoom, camera orbit, push-in, " +
  "garbled text, illegible end-frame logo when clear path should reveal it, " +
  "UI chrome, social stickers, sudden wipe transition, rectangular hard mask";

/** H3 motion strength — keep moderate so geometry stays locked. */
export const WET_GLASS_REVEAL_MOTION_STRENGTH = 52;
