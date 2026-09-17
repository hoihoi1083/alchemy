/** Photo-doodle poster dialects — real photo base + 2D cartoon overlay (实景插画风). */

export const PHOTO_DOODLE_DIALECT_IDS = [
  "commute",
  "city-pop",
  "people-orbit",
  "nature-frame",
] as const;

export type PhotoDoodleDialectId = (typeof PHOTO_DOODLE_DIALECT_IDS)[number];
export type PhotoDoodleDialectPick = PhotoDoodleDialectId | "auto";

export function photoDoodleDialectPreviewSrc(id: PhotoDoodleDialectId): string {
  return `/images/studio/schemes/photo-doodle/${id}.jpg?v=1`;
}

export function isPhotoDoodleDialectId(v: string): v is PhotoDoodleDialectId {
  return (PHOTO_DOODLE_DIALECT_IDS as readonly string[]).includes(v);
}

export function parsePhotoDoodleDialectPick(
  raw: string | null | undefined,
): PhotoDoodleDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isPhotoDoodleDialectId(v) ? v : "auto";
}

/** Infer dialect from product / copy cues when pick is auto. */
export function resolvePhotoDoodleDialect(
  pick: PhotoDoodleDialectPick,
  cue = "",
): PhotoDoodleDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (
    /\b(music|concert|times.?square|neon|nightlife|cassette|microphone|音樂|音乐|夜景|時代廣場|时代广场)\b/.test(
      t,
    )
  ) {
    return "city-pop";
  }
  if (
    /\b(nature|mountain|flower|goat|park|travel|outdoor|自然|山|花|旅行|戶外|户外)\b/.test(
      t,
    )
  ) {
    return "nature-frame";
  }
  if (
    /\b(model|streetwear|fashion|portrait|people|orbit|lifestyle|模特|穿搭|人物|街拍)\b/.test(
      t,
    )
  ) {
    return "people-orbit";
  }
  if (
    /\b(commute|office|coffee|briefcase|crosswalk|rush|上班|通勤|咖啡|公文包|行人)\b/.test(
      t,
    )
  ) {
    return "commute";
  }
  return "commute";
}

export function photoDoodleSceneClause(): string {
  return [
    "PHOTO DOODLE / 实景插画风 DNA:",
    "TWO LAYERS — (1) a REAL photographic scene (street, city, stairs, skyline, people) stays photoreal — lighting, perspective, textures, and real people stay photographic.",
    "(2) 2D cartoon / rubber-hose doodle overlays with thick black outlines, flat saturated colors, pie-slice eyes — cute anthropomorphic objects (clock, coffee, cassette, radio, sneakers, flowers, animals).",
    "INTEGRATION: doodles share the 3D space — stand on the ground plane, sit on railings, peek behind buildings, grow from skyline edges. Soft contact shadows under walking doodles. Depth: some doodles behind photo props, some in front.",
    "NOT a full illustration of the whole frame. NOT flat stickers floating with zero perspective. NOT giant architectural type (that is spatial-layout). NOT force-deformed letters (that is type-force).",
    "PRODUCT mode: when IMAGE 1 is attached, keep EXACT product / person identity; doodles react TO the product (orbit, hold, walk beside) — do not redraw the product as a cartoon.",
    "CONCEPT mode: no SKU required — photo stage can be generated; headline / theme drives WHICH doodles appear (rush hour, music, travel, streetwear).",
    "Hero headline is OPTIONAL and secondary — mood is objects + characters. If headline present, keep small integrated labels only, not giant type architecture.",
    "Single 9:16 commercial key-visual still.",
  ].join(" ");
}

export function photoDoodleDialectClause(id: PhotoDoodleDialectId): string {
  switch (id) {
    case "commute":
      return [
        "DIALECT — COMMUTE STREET:",
        "Busy daytime urban crosswalk / office street photo. 3–5 doodle mascots walk WITH real pedestrians: coffee cup with legs, briefcase face, giant alarm clock peeking over a building, newspaper bird, paper airplanes, teal leaves.",
        "Warm daylight. Doodles match street perspective and cast simple ground shadows.",
      ].join(" ");
    case "city-pop":
      return [
        "DIALECT — CITY POP / SPECTACLE:",
        "Night or dusk landmark street (Times Square energy, neon, taxi). Music-themed doodles: giant cassette on a building, singing microphone on sidewalk, drumming star, birds + music notes, a hand-drawn red path weaving through traffic.",
        "Doodles scale with depth — huge in background, human-scale in foreground.",
      ].join(" ");
    case "people-orbit":
      return [
        "DIALECT — PEOPLE ORBIT:",
        "Lifestyle / streetwear photo with clear people as heroes. Doodles ORBIT the models: boombox near the head, tennis ball on railing, floating sneaker, skateboard with motion lines, stars and squiggles filling negative space.",
        "People stay photoreal identity-locked. Doodles never cover faces.",
      ].join(" ");
    case "nature-frame":
      return [
        "DIALECT — NATURE FRAME:",
        "Photo city or landscape under open sky. Illustrated nature FRAME: giant cute goat peeks over mountains, sun with sunglasses, oversized flowers/vines from roadside, backpack on a leaf, paper airplanes, yellow sparkles.",
        "Photo stays real; illustrations frame and punctuate the skyline — not a painted landscape.",
      ].join(" ");
  }
}
