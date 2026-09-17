/**
 * Torn paper reveal (撕纸揭示) — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (XHS AIGC 撕纸创意海报): DRY matte pear / tissue paper covers the hero →
 * a jagged fibrous tear propagates (axis auto-picked for product) → label / mark sharp.
 * Dual-frame identity recipe (same family as wet-glass-reveal) — MUST NOT collapse to wet glass.
 *
 * ─── Generate contract (product + concept) ───────────────────────────────────
 * Required
 *   · Hero still (IMAGE 1) — identity lock
 *       Product: clear product photo (label readable on upload)
 *       Concept: person / brand figure / logo / packaging still
 *   · Headline — mood only; brand words come from IMAGE 1 label
 * Optional
 *   · Dialect — auto | strip-tear | peel-curl | wide-rip
 *   · Duration — 6 | 8 (default 6); no "auto"
 * Locked
 *   · Engine MiniMax H3 · still AR 3:4 · video AR 9:16 · locked camera · BGM after H3
 * Pipeline
 *   1) Start still — unbroken DRY paper fully covers; logo/label ILLEGIBLE
 *   2) End still — same plate; fibrous tear opening reveals logo/label sharp
 *   3) H3 morph — tear propagation only (crack → open); product geometry locked
 * What AI may invent: paper fiber, tear edge, soft shadow — never a new hero.
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const TORN_PAPER_REVEAL_DURATION_OPTIONS = ["6", "8"] as const;
export const TORN_PAPER_REVEAL_DURATION_SEC = 6;

export function clampTornPaperRevealDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 6;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 6;
  return Math.round(n) <= 6 ? 6 : 8;
}

export function tornPaperRevealDurationOptions(): VideoDuration[] {
  return [...TORN_PAPER_REVEAL_DURATION_OPTIONS];
}

export const TORN_PAPER_REVEAL_DIALECT_IDS = [
  "strip-tear",
  "peel-curl",
  "wide-rip",
] as const;

export type TornPaperRevealDialectId =
  (typeof TORN_PAPER_REVEAL_DIALECT_IDS)[number];
export type TornPaperRevealDialectPick = TornPaperRevealDialectId | "auto";

/** Tear propagation axis — chosen for product shape (not a separate UI dialect). */
export const TORN_PAPER_TEAR_AXIS_IDS = [
  "horizontal",
  "vertical",
  "diagonal",
] as const;
export type TornPaperTearAxis = (typeof TORN_PAPER_TEAR_AXIS_IDS)[number];

export function tornPaperRevealDialectPreviewSrc(
  id: TornPaperRevealDialectId,
): string {
  return `/images/studio/schemes/torn-paper-reveal/${id}.png?v=2`;
}

export function isTornPaperRevealDialectId(
  value: string | null | undefined,
): value is TornPaperRevealDialectId {
  return (TORN_PAPER_REVEAL_DIALECT_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseTornPaperRevealDialectPick(
  raw: unknown,
): TornPaperRevealDialectPick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isTornPaperRevealDialectId(s) ? s : "auto";
}

export function resolveTornPaperRevealDialect(input: {
  pick: TornPaperRevealDialectPick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): TornPaperRevealDialectId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (/curl|peel|卷|掀|翻/.test(text)) return "peel-curl";
  if (/wide|big.?rip|broad|宽|闊|大撕/.test(text)) return "wide-rip";
  if (/strip|thin|tear|撕|纸|紙|pear/.test(text)) return "strip-tear";
  return "strip-tear";
}

/**
 * Pick tear axis for the hero. Heuristic only (no vision bbox yet):
 * tall bottles / pumps → vertical strip over the label; wide packs / jars → horizontal;
 * explicit keywords win. Goal: tear crosses the brand mark at a readable angle.
 */
export function resolveTornPaperTearAxis(input: {
  product?: string;
  headline?: string;
  conceptIdea?: string;
  dialect?: TornPaperRevealDialectId;
}): TornPaperTearAxis {
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /vertical|portrait.?tear|竖撕|豎撕|直撕|纵向|縱向|up.?down|top.?to.?bottom/.test(
      text,
    )
  ) {
    return "vertical";
  }
  if (
    /diagonal|斜撕|对角|對角|corner.?tear|slash/.test(text)
  ) {
    return "diagonal";
  }
  if (
    /horizontal|横撕|橫撕|左右|left.?to.?right|L\s*→\s*R|band.?tear/.test(text)
  ) {
    return "horizontal";
  }
  // Tall / slender SKUs — vertical tear follows bottle + label column.
  if (
    /\b(bottle|pump|serum|toner|spray|vial|flask|dropper|lipstick|mascara|pen|tube)\b|瓶|泵|精华|精華|喷雾|噴霧|管|口红|口紅/.test(
      text,
    )
  ) {
    return "vertical";
  }
  // Wide / flat packs — horizontal band across the face.
  if (
    /\b(box|jar|tin|pouch|sachet|bag|carton|tub|kit|palette|compact)\b|盒|罐|袋|礼盒|禮盒|套装|套裝/.test(
      text,
    )
  ) {
    return "horizontal";
  }
  // Peel-curl reads well as a diagonal lift; strip/wide default horizontal.
  if (input.dialect === "peel-curl") return "diagonal";
  return "horizontal";
}

function tearAxisClause(axis: TornPaperTearAxis): {
  stillEnd: string;
  videoPath: string;
  short: string;
} {
  switch (axis) {
    case "vertical":
      return {
        short: "vertical",
        stillEnd:
          "A thin irregular VERTICAL fibrous tear (propagating top→bottom or bottom→top) " +
          "opens a tall window over the logo/label column — jagged white pulp edges, paper thickness visible.",
        videoPath:
          "the paper RENDS as a thin irregular VERTICAL tear that propagates along the label column " +
          "(top→bottom or bottom→top), fibers separating with visible thickness — not a soft fog clear.",
      };
    case "diagonal":
      return {
        short: "diagonal",
        stillEnd:
          "An irregular DIAGONAL fibrous tear / peel (corner toward opposite corner) " +
          "opens a clear window over the logo/label — jagged white pulp edges + slight curl lip.",
        videoPath:
          "the paper RENDS on a DIAGONAL path (corner→opposite), fibers separating and a soft curl lip forming — " +
          "not a soft fog clear, not a hard wipe.",
      };
    case "horizontal":
    default:
      return {
        short: "horizontal",
        stillEnd:
          "A thin irregular HORIZONTAL fibrous tear strip (propagating left→right) " +
          "opens a band over the logo/label — jagged white pulp edges, paper thickness visible.",
        videoPath:
          "the paper RENDS as a thin irregular HORIZONTAL strip tear propagating left→right across the logo band, " +
          "fibers separating with visible thickness — not a soft fog clear.",
      };
  }
}

export type TornPaperRevealFrame = "start" | "end";

type DialectDef = {
  id: TornPaperRevealDialectId;
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

/** Anti wet-glass: "translucent + haze" alone collapses to fogged glass on NB/H3. */
const PAPER_LAYER =
  "Foreground is ONE sheet of DRY matte pear / mulberry / tissue paper covering the entire frame in front of the hero. " +
  "Paper is cream / off-white, slightly opaque, with visible pulp grain and soft fiber weave — DRY only. " +
  "Hero silhouette may show faintly THROUGH the fibers; logo/label stays UNREADABLE under unbroken paper. " +
  "FORBIDDEN substitutes (instant fail): wet glass, fogged condensation, mist pane, water droplets, rain beads, " +
  "steam wipe, soft-focus blur, liquid clear-trail, caption bar, UI overlay.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same locked camera, hero position/scale, label geometry, and DRY paper plane. " +
  "Change ONLY the fibrous torn opening that reveals the logo/label — no new products, no new people, no lighting reset, " +
  "no converting paper into glass or fog.";

const SCHEMES: Record<TornPaperRevealDialectId, DialectDef> = {
  "strip-tear": {
    id: "strip-tear",
    label: "Strip tear",
    look:
      "Warm minimal premium product still — soft natural light, cream / off-white void, photoreal DRY paper fiber.",
    startStill:
      "{LOOK} {CAMERA} {HERO} {PAPER} " +
      "START: unbroken DRY pear-paper sheet fully covers the hero — continuous sheet, NO tear, NO hole, NO crack yet. " +
      "Visible pulp grain; soft fiber haze only (not water mist); logo/label ILLEGIBLE.",
    endStill:
      "{LOOK} {CAMERA} {HERO} {PAPER} END: same locked plate + same DRY paper. " +
      "{AXIS_STILL_END} " +
      "Torn lips overlap slightly; white fluffy fibrous edges catch soft light. " +
      "Logo/label SHARP and readable ONLY inside the tear opening. " +
      "NOT a hard rectangle mask, NOT wet glass, NOT a fog clear patch.",
    endPlateEdit:
      "{END_EDIT} Tear open a fibrous strip over the logo/label zone only ({AXIS_SHORT} axis); " +
      "keep unbroken DRY paper elsewhere; show jagged white pulp edges with thickness.",
    videoLead:
      "Locked tripod. Beat 0–1s: hold on fully covered DRY paper (no motion). " +
      "Then {AXIS_VIDEO} " +
      "End: logo sharp inside the opening; surrounding paper stays dry and fibrous. " +
      "Mandatory: visible paper-rending action (crack → propagate → open). " +
      "FORBIDDEN: fog dissolve, droplet trail, condensation wipe, soft opacity fade without tear edge.",
  },
  "peel-curl": {
    id: "peel-curl",
    label: "Peel curl",
    look:
      "Same warm minimal premium world as strip-tear — DRY paper peels with a soft curl lip.",
    startStill:
      "{LOOK} {CAMERA} {HERO} {PAPER} " +
      "START: unbroken DRY paper fully covers; logo/label illegible; NO peel started yet.",
    endStill:
      "{LOOK} {CAMERA} {HERO} {PAPER} END: same locked plate. " +
      "{AXIS_STILL_END} Paper has peeled back with a soft curl lip along the jagged tear. " +
      "Fibrous edges + curl shadow — label sharp in the revealed zone only.",
    endPlateEdit:
      "{END_EDIT} Peel/curl the DRY paper opening over the logo/label ({AXIS_SHORT} axis); " +
      "keep fiber edges natural; no hand; no wet glass.",
    videoLead:
      "Locked tripod. Covered DRY-paper hold → paper slowly peels/curls open ({AXIS_SHORT} path) over the logo zone. " +
      "Tactile fiber edges, soft curl lip, visible rending — not a hard wipe, not fog clearing.",
  },
  "wide-rip": {
    id: "wide-rip",
    label: "Wide rip",
    look:
      "Same cream minimal premium still — wider jagged rip for a bolder poster reveal.",
    startStill:
      "{LOOK} {CAMERA} {HERO} {PAPER} " +
      "START: dense unbroken DRY paper cover; mark/text illegible; no rip yet.",
    endStill:
      "{LOOK} {CAMERA} {HERO} {PAPER} END: same locked plate. " +
      "{AXIS_STILL_END} Wider irregular fibrous rip (still not rectangular) reveals more of the hero " +
      "with the logo/label sharp in the clear opening; paper remains outside the rip with thick torn edges.",
    endPlateEdit:
      "{END_EDIT} Widen a fibrous rip over the mark/label ({AXIS_SHORT} axis); " +
      "keep DRY paper bands outside; show thick white pulp edges.",
    videoLead:
      "Locked tripod. Paper holds dry, then a wider fibrous rip RENDS open across the label ({AXIS_SHORT}). " +
      "Same identity — only the paper tear animates. Slow, editorial, tactile fiber physics.",
  },
};

function expandDialectTokens(
  beat: string,
  dialect: TornPaperRevealDialectId,
  axis: TornPaperTearAxis,
): string {
  const def = SCHEMES[dialect];
  const axisC = tearAxisClause(axis);
  return beat
    .replace(/\{LOOK\}/g, def.look)
    .replace(/\{CAMERA\}/g, LOCKED_CAMERA)
    .replace(/\{HERO\}/g, HERO_LOCK)
    .replace(/\{PAPER\}/g, PAPER_LAYER)
    .replace(/\{END_EDIT\}/g, END_EDIT_LOCK)
    .replace(/\{AXIS_STILL_END\}/g, axisC.stillEnd)
    .replace(/\{AXIS_VIDEO\}/g, axisC.videoPath)
    .replace(/\{AXIS_SHORT\}/g, axisC.short);
}

function schemeStillBeat(
  def: Pick<DialectDef, "startStill" | "endStill" | "endPlateEdit">,
  frame: TornPaperRevealFrame,
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
    ? "Tear opening must frame eyes, mark, or key brand detail sharp — not a random invented face."
    : "Tear opening must frame the exact IMAGE 1 logo/label sharp — spell brand words as on IMAGE 1.";
  return [
    `IMAGE 1 locks the ${role} behind the DRY torn paper.`,
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Label "${hero}" only — never swap category or cast a different hero.`
      : "Keep IMAGE 1 exact silhouette, materials, and identity.",
    revealTarget,
    "AI may invent paper fiber + tear physics only — never invent a new hero. " +
      "FORBIDDEN: wet glass / condensation / droplet / fog-wipe substitute.",
  ].join(" ");
}

function optionalStyleHint(extra?: string): string {
  const t = extra?.trim().slice(0, 140);
  return t
    ? `Optional mood (keep DRY torn-paper reveal + identity locked): ${t}.`
    : "";
}

const PLATE_RULES =
  "Torn-paper-reveal — hero behind DRY translucent pear paper; fibrous tear opens to reveal identity. " +
  "NOT wet glass. No gibberish letters, captions, watermarks, UI chrome, visible hands, or magic VFX.";

export function buildTornPaperRevealStillPrompt(input: {
  dialect: TornPaperRevealDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: TornPaperRevealFrame;
  editingStartPlate?: boolean;
  tearAxis?: TornPaperTearAxis;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "3:4";
  const axis =
    input.tearAxis ??
    resolveTornPaperTearAxis({
      product: input.product,
      headline: input.headline,
      conceptIdea: input.promptExtra,
      dialect: input.dialect,
    });
  const isEndEdit = input.frame === "end" && Boolean(input.editingStartPlate);
  const beat = expandDialectTokens(
    schemeStillBeat(def, input.frame, isEndEdit),
    input.dialect,
    axis,
  );
  return [
    `Photoreal advertising still, ${ar}.`,
    photoLock(hero, input.conceptMode),
    `${input.frame.toUpperCase()} frame (${def.label}, ${axis} tear): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level DRY paper-tear edit only."
      : "Single locked plate ready for start→end paper-rend morph (large visible tear delta).",
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

export function buildTornPaperRevealVideoPrompt(input: {
  dialect: TornPaperRevealDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
  tearAxis?: TornPaperTearAxis;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const sec = clampTornPaperRevealDurationSec(input.durationSec);
  const axis =
    input.tearAxis ??
    resolveTornPaperTearAxis({
      product: input.product,
      headline: input.headline,
      conceptIdea: input.promptExtra,
      dialect: input.dialect,
    });
  const lead = expandDialectTokens(def.videoLead, input.dialect, axis);
  return [
    `Torn-paper-reveal ad, ${sec}s. Continuous morph from Image 1 (unbroken DRY paper cover) to Image 2 (fibrous tear open).`,
    `Dialect: ${def.label}. Tear axis: ${axis}. ${lead}`,
    nameIsClaimImage1IsObjectLine(hero),
    LOCKED_CAMERA,
    "CRITICAL: same hero identity and geometry for the entire clip — never morph bottle/face/logo.",
    "CRITICAL: the ONLY motion is paper tearing / peeling / rending — jagged fibrous edge must travel frame-to-frame.",
    "CRITICAL: if the motion looks like fog clearing, droplets, or a soft opacity wipe, it FAILED — restart as paper tear.",
    "Rhythm: brief covered hold → tear crack initiates → strip propagates → logo sharp. High-end 撕纸 poster energy.",
    optionalStyleHint(input.promptExtra),
    "No gibberish letters, no social watermarks, no UI chrome, no condensation glass substitute, no water droplets.",
  ].join(" ");
}

export const TORN_PAPER_REVEAL_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "blurry product identity morph, different bottle, different person, gender swap, " +
  "stretching product, warped label, melted logo, invent competitor brands, " +
  "visible hand tearing paper, finger in frame, " +
  "wet glass, condensation droplets, fogged glass wipe, mist clearing, rain beads, water drops on glass, " +
  "soft fog dissolve, opacity fade without tear edge, liquid clear trail, steam wipe, " +
  "magic glow, particle burst, glitter, camera zoom, camera orbit, push-in, " +
  "garbled text, illegible end-frame logo when tear should reveal it, " +
  "UI chrome, social stickers, rectangular hard mask wipe";

/**
 * H3 motion strength — higher than wet-glass so the tear edge actually propagates.
 * Still moderate enough to keep product geometry locked.
 */
export const TORN_PAPER_REVEAL_MOTION_STRENGTH = 66;
