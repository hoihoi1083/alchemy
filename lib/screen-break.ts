/** Screen-break poster dialects — 破屏出界 (subject breaks out of UI / phone plane). */

export const SCREEN_BREAK_DIALECT_IDS = [
  "tear-reach",
  "tear-peek",
  "phone-studio",
  "phone-ground",
] as const;

export type ScreenBreakDialectId = (typeof SCREEN_BREAK_DIALECT_IDS)[number];
export type ScreenBreakDialectPick = ScreenBreakDialectId | "auto";

export function screenBreakDialectPreviewSrc(id: ScreenBreakDialectId): string {
  return `/images/studio/schemes/screen-break/${id}.jpg?v=1`;
}

export function isScreenBreakDialectId(v: string): v is ScreenBreakDialectId {
  return (SCREEN_BREAK_DIALECT_IDS as readonly string[]).includes(v);
}

export function parseScreenBreakDialectPick(
  raw: string | null | undefined,
): ScreenBreakDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isScreenBreakDialectId(v) ? v : "auto";
}

/** Infer dialect from product / copy cues when pick is auto. */
export function resolveScreenBreakDialect(
  pick: ScreenBreakDialectPick,
  cue = "",
): ScreenBreakDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (
    /\b(desert|rock|dust|outdoor|ground|climb|沙漠|岩石|戶外|户外|塵|尘|攀)\b/.test(
      t,
    )
  ) {
    return "phone-ground";
  }
  if (
    /\b(sneaker|shoe|phone|gold|orange|luxury|studio|運動鞋|运动鞋|球鞋|手機|手机|金色|橙色)\b/.test(
      t,
    )
  ) {
    return "phone-studio";
  }
  if (
    /\b(peek|hole|glasses|yellow|窺|窥|破洞|眼鏡|眼镜)\b/.test(t)
  ) {
    return "tear-peek";
  }
  if (
    /\b(reach|hand|tear|profile|follow|reach.?out|伸手|撕|檔案|档案|個人頁|个人页)\b/.test(
      t,
    )
  ) {
    return "tear-reach";
  }
  return "phone-studio";
}

export function screenBreakSceneClause(): string {
  return [
    "SCREEN BREAK / 破屏出界 DNA:",
    "ONE portal plane (social profile UI OR giant phone screen) is physically broken — torn paper edge OR screen rim with real thickness, shadows, and depth.",
    "Subject EXTRUDES from behind/inside the plane into viewer space — forced perspective (hand or foot large in foreground), shallow DOF, cinematic commercial render.",
    "Floating 3D chrome around the break: likes, follower stats, hearts, Prompt pills, camera icons, geometric shards — glossy, lit, with soft contact shadows.",
    "NOT flat Canva UI stickers. NOT giant architectural type as concrete (spatial-layout). NOT force-melted letters (type-force). NOT 2D cartoon doodles (photo-doodle). NOT neon light trails (light-trail).",
    "NOT web-boundary-break video grammar — this is a SINGLE still poster key-visual.",
    "PRODUCT mode (physical goods): IMAGE 1 product is the hero of the break — sneaker/device/SKU steps or pops THROUGH the portal; keep EXACT product identity; person optional as supporting model; floating chrome sells the product moment.",
    "CONCEPT mode (service / influencer / brand): person, face-ref, logo, or mascot is the hero breaking out; phone/profile UI sells personal brand or service; no SKU required; floating chrome + stats sell reach / vibe / offer.",
    "Headline is OPTIONAL but useful for campaign lockup — bold editorial type secondary to the break action. QR / small CTA pills OK.",
    "Single 9:16 (or 3:4-feeling) commercial key-visual still.",
  ].join(" ");
}

export function screenBreakDialectClause(id: ScreenBreakDialectId): string {
  switch (id) {
    case "tear-reach":
      return [
        "DIALECT — TEAR REACH:",
        "Social profile / feed UI printed on a physical card or flat plane. Jagged TORN-PAPER hole in the center. 3D subject reaches a hand FORWARD through the tear toward camera — extreme foreshortening.",
        "Floating follower cards, hearts, Prompt pills around the tear. Clean bright lighting. Profile chrome stays readable at edges.",
      ].join(" ");
    case "tear-peek":
      return [
        "DIALECT — TEAR PEEK:",
        "Same torn-paper portal through a profile UI, but subject PEEKS from behind the tear — gripping the jagged edge, face filling the hole, expressive energy.",
        "High-contrast character color pop against neutral white/grey UI. Soft shadows from torn edge onto subject.",
      ].join(" ");
    case "phone-studio":
      return [
        "DIALECT — PHONE STUDIO:",
        "Giant luxury smartphone as portal on a CLEAN white / studio set. Subject bursts out with forced-perspective FOOT or hand in extreme foreground (e.g. white sneaker with textured sole).",
        "Orange / white / gold palette energy. Floating metallic social icons, editorial headline, optional stats + QR. Bright studio light, glossy phone rim reflections.",
      ].join(" ");
    case "phone-ground":
      return [
        "DIALECT — PHONE GROUND:",
        "Giant phone planted on dusty rocky / outdoor ground. Subject climbs or steps OUT of the screen into the terrain — dust, kicked pebbles, cinematic rim light.",
        "Phone screen shows a social profile grid. Floating 3D UI widgets (Follow, likes, NEW POST) in air. Darker moody atmosphere vs studio dialect.",
      ].join(" ");
  }
}
