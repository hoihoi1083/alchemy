/** Type-force poster dialects — physical force applied to on-scene typography. */

/** Product-driven force origins (headphones, glass, rope, impact). */
export const TYPE_FORCE_PRODUCT_DIALECT_IDS = [
  "sound-wave",
  "refraction",
  "tension",
  "shock-wave",
] as const;

/** Architecture / spatial type-study installs (wave · bend · buckle · shear). */
export const TYPE_FORCE_SPATIAL_DIALECT_IDS = [
  "standing-wave",
  "bend",
  "buckle",
  "shear",
] as const;

export const TYPE_FORCE_DIALECT_IDS = [
  ...TYPE_FORCE_PRODUCT_DIALECT_IDS,
  ...TYPE_FORCE_SPATIAL_DIALECT_IDS,
] as const;

export type TypeForceProductDialectId =
  (typeof TYPE_FORCE_PRODUCT_DIALECT_IDS)[number];
export type TypeForceSpatialDialectId =
  (typeof TYPE_FORCE_SPATIAL_DIALECT_IDS)[number];
export type TypeForceDialectId = (typeof TYPE_FORCE_DIALECT_IDS)[number];
export type TypeForceDialectPick = TypeForceDialectId | "auto";

export function isTypeForceProductDialect(
  id: string,
): id is TypeForceProductDialectId {
  return (TYPE_FORCE_PRODUCT_DIALECT_IDS as readonly string[]).includes(id);
}

export function isTypeForceSpatialDialect(
  id: string,
): id is TypeForceSpatialDialectId {
  return (TYPE_FORCE_SPATIAL_DIALECT_IDS as readonly string[]).includes(id);
}

export function typeForceDialectPreviewSrc(id: TypeForceDialectId): string {
  if (isTypeForceSpatialDialect(id)) {
    return `/images/studio/schemes/type-force/${id}.jpg?v=1`;
  }
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

  // Spatial / architecture type-study cues first.
  if (
    /\b(buckle|buckling|crush|column|i-beam|壓屈|压屈|屈曲|柱)\b/.test(t)
  ) {
    return "buckle";
  }
  if (
    /\b(shear|offset|lateral|displace|錯位|错位|剪切|側向|侧向)\b/.test(t)
  ) {
    return "shear";
  }
  if (
    /\b(bend|flexur|deflect|weight|cable|彎曲|弯曲|撓|挠|荷重)\b/.test(t) &&
    !/\b(refraction|glass|prism)\b/.test(t)
  ) {
    return "bend";
  }
  if (
    /\b(standing.?wave|spatial|gallery|atrium|museum|installation|空間海報|空间海报|駐波|驻波|type study)\b/.test(
      t,
    )
  ) {
    return "standing-wave";
  }

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
    /\b(climb|rope|ascend|grip|tension|拉力|攀岩|绳|繩|张力|張力|hold)\b/.test(
      t,
    )
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
    case "standing-wave":
      return [
        "SPATIAL DIALECT — STANDING WAVE (ribbon oscillation ONLY):",
        "Bright modern gallery / atrium with skylight and polished floor.",
        "Giant word built as CONTINUOUS flowing RIBBON / strip type suspended in the volume — soft fabric or thin sheet-metal strips forming the letter shapes.",
        "MANDATORY VISIBLE DEFORMATION: the ribbon path must show clear standing-wave UNDULATION — peaks and troughs along the letter strokes (frequency / amplitude / phase readable at poster scale).",
        "If the word looks like flat rigid block letters, solid extruded type, or a calm flat ribbon with no wave, the shot FAILS — redo with obvious oscillation curves.",
        "ONE continuous readable word. FORBIDDEN: flat / rigid / extruded solid letterforms with no wave; stacked horizontal slabs; lateral shear offsets; corrugated vertical slices; sliced-layer walls; I-beam crush; hanging weights on cables.",
        "Optional tiny scale person far in the hall. Force logic: oscillation along the letter path — ribbons undulate, never fragment into offset blocks.",
      ].join(" ");
    case "bend":
      return [
        "SPATIAL DIALECT — BEND / FLEXURAL LOAD (cables + weights ONLY):",
        "Bright gallery / atrium. Giant word as thick STRUCTURAL letterforms that behave like ELASTIC BEAMS (not infinitely stiff I-beam steel).",
        "Thin cables from the ceiling attach to specific letter strokes and hang heavy colored geometric weights (cubes / spheres / cylinders).",
        "BEAM PHYSICS: where a weight hangs, the letter stroke MUST sag under gravity — horizontal bars bow downward (smile curve); free ends droop; vertical stems lean toward the load.",
        "MANDATORY VISIBLE DEFORMATION: deflection obvious at poster scale — at least ~10–20% of letter height of curvature at loaded spans. Straight Euclidean edges at attachment points = FAIL.",
        "Do NOT invent a floating product through the word. Product on floor/pedestal only.",
        "FORBIDDEN: props-only install (weights + cables while letters stay rigid); infinitely stiff / undeformed type; 'strength / uncompromised / no flex' narrative; melting into floor taffy; ribbon standing-wave; stacked shear slabs; I-beam crush without cables.",
        "Optional tiny scale person looking up. Force logic: gravity on weight → cable tension → local bending moment → letter stroke curves → word still legible as bent solid type.",
      ].join(" ");
    case "buckle":
      return [
        "SPATIAL DIALECT — BUCKLE (axial compression ONLY):",
        "Bright atrium with skylight. Giant VERTICAL letters act as load-bearing COLUMNS.",
        "A heavy industrial I-beam (or equivalent mass) rests ON TOP of the letter columns and compresses them downward.",
        "MANDATORY VISIBLE DEFORMATION: each letter column must visibly BUCKLE — mid-height bow outward, S-curve, or crushed lean under the beam. Vertical strokes must NOT stay plumb.",
        "If letters look like perfect straight columns with a beam resting on top, the shot FAILS — show instability (bow / kink / twist) while the word stays readable.",
        "FORBIDDEN: props-only install (I-beam on undeformed straight type); perfectly plumb / rigid columns; 'strength / uncompromised / no buckle' narrative; hanging cables with colorful weights (that is bend); ribbon wave; lateral slab shear; melting floor strands.",
        "Tiny scale person in foreground. Force logic: axial compression from above → buckling instability → letter path curves under load.",
      ].join(" ");
    case "shear":
      return [
        "SPATIAL DIALECT — SHEAR (lateral slab offset ONLY):",
        "Bright gallery hall. Giant word painted / formed across a wall of thick HORIZONTAL stacked slabs / blocks.",
        "MANDATORY VISIBLE DEFORMATION: each slab layer must be laterally OFFSET from its neighbors — staircase / staggered misalignment so letter fragments do NOT line up into one clean word until you mentally undo the shear.",
        "Offset distance must be obvious at poster scale (clear step between layers). Optional small red actuators / arrows hint at the push.",
        "If slabs are flush / aligned / a single solid wall with an intact clean word, the shot FAILS — redo with strong lateral displacement per layer.",
        "FORBIDDEN: flush aligned slabs with no offset; single solid unbroken type wall; ribbon standing-wave undulation; cables + hanging weights; I-beam crushing columns from above; soft melting letter strands.",
        "Tiny scale person at the base. Force logic: lateral offset per horizontal layer → sheared type. Remove the offset and the word would realign.",
      ].join(" ");
  }
}

/** Shared spatial type-study chrome (museum poster layout). */
export function typeForceSpatialSceneClause(): string {
  return [
    "SPATIAL TYPE-STUDY SCENE:",
    "Minimal architectural interior (white walls, skylight, reflective floor). Hero is the 3D type install + one physics mechanism.",
    "PHYSICS LAW (all spatial dialects): gravity and applied loads MUST change letter geometry. Type behaves as an elastic structure under the dialect force — NOT infinitely stiff steel that ignores load.",
    "Props alone (cables, weights, I-beam, slabs) without visible deformation of the letters = FAILED physics study. Chrome may say flex/buckle/wave/shear only if the geometry shows it.",
    "PRODUCT PLACEMENT: product rests on the floor or a low pedestal in the foreground / corner — never floating mid-air through the giant word.",
    "Poster chrome (small, secondary): corner study labels (e.g. study name + city/dates), thin vertical vocab list, short bottom aphorism — never compete with the giant word. Spell chrome as real short words — no gibberish.",
    "PRODUCT IDENTITY (when IMAGE 1 is attached):",
    "Keep the EXACT product / packaging / bottle / device from IMAGE 1 in the scene — same silhouette, materials, label, category.",
    "Product may sit as a museum object near the install, or lightly suggest the force origin — it MUST NOT be replaced by a car, vehicle, furniture, or any invented SKU.",
    "NEVER invent a white concept car, EV, Honda, or unrelated hero object when IMAGE 1 is a different product (serum, bottle, cosmetics, etc.).",
    "When concept / text-only (no IMAGE 1 product): brand or headline word IS the install — no fake SKU required; do not invent a car either.",
  ].join(" ");
}
