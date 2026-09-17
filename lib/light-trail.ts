/** Light-trail poster dialects — 动感光轨电影风 (crimson/cyan cinematic streaks). */

export const LIGHT_TRAIL_DIALECT_IDS = [
  "cast-streak",
  "eye-slash",
  "mask-beam",
  "profile-shear",
] as const;

export type LightTrailDialectId = (typeof LIGHT_TRAIL_DIALECT_IDS)[number];
export type LightTrailDialectPick = LightTrailDialectId | "auto";

export function lightTrailDialectPreviewSrc(id: LightTrailDialectId): string {
  return `/images/studio/schemes/light-trail/${id}.jpg?v=2`;
}

export function isLightTrailDialectId(v: string): v is LightTrailDialectId {
  return (LIGHT_TRAIL_DIALECT_IDS as readonly string[]).includes(v);
}

export function parseLightTrailDialectPick(
  raw: string | null | undefined,
): LightTrailDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isLightTrailDialectId(v) ? v : "auto";
}

/** Infer dialect from product / copy cues when pick is auto. */
export function resolveLightTrailDialect(
  pick: LightTrailDialectPick,
  cue = "",
): LightTrailDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (
    /\b(mask|batman|helmet|armor|hero|面具|盔甲|英雄|武士)\b/.test(t)
  ) {
    return "mask-beam";
  }
  if (
    /\b(profile|side|shoulder|silhouette|側臉|侧脸|剪影|回眸)\b/.test(t)
  ) {
    return "profile-shear";
  }
  if (
    /\b(portrait|face|eyes|close.?up|人像|特寫|特写|眼神)\b/.test(t)
  ) {
    return "eye-slash";
  }
  if (
    /\b(cast|team|group|crew|band|lineup|團隊|团队|群像|組合|组合)\b/.test(
      t,
    )
  ) {
    return "cast-streak";
  }
  return "cast-streak";
}

export function lightTrailSceneClause(): string {
  return [
    "LIGHT TRAIL / 动感光轨电影风 DNA:",
    "Dark cinematic still — deep teal / charcoal base with CRIMSON (猩红) and CYAN-BLUE (青蓝) neon contrast.",
    "PRIMARY GRAPHIC = long-exposure LIGHT TRAILS — sharp horizontal / diagonal / vertical beams that streak across the frame, creating speed, glitch energy, and neon bloom.",
    "Subjects (people / product) stay PHOTOREAL and identity-locked — trails pass IN FRONT of and BEHIND them; faces stay readable where not intentionally slash-obscured.",
    "NOT flat Canva neon stickers. NOT giant architectural type (spatial-layout). NOT force-melted letters (type-force). NOT 2D cartoon doodles (photo-doodle). NOT gaming HUD chrome.",
    "PRODUCT mode: when IMAGE 1 is attached, keep EXACT product / person identity; trails wrap and streak around the subject — do not rematerialize the product.",
    "CONCEPT mode: no SKU required — hero / cast / mood scene can be generated; theme drives trail dialect.",
    "Hero headline is OPTIONAL and secondary — mood is light + speed. If headline present, keep small integrated type only, not giant type architecture.",
    "Single 9:16 commercial key-visual still — movie-grade digital render, cyber light realism.",
  ].join(" ");
}

export function lightTrailDialectClause(id: LightTrailDialectId): string {
  switch (id) {
    case "cast-streak":
      return [
        "DIALECT — CAST STREAK:",
        "Group / cast lineup facing camera in a dark industrial or night set. Dense HORIZONTAL light trails in crimson + cyan cut across the crew — some in front, some behind.",
        "Dual-tone speed: left bias crimson, right bias cyan (or interleaved). Floor reflections optional. Team / brand campaign energy.",
      ].join(" ");
    case "eye-slash":
      return [
        "DIALECT — EYE SLASH:",
        "Close portrait or multi-face row. One or more HARD horizontal crimson beams slash across the eye line — glitch / censor / scan energy without erasing identity.",
        "Dark teal background. Neon bloom on the slash. Faces stay sharp above/below the streak.",
      ].join(" ");
    case "mask-beam":
      return [
        "DIALECT — MASK BEAM:",
        "Dark hero / masked / armored figure (or product as hero silhouette). VERTICAL and CROSS beams of crimson light bisect the frame — beams as composition, not decoration.",
        "Moody backlight, high contrast, cinematic digital render. Optional floating embers.",
      ].join(" ");
    case "profile-shear":
      return [
        "DIALECT — PROFILE SHEAR:",
        "Side / three-quarter portrait looking over the shoulder. DIAGONAL shear trails sweep across foreground and background, implying high-speed motion past the subject.",
        "Subject stays sharp; trails carry the motion. Crimson dominant with teal fill light.",
      ].join(" ");
  }
}
