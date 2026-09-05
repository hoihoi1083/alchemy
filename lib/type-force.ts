/** Type-force poster dialects — physical force applied to on-scene typography. */

export const TYPE_FORCE_DIALECT_IDS = [
  "sound-wave",
  "refraction",
  "tension",
  "shock-wave",
] as const;

export type TypeForceDialectId = (typeof TYPE_FORCE_DIALECT_IDS)[number];
export type TypeForceDialectPick = TypeForceDialectId | "auto";

export function typeForceDialectPreviewSrc(id: TypeForceDialectId): string {
  return `/images/studio/schemes/type-force/${id}.png?v=1`;
}

export function isTypeForceDialectId(v: string): v is TypeForceDialectId {
  return (TYPE_FORCE_DIALECT_IDS as readonly string[]).includes(v);
}

export function parseTypeForceDialectPick(
  raw: string | null | undefined,
): TypeForceDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isTypeForceDialectId(v) ? v : "auto";
}

/** Infer force from product / copy cues when pick is auto. */
export function resolveTypeForceDialect(
  pick: TypeForceDialectPick,
  cue = "",
): TypeForceDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (
    /\b(headphone|earbud|airpod|speaker|dj|music|audio|音|耳機|耳机|喇叭|声波|聲波)\b/.test(
      t,
    )
  ) {
    return "sound-wave";
  }
  if (
    /\b(perfume|parfum|glass|prism|crystal|bottle|香水|玻璃|折射|veil)\b/.test(t)
  ) {
    return "refraction";
  }
  if (
    /\b(climb|rope|ascend|grip|tension|拉力|攀岩|绳|繩|张力|張力|hold)\b/.test(t)
  ) {
    return "tension";
  }
  if (
    /\b(tennis|racket|ball|serve|smash|冲击|衝擊|shock|spike|sport)\b/.test(t)
  ) {
    return "shock-wave";
  }
  return "shock-wave";
}

export function typeForceDialectClause(id: TypeForceDialectId): string {
  switch (id) {
    case "sound-wave":
      return [
        "FORCE DIALECT — SOUND WAVE:",
        "A clear force origin (headphones, speaker, DJ console, or audio product) emits concentric sound ripples.",
        "Only letter strokes near the origin are pushed / rippled outward; farther letters stay calmer.",
        "Product / person / background stay structurally stable — do NOT warp the whole frame or melt the subject.",
        "Force logic: origin → radial outward → fades before frame edge.",
      ].join(" ");
    case "refraction":
      return [
        "FORCE DIALECT — REFRACTION:",
        "Large hero word sits IN the scene. Where letters pass behind / through glass, perfume bottle, or prism: local misalignment + subtle chromatic fringe.",
        "Occlusion is real (model or bottle can cover parts of letters). Outside glass, type stays sharp.",
        "Do NOT globally liquify the line or background. Force logic: glass edge = origin of optical bend → along glass thickness → ends past the far edge.",
      ].join(" ");
    case "tension":
      return [
        "FORCE DIALECT — TENSION:",
        "Visible ropes / cables / straps hook onto the giant letters and pull them.",
        "Letters stretch / elongate only at contact points in the pull direction; other strokes keep readable weight.",
        "Show force direction clearly (taut lines, anchor points). Subject and product stay intact — only type deforms under tension.",
      ].join(" ");
    case "shock-wave":
      return [
        "FORCE DIALECT — SHOCK WAVE:",
        "A clear impact point (ball on racket, foot strike, collision) sends a shock ripple through the giant word.",
        "Letters nearest impact compress / scatter; concentric ripples may ring the contact. Subject body stays whole.",
        "Background architecture stays mostly stable. Force logic: impact origin → short radial burst → dies quickly.",
      ].join(" ");
  }
}
