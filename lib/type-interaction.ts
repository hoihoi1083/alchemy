/** Type-interaction poster dialects — type acts as fold / peel / slice / mirror. */

export const TYPE_INTERACTION_DIALECT_IDS = [
  "fold",
  "reveal",
  "move",
  "trace",
] as const;

export type TypeInteractionDialectId =
  (typeof TYPE_INTERACTION_DIALECT_IDS)[number];
export type TypeInteractionDialectPick = TypeInteractionDialectId | "auto";

export function typeInteractionDialectPreviewSrc(
  id: TypeInteractionDialectId,
): string {
  return `/images/studio/schemes/type-interaction/${id}.png?v=1`;
}

export function isTypeInteractionDialectId(
  v: string,
): v is TypeInteractionDialectId {
  return (TYPE_INTERACTION_DIALECT_IDS as readonly string[]).includes(v);
}

export function parseTypeInteractionDialectPick(
  raw: string | null | undefined,
): TypeInteractionDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isTypeInteractionDialectId(v) ? v : "auto";
}

export function resolveTypeInteractionDialect(
  pick: TypeInteractionDialectPick,
  cue = "",
): TypeInteractionDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (
    /\b(fold|hinge|flex|flip.?phone|折叠|摺叠|摺疊|折)\b/.test(t)
  ) {
    return "fold";
  }
  if (
    /\b(reveal|peel|mask|hydrogel|film|面膜|揭|剥|剝)\b/.test(t)
  ) {
    return "reveal";
  }
  if (
    /\b(move|run|shoe|stride|motion|跑步|跑鞋|运动|運動)\b/.test(t)
  ) {
    return "move";
  }
  if (
    /\b(trace|perfume|parfum|mirror|chrome|香水|镜|鏡)\b/.test(t)
  ) {
    return "trace";
  }
  return "fold";
}

export function typeInteractionDialectClause(
  id: TypeInteractionDialectId,
): string {
  switch (id) {
    case "fold":
      return [
        "INTERACTION DIALECT — FOLD:",
        "Hero word is physical 3D type that FOLDS across multiple planes (like a folding-phone hinge).",
        "Specify clear fold axes; letters bend along those planes. Model may stand between / inside letters.",
        "Product hinge / fold language should echo the type folds. Do NOT randomly melt letters or cut the person with fold seams.",
      ].join(" ");
    case "reveal":
      return [
        "INTERACTION DIALECT — REVEAL:",
        "Hero word behaves like a thin translucent film / hydrogel sheet being peeled.",
        "Part of the type rides on the peeling layer (distorts with the peel); under-layer type stays calmer.",
        "Keep the model’s face / body intact — only film + type peel. Specular plastic/gel highlights on the sheet.",
      ].join(" ");
    case "move":
      return [
        "INTERACTION DIALECT — MOVE:",
        "Hero word (often repeated) is sliced into ~4–5 staggered horizontal bands implying speed / folded planes.",
        "CRITICAL: only the TYPOGRAPHY is sliced/shifted — the runner or hero subject stays WHOLE and continuous.",
        "Layer subject through the bands (body in front of some bands, behind others) without chopping limbs.",
      ].join(" ");
    case "trace":
      return [
        "INTERACTION DIALECT — TRACE:",
        "Hero letters are flat mirror / polished chrome facets that REFLECT the model, product bottle, and colored light.",
        "Reflections must show recognizable scene cues (figure, bottle, wine-red or dramatic rim light).",
        "Letters feel like real mirrored material in space — not a flat sticker. Product sits in foreground when relevant.",
      ].join(" ");
  }
}
