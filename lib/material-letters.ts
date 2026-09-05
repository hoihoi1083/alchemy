/** Material-letters poster dialects — giant type built from real materials. */

export const MATERIAL_LETTERS_DIALECT_IDS = [
  "down",
  "denim",
  "tent-nylon",
  "leather",
] as const;

export type MaterialLettersDialectId =
  (typeof MATERIAL_LETTERS_DIALECT_IDS)[number];
export type MaterialLettersDialectPick = MaterialLettersDialectId | "auto";

export function isMaterialLettersDialectId(
  v: string,
): v is MaterialLettersDialectId {
  return (MATERIAL_LETTERS_DIALECT_IDS as readonly string[]).includes(v);
}

export function parseMaterialLettersDialectPick(
  raw: string | null | undefined,
): MaterialLettersDialectPick {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isMaterialLettersDialectId(v) ? v : "auto";
}

export function resolveMaterialLettersDialect(
  pick: MaterialLettersDialectPick,
  cue = "",
): MaterialLettersDialectId {
  if (pick !== "auto") return pick;
  const t = cue.toLowerCase();
  if (
    /\b(down|puffer|quilt|warm|羽绒|羽絨|棉服|冬季|winter|nova)\b/.test(t)
  ) {
    return "down";
  }
  if (/\b(denim|jean|raw|牛仔|破洞|break)\b/.test(t)) {
    return "denim";
  }
  if (
    /\b(tent|nylon|ripstop|ultralight|camp|outdoor|帐篷|帳篷|尼龙|尼龍|open)\b/.test(
      t,
    )
  ) {
    return "tent-nylon";
  }
  if (/\b(leather|bag|handbag|皮革|皮|革|fold|forme)\b/.test(t)) {
    return "leather";
  }
  return "leather";
}

export function materialLettersDialectClause(
  id: MaterialLettersDialectId,
): string {
  switch (id) {
    case "down":
      return [
        "MATERIAL DIALECT — DOWN / PUFFER:",
        "Giant letters are quilted puffer / down jacket fabric: shiny panels, horizontal baffles, soft volume.",
        "BEHAVIOR (critical): where a person sits or leans, fabric compresses and wrinkles realistically; untouched areas stay fluffy.",
        "Do NOT look like plastic balloon type or jelly glass. Match product color family when a photo is attached.",
      ].join(" ");
    case "denim":
      return [
        "MATERIAL DIALECT — DENIM:",
        "Giant letters are thick indigo denim with orange contrast stitching, seams, and fabric weight.",
        "BEHAVIOR: where the model breaks through / tears the letters — frayed fibers, raw hem, tension marks at pull points.",
        "Denim must tear like denim (not paper). Keep readable letterforms.",
      ].join(" ");
    case "tent-nylon":
      return [
        "MATERIAL DIALECT — TENT / RIPSTOP NYLON:",
        "Giant letters are outdoor tent nylon: ripstop grid, seams, metal eyelets, guy lines / wind ropes staking letters to ground.",
        "BEHAVIOR: ropes pull fabric taut — show tension direction and wrinkles from force, not random CGI crumple.",
        "Optional packed tent bag in foreground matching the letters.",
      ].join(" ");
    case "leather":
      return [
        "MATERIAL DIALECT — FULL-GRAIN LEATHER:",
        "Giant letters are thick pebbled leather with edge stitching and realistic thickness.",
        "BEHAVIOR: a model peels / folds a letter corner like lifting a leather flap — crease, specular, and fold thickness must read as leather (not cardboard).",
        "Include a matching leather product (bag) when relevant. Dark studio luxury lighting OK.",
      ].join(" ");
  }
}
