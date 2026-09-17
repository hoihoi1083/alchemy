/** Spatial-layout poster dialects — type as architecture (not force deformation). */

export const SPATIAL_LAYOUT_DIALECT_IDS = [
  "planes",
  "void",
  "extrude",
  "corner",
] as const;

export type SpatialLayoutDialectId = (typeof SPATIAL_LAYOUT_DIALECT_IDS)[number];
export type SpatialLayoutDialectPick = SpatialLayoutDialectId | "auto";

export function spatialLayoutDialectPreviewSrc(id: SpatialLayoutDialectId): string {
  return `/images/studio/schemes/spatial-layout/${id}.jpg?v=1`;
}

export function isSpatialLayoutDialectId(v: string): v is SpatialLayoutDialectId {
  return (SPATIAL_LAYOUT_DIALECT_IDS as readonly string[]).includes(v);
}

export function parseSpatialLayoutDialectPick(
  raw: string | null | undefined,
): SpatialLayoutDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isSpatialLayoutDialectId(v) ? v : "auto";
}

/** Infer dialect from product / copy cues when pick is auto. */
export function resolveSpatialLayoutDialect(
  pick: SpatialLayoutDialectPick,
  cue = "",
): SpatialLayoutDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (/\b(void|carve|cut.?through|opening|開口|开口|镂空|鏤空)\b/.test(t)) {
    return "void";
  }
  if (/\b(extrude|extrusion|weight|mass|立体|擠出|挤出|厚字)\b/.test(t)) {
    return "extrude";
  }
  if (/\b(corner|wrap|two.?sides|轉角|转角|墙角|牆角)\b/.test(t)) {
    return "corner";
  }
  if (
    /\b(plane|slab|between|float|offset|傾斜|倾斜|平面|層板|层板)\b/.test(t)
  ) {
    return "planes";
  }
  return "planes";
}

export function spatialLayoutSceneClause(): string {
  return [
    "SPATIAL LAYOUT DNA:",
    "Brutalist / architectural commercial poster — concrete planes, bright blue sky, high contrast.",
    "Typography EXISTS IN 3D SPACE: painted on surfaces, carved as openings, extruded as mass, or wrapped on a corner — NOT flat Canva overlays floating in 2D.",
    "Accent: vivid safety orange for key phrases / inner cut surfaces / translucent volume box.",
    "Secondary chrome only: tiny technical labels (height, gap, depth, material cues) — never compete with the hero word(s).",
    "Optional tiny scale person for monumentality. Single 9:16 still — not a carousel.",
    "PRODUCT mode: when IMAGE 1 is attached, keep exact product identity; place product ON / IN / AGAINST the spatial structure (slab edge, inside a void letter, on extruded type, at the corner) — product stays intact, type stays architectural.",
    "CONCEPT mode: headline words ARE the architecture — no fake SKU required.",
  ].join(" ");
}

export function spatialLayoutDialectClause(id: SpatialLayoutDialectId): string {
  switch (id) {
    case "planes":
      return [
        "DIALECT — BETWEEN PLANES:",
        "Tilted concrete slabs / floating levels under open sky. Giant words sit ON or BETWEEN the planes in true perspective (e.g. FLOAT LEVEL / BETWEEN PLANES).",
        "One translucent orange volume box or wireframe volume may mark the spatial gap. Small labels like OFFSET HEIGHT / SPATIAL GAP OK.",
        "Force logic is NOT deformation — type is aligned to plane perspective.",
      ].join(" ");
    case "void":
      return [
        "DIALECT — SOLID / VOID:",
        "Thick concrete wall with giant letters CARVED THROUGH as openings (solid/void). Inner faces of cut letters painted vivid orange.",
        "A person may stand INSIDE a letter opening for scale. Sky visible through the cuts.",
        "Support line idea: WORDS BECOME OPENINGS / STEP THROUGH — secondary only.",
      ].join(" ");
    case "extrude":
      return [
        "DIALECT — EXTRUDED MASS:",
        "Giant extruded 3D word as walkable architecture: front faces off-white / cream, extruded sides vivid orange, resting on concrete.",
        "Low-angle hero. Optional person standing on a letter ledge. Support: WORDS HAVE WEIGHT / STEP INSIDE.",
        "Letters have real mass and depth — not flat stickers.",
      ].join(" ");
    case "corner":
      return [
        "DIALECT — CORNER WRAP:",
        "Worm’s-eye view of a sharp concrete building corner. Giant type WRAPS both faces in perspective (e.g. OPEN / CORNER).",
        "Semi-transparent orange 3D box / wireframe prism at the corner where subject or product sits.",
        "Support: TWO SIDES / TURN THE GRID — type follows the architecture, never floats free of the planes.",
      ].join(" ");
  }
}
