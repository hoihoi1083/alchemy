/**
 * MiniMax H3 shot recipes — single-clip, recipe-owned prompts (not 九宫格).
 * Pattern matches blockbuster / motion-poster: H3 only, no Kling.
 */

import type { VideoCreativeMode } from "@/lib/creative-workflow";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";
import type { VideoDuration } from "@/lib/video-settings";
import type { VideoSubpath } from "@/lib/wizard-micro-steps.types";

export const H3_SHOT_RECIPE_MODES = [
  "ecom-orbit",
  "object-lock",
  "macro-snap",
  "luxury-tabletop",
  "beauty-mv",
  "imitate-ad",
  "neon-on-real",
  "food-bullet-time",
  "c4d-motion",
  "h3-showreel",
  "h3-sphere-mg",
  "h3-logo-mg",
  "h3-triangle-light-mg",
  "h3-glass-type-mg",
  "h3-design-studio-mg",
  "h3-movie-title",
  "h3-lifestyle",
] as const;

export type H3ShotRecipeMode = (typeof H3_SHOT_RECIPE_MODES)[number];

export function isH3ShotRecipeMode(
  mode: string | null | undefined,
): mode is H3ShotRecipeMode {
  return (H3_SHOT_RECIPE_MODES as readonly string[]).includes(mode ?? "");
}

/** Settings UI duration (VideoDuration union) — generate POST may use a nearby recipe sec. */
export const H3_SHOT_RECIPE_SETTINGS_DURATION: Record<
  H3ShotRecipeMode,
  VideoDuration
> = {
  "ecom-orbit": "6",
  "object-lock": "6",
  "macro-snap": "6",
  "luxury-tabletop": "8",
  "beauty-mv": "10",
  "imitate-ad": "8",
  "neon-on-real": "8",
  "food-bullet-time": "6",
  "c4d-motion": "8",
  "h3-showreel": "8",
  "h3-sphere-mg": "8",
  "h3-logo-mg": "8",
  "h3-triangle-light-mg": "10",
  "h3-glass-type-mg": "12",
  "h3-design-studio-mg": "12",
  "h3-movie-title": "8",
  "h3-lifestyle": "8",
};

export const H3_SHOT_RECIPE_DURATION_SEC: Record<H3ShotRecipeMode, number> = {
  "ecom-orbit": 6,
  "object-lock": 6,
  "macro-snap": 6,
  "luxury-tabletop": 8,
  "beauty-mv": 10,
  "imitate-ad": 8,
  "neon-on-real": 8,
  "food-bullet-time": 6,
  "c4d-motion": 8,
  "h3-showreel": 8,
  "h3-sphere-mg": 8,
  "h3-logo-mg": 8,
  "h3-triangle-light-mg": 10,
  "h3-glass-type-mg": 12,
  "h3-design-studio-mg": 12,
  "h3-movie-title": 8,
  "h3-lifestyle": 8,
};

export const H3_SHOT_RECIPE_NEGATIVE =
  "on-screen text, subtitles, captions, watermarks, logos invented by the model, " +
  "voiceover, dialogue, lyrics, slideshow, hard cut, jump cut, freeze-frame, " +
  "blurry product, morphing identity, extra people unless specified, UI chrome, " +
  "lab interior, talking head unless beauty-mv, generic slow push-in unless specified";

/** Bullet-time = dramatic frozen burst + orbit; forbid slideshow / static freeze / timid float. */
const FOOD_BULLET_TIME_NEGATIVE =
  "on-screen text, subtitles, captions, watermarks, logos invented by the model, " +
  "voiceover, dialogue, lyrics, slideshow still frames, hard cut, jump cut, " +
  "zero camera motion, blurry food, morphing identity, inventing ingredients not in the still, " +
  "UI chrome, lab interior, talking head, empty hands with the dish gone, " +
  "food flying completely off-frame so the dish is unreadable, " +
  "tiny timid float of one or two crumbs, intact sandwich with almost no debris";

/** Showreel allows designed kinetic type — still forbid captions/UI/watermarks. */
export const H3_SHOWREEL_NEGATIVE =
  "subtitles, captions, watermarks, UI chrome, voiceover, dialogue, lyrics, " +
  "slideshow, hard cut montage, jump cut, freeze-frame, blurry product, " +
  "morphing identity, inventing a different SKU, copy competitor brand marks, " +
  "lab interior, talking head";

/** Movie-title / multi-panel allows designed titles — still forbid captions/UI. */
export const H3_MOVIE_TITLE_NEGATIVE =
  "subtitles, captions, watermarks, UI chrome, voiceover, dialogue, lyrics, " +
  "hard cut montage into unrelated scenes, blurry product, morphing identity, " +
  "inventing a different SKU, copy competitor brand marks, talking head interview";

const MODE_TO_SUBPATH: Record<H3ShotRecipeMode, VideoSubpath> = {
  "ecom-orbit": "ecom_orbit",
  "object-lock": "object_lock",
  "macro-snap": "macro_snap",
  "luxury-tabletop": "luxury_tabletop",
  "beauty-mv": "beauty_mv",
  "imitate-ad": "imitate_ad",
  "neon-on-real": "neon_on_real",
  "food-bullet-time": "food_bullet_time",
  "c4d-motion": "c4d_motion",
  "h3-showreel": "h3_showreel",
  "h3-sphere-mg": "h3_sphere_mg",
  "h3-logo-mg": "h3_logo_mg",
  "h3-triangle-light-mg": "h3_triangle_light_mg",
  "h3-glass-type-mg": "h3_glass_type_mg",
  "h3-design-studio-mg": "h3_design_studio_mg",
  "h3-movie-title": "h3_movie_title",
  "h3-lifestyle": "h3_lifestyle",
};

const SUBPATH_TO_MODE: Partial<Record<VideoSubpath, H3ShotRecipeMode>> = {
  ecom_orbit: "ecom-orbit",
  object_lock: "object-lock",
  macro_snap: "macro-snap",
  luxury_tabletop: "luxury-tabletop",
  beauty_mv: "beauty-mv",
  imitate_ad: "imitate-ad",
  neon_on_real: "neon-on-real",
  food_bullet_time: "food-bullet-time",
  c4d_motion: "c4d-motion",
  h3_showreel: "h3-showreel",
  h3_sphere_mg: "h3-sphere-mg",
  h3_logo_mg: "h3-logo-mg",
  h3_triangle_light_mg: "h3-triangle-light-mg",
  h3_glass_type_mg: "h3-glass-type-mg",
  h3_design_studio_mg: "h3-design-studio-mg",
  h3_movie_title: "h3-movie-title",
  h3_lifestyle: "h3-lifestyle",
};

export function h3ShotRecipeToSubpath(mode: H3ShotRecipeMode): VideoSubpath {
  return MODE_TO_SUBPATH[mode];
}

export function subpathToH3ShotRecipe(
  subpath: VideoSubpath | null | undefined,
): H3ShotRecipeMode | null {
  if (!subpath) return null;
  return SUBPATH_TO_MODE[subpath] ?? null;
}

export function videoModeToH3ShotRecipe(
  mode: VideoCreativeMode | null | undefined,
): H3ShotRecipeMode | null {
  return isH3ShotRecipeMode(mode) ? mode : null;
}

/** True when Generate cannot start without a reference MP4 (imitate-ad / neon-on-real). */
export function h3ShotRecipeNeedsReel(mode: H3ShotRecipeMode): boolean {
  return mode === "imitate-ad" || mode === "neon-on-real";
}

/** True when the recipe can use an optional @Video1 (showreel) or requires one. */
export function h3ShotRecipeAcceptsReel(mode: H3ShotRecipeMode): boolean {
  return h3ShotRecipeNeedsReel(mode) || mode === "h3-showreel";
}

/**
 * True when Generate needs a lockable still (product / logo / Nano Banana).
 * neon-on-real is the exception — the MP4 is the scene.
 */
export function h3ShotRecipeNeedsHeroPhoto(mode: H3ShotRecipeMode): boolean {
  return mode !== "neon-on-real";
}

/**
 * Person + subject lifestyle still required — a flat logo alone is too weak
 * (food-bullet-time, h3-lifestyle).
 */
export function h3ShotRecipeNeedsLifestyleStill(
  mode: H3ShotRecipeMode,
): boolean {
  return mode === "food-bullet-time" || mode === "h3-lifestyle";
}

/** Kinetic type / designed masthead words allowed (showreel, movie-title, sphere/logo MG). */
export function h3ShotRecipeAllowsKineticType(mode: H3ShotRecipeMode): boolean {
  return (
    mode === "h3-showreel" ||
    mode === "h3-movie-title" ||
    mode === "h3-sphere-mg" ||
    mode === "h3-logo-mg" ||
    mode === "h3-triangle-light-mg" ||
    mode === "h3-glass-type-mg" ||
    mode === "h3-design-studio-mg"
  );
}

/**
 * True when H3 frames stay textless (no burned captions / no user headline on pixels).
 * Headline/subline/offer may still guide mood in planning — they are not painted on the video.
 * Kinetic-type recipes may paint designed masthead words.
 */
export function h3ShotRecipeIsTextlessFrames(mode: H3ShotRecipeMode): boolean {
  return !h3ShotRecipeAllowsKineticType(mode);
}

export const H3_SHOWREEL_ASPECTS = ["9:16", "16:9"] as const;
export type H3ShowreelAspect = (typeof H3_SHOWREEL_ASPECTS)[number];
export const DEFAULT_H3_SHOWREEL_ASPECT: H3ShowreelAspect = "16:9";

export function isH3ShowreelAspect(
  value: string | null | undefined,
): value is H3ShowreelAspect {
  return (H3_SHOWREEL_ASPECTS as readonly string[]).includes(value ?? "");
}

export function parseH3ShowreelAspect(raw: unknown): H3ShowreelAspect {
  return isH3ShowreelAspect(String(raw ?? "").trim())
    ? (String(raw).trim() as H3ShowreelAspect)
    : DEFAULT_H3_SHOWREEL_ASPECT;
}

/** Still aspect for Nano Banana — square lock plate for logo/mascot MG (H3 ref-safe). */
export function resolveH3ShotStillAspectRatio(
  mode: H3ShotRecipeMode,
  showreelAspect?: H3ShowreelAspect | string | null,
): H3ShowreelAspect | "1:1" | "9:16" {
  if (mode === "h3-showreel") return parseH3ShowreelAspect(showreelAspect);
  if (
    mode === "h3-logo-mg" ||
    mode === "h3-sphere-mg" ||
    mode === "h3-triangle-light-mg" ||
    mode === "h3-glass-type-mg" ||
    mode === "h3-design-studio-mg"
  )
    return "1:1";
  return "9:16";
}

/** Showreel style cards own the camera language; @Video1 is optional. */
export const H3_SHOWREEL_SCHEME_IDS = [
  "car-cinematic",
  "keyboard-tech",
  "abstract-morph",
] as const;
export type H3ShowreelSchemeId = (typeof H3_SHOWREEL_SCHEME_IDS)[number];
export type H3ShowreelSchemePick = H3ShowreelSchemeId | "auto";

export function h3ShowreelSchemePreviewSrc(id: H3ShowreelSchemeId): string {
  return `/images/studio/schemes/showreel/${id}.png?v=1`;
}

export function isH3ShowreelSchemeId(
  value: string | null | undefined,
): value is H3ShowreelSchemeId {
  return (H3_SHOWREEL_SCHEME_IDS as readonly string[]).includes(value ?? "");
}

export function parseH3ShowreelSchemePick(
  raw: unknown,
): H3ShowreelSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isH3ShowreelSchemeId(s) ? s : "auto";
}

export function resolveH3ShowreelScheme(input: {
  pick: H3ShowreelSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): H3ShowreelSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /car|auto|suv|vehicle|sedan|truck|ev\b|汽车|車|轿车|跑车|摩托/.test(text)
  ) {
    return "car-cinematic";
  }
  if (
    /keyboard|keycap|mech\b|mechanical keyboard|键盘|鍵盤|鍵帽|键帽/.test(text)
  ) {
    return "keyboard-tech";
  }
  // Concept logos / mascots and unknown SKUs → abstract morph (most general).
  if (input.conceptMode) return "abstract-morph";
  return "abstract-morph";
}

const H3_SHOWREEL_SCHEME_STILL: Record<H3ShowreelSchemeId, string> = {
  "car-cinematic":
    "a premium car 3/4 hero on wet asphalt at night, cinematic rim light, reflections",
  "keyboard-tech":
    "a mechanical keyboard hero, sharp keycaps, subtle RGB glow, dark tech desk",
  "abstract-morph":
    "a premium product or brand mark on a dark void, metallic / glass highlights ready for abstract morph",
};

function showreelSchemeBeats(
  scheme: H3ShowreelSchemeId,
  img: string,
  subject: string,
  hasReferenceVideo: boolean,
): string[] {
  const lock = `严格锁定${img}（${subject}）外形、材质、Logo 与配色；禁止换成参考片里的原产品。`;
  const reel = hasReferenceVideo
    ? `运镜、节奏、景别、转场感跟随 @Video1（参考秀场片），把镜头语言迁移到本主体上。`
    : `无参考视频时：按本方案卡的秀场节奏一镜推进。`;
  const type =
    `允许设计感动能大字 / kinetic type / 几何色块蒙版，字必须服务本品牌情绪，禁止发明竞品名、禁止字幕条/UI。`;

  if (scheme === "car-cinematic") {
    return [
      `H3 秀场方案「Car cinematic」：汽车／载具电影感一镜。${lock}`,
      reel,
      type,
      `0–1.5s：夜色或暗部剪影开场，车身轮廓可读；可有速度感光轨预告。`,
      `1.5–5s：低机位掠过、反射路面、车灯扫光、轻微动能拖影；身份始终是用户上传的这辆车／主体，不是参考片原车。`,
      `5–8s：收在干净英雄位（可 3/4），可留一句大字 masthead；无硬切蒙太奇。`,
      `适合车、EV、摩托等清晰载具轮廓；其他产品也可借用电影掠光语言，但主体必须匹配上传图。`,
      `Negative: ${H3_SHOWREEL_NEGATIVE}, wrong car model, invent competitor badge, busy daytime traffic montage`,
    ];
  }

  if (scheme === "keyboard-tech") {
    return [
      `H3 秀场方案「Keyboard tech」：键帽／数码外设科技秀一镜。${lock}`,
      reel,
      type,
      `0–1.5s：暗场微距或键帽剪影开场，RGB／金属高光可读。`,
      `1.5–5s：键帽阵列掠过、开关微距、光轨网格、轻体素或 HUD 几何；主体身份始终可辨。`,
      `5–8s：收在整机／整块键盘英雄位，可留动能大字；无硬切。`,
      `适合键盘、键帽、鼠标、数码桌面设备；其他科技产品也可借用微距材质语言。`,
      `Negative: ${H3_SHOWREEL_NEGATIVE}, invent wrong layout, fake brand keycaps, gaming UI chrome overlay`,
    ];
  }

  // abstract-morph
  return [
    `H3 秀场方案「Abstract morph」：抽象材质／形态过渡揭幕一镜。${lock}`,
    reel,
    type,
    `0–1.5s：抽象液态金属、体素、光雾或几何块开场，尚未完全露出主体。`,
    `1.5–5s：抽象形态连续 morph／凝聚成${img}外形；材质掠过时身份逐渐可读，禁止换成另一件商品。`,
    `5–8s：收在干净英雄位，可留一句大字 masthead；一镜到底。`,
    `最适合任意清晰 SKU、瓶装、球鞋、手机、Logo／吉祥物 — 通用秀场底盘。`,
    `Negative: ${H3_SHOWREEL_NEGATIVE}, morph into a different SKU, lose silhouette forever, hard cut montage`,
  ];
}

/** Sphere motion-graphics style cards — sphere is the reusable MG hero; product/logo locks identity. */
export const H3_SPHERE_MG_SCHEME_IDS = [
  "crystal-glass",
  "chrome-spin",
  "liquid-mercury",
  "neon-core",
  "matte-planet",
] as const;
export type H3SphereMgSchemeId = (typeof H3_SPHERE_MG_SCHEME_IDS)[number];
export type H3SphereMgSchemePick = H3SphereMgSchemeId | "auto";

export function h3SphereMgSchemePreviewSrc(id: H3SphereMgSchemeId): string {
  return `/images/studio/schemes/sphere-mg/${id}.png?v=1`;
}

export function isH3SphereMgSchemeId(
  value: string | null | undefined,
): value is H3SphereMgSchemeId {
  return (H3_SPHERE_MG_SCHEME_IDS as readonly string[]).includes(value ?? "");
}

export function parseH3SphereMgSchemePick(
  raw: unknown,
): H3SphereMgSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isH3SphereMgSchemeId(s) ? s : "auto";
}

export function resolveH3SphereMgScheme(input: {
  pick: H3SphereMgSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): H3SphereMgSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /car|suv|vehicle|truck|sedan|coupe|汽车|汽車|車|轿车|跑车|休旅/.test(
      text,
    )
  ) {
    return "crystal-glass";
  }
  if (
    /glass|crystal|perfume|serum|skincare|cosmetic|香水|精华|护肤|玻璃|水晶/.test(
      text,
    )
  ) {
    return "crystal-glass";
  }
  if (
    /liquid|mercury|oil|juice|gel|蜜|液|油|水光|流体/.test(text)
  ) {
    return "liquid-mercury";
  }
  if (
    /neon|rgb|gaming|esport|energy|电竞|霓虹|能量|光核/.test(text)
  ) {
    return "neon-core";
  }
  if (
    /chrome|metal|steel|watch|phone|earbud|tech|金属|铬|手表|手机|耳机/.test(
      text,
    )
  ) {
    return "chrome-spin";
  }
  // Logos / soft brand marks → matte planet (friendliest wrap).
  if (input.conceptMode) return "matte-planet";
  return "matte-planet";
}

const H3_SPHERE_MG_SCHEME_STILL: Record<H3SphereMgSchemeId, string> = {
  "crystal-glass":
    "ONE large crystal glass orb in a dark C4D studio with caustic floor light — photoreal miniature of the uploaded product INSIDE the orb, already readable, ready to emerge",
  "chrome-spin":
    "ONE large chrome orb in a dark studio with spin light-streaks — the uploaded product's front face readable on/in the chrome, ready to step out as the hero",
  "liquid-mercury":
    "ONE liquid-mercury orb in a dark studio pool — the uploaded product coalescing in the fluid, silhouette already recognizable",
  "neon-core":
    "ONE dark energy orb with neon plasma core — the uploaded product silhouette readable in the core, ready to come forward",
  "matte-planet":
    "ONE large matte C4D orb on a black void as a STAGE — the uploaded product's front face large on the facing side, about to step off the sphere as the hero (not a blank moon)",
};

const SPHERE_MG_NEGATIVE =
  `${H3_SHOT_RECIPE_NEGATIVE}, invent competitor logos, hard cut montage, ` +
  "busy lifestyle street, talking head, planet Earth, NASA space documentary, continents and clouds on a globe, " +
  "extra moons, asteroid field, starfield with multiple planets, " +
  "reshape the SKU into a spherical phone/bottle/watch/car, blank grey moon with no product, " +
  "bump-map etchings only, unreadable smeared texture, outdoor landscape, stay as only-a-sphere forever";

function sphereMgSchemeBeats(
  scheme: H3SphereMgSchemeId,
  img: string,
  subject: string,
): string[] {
  const lock =
    `这是 C4D / 运动图形广告（像 MiniMax H3 秀场 MG）：先用风格卡的球体世界开场，再把${img}（${subject}）作为真正英雄揭出来。` +
    `0–2.5s 可以是抽象球、几何隧道、动能大字；之后镜头必须把上传产品带出来（车头灯+格栅／瓶身／手机／Logo 立刻能认）。` +
    `禁止整段只剩一颗空白灰球；禁止地球、大陆云层、卫星。允许设计感动能大字，禁止字幕条/UI、禁止发明竞品名。`;
  const sharedClose =
    `5.5–8s：产品占画面英雄位（外形与${img}一致），球体可退成地面反射／光环／背景图形；可留一句动能大字；一镜到底。`;
  const neg = `Negative: ${SPHERE_MG_NEGATIVE}`;

  if (scheme === "crystal-glass") {
    return [
      `H3 球体运动图形「Crystal glass」：水晶球世界 → 产品揭幕。${lock}`,
      `0–2s：暗工作室，单颗玻璃球居中，焦散光网；球内已是${img}的写实微缩模型。`,
      `2–5.5s：镜头推入／绕球，玻璃打开或相机钻进球体，${img} 从球内走到镜头前，车灯/外形变大变清晰。无地球。`,
      sharedClose,
      `适合香水、护肤、玻璃包装、汽车、透明科技感产品。`,
      neg,
    ];
  }
  if (scheme === "chrome-spin") {
    return [
      `H3 球体运动图形「Chrome spin」：铬球 MG → 产品揭幕。${lock}`,
      `0–2s：纯黑工作室铬球高速自转，灯带高光拖影；球面已能认出${img}正面。`,
      `2–5.5s：铬面裂开／展开／相机越过铬球，${img} 作为三维英雄走出铬世界，身份锁定上传图。`,
      sharedClose,
      `适合金属手机、手表、耳机、硬科技 SKU。`,
      neg,
    ];
  }
  if (scheme === "liquid-mercury") {
    return [
      `H3 球体运动图形「Liquid mercury」：汞液凝聚 → 产品揭幕。${lock}`,
      `0–2s：暗工作室汞液晃动，尚未成完整球；液面已有${img}轮廓。`,
      `2–5.5s：流体凝聚成球后立刻把${img}从液体里托出成完整三维产品，禁止只剩配色。`,
      sharedClose,
      `适合液态感包装、护肤水光、运动补给。`,
      neg,
    ];
  }
  if (scheme === "neon-core") {
    return [
      `H3 球体运动图形「Neon core」：霓虹内核 → 产品揭幕。${lock}`,
      `0–2s：暗球＋青／洋红光核脉冲；核内已有${img}剪影。`,
      `2–5.5s：光核打开，${img} 从能量里走出成为可读产品英雄。不是行星。`,
      sharedClose,
      `适合电竞、数码、能量饮料、霓虹品牌。`,
      neg,
    ];
  }
  return [
    `H3 球体运动图形「Matte planet」：哑光 C4D 圆球当舞台 → 产品揭幕（不是地球）。${lock}`,
    `0–2s：黑场一颗哑光圆球，${img}正面已印在朝向镜头的半球（不是月球坑）。`,
    `2–5.5s：球体当舞台：${img} 从球面走向镜头，成为真正的三维产品；球可留在背景。禁止整段只剩灰球。`,
    sharedClose,
    `通用：任意清晰 SKU、汽车、瓶装、球鞋、手机，以及概念 Logo。`,
    neg,
  ];
}

/**
 * 3D logo 演绎 — bright glass/chrome brand MG (not dark sphere void).
 * Style cards mirror RedNote Minimax H3 logo-interpretation demos.
 */
export const H3_LOGO_MG_SCHEME_IDS = [
  "glass-ui",
  "chrome-type",
  "ribbon-peel",
  "pin-field",
] as const;
export type H3LogoMgSchemeId = (typeof H3_LOGO_MG_SCHEME_IDS)[number];
export type H3LogoMgSchemePick = H3LogoMgSchemeId | "auto";

export function h3LogoMgSchemePreviewSrc(id: H3LogoMgSchemeId): string {
  return `/images/studio/schemes/logo-mg/${id}.png?v=1`;
}

export function isH3LogoMgSchemeId(
  value: string | null | undefined,
): value is H3LogoMgSchemeId {
  return (H3_LOGO_MG_SCHEME_IDS as readonly string[]).includes(value ?? "");
}

export function parseH3LogoMgSchemePick(raw: unknown): H3LogoMgSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isH3LogoMgSchemeId(s) ? s : "auto";
}

export function resolveH3LogoMgScheme(input: {
  pick: H3LogoMgSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): H3LogoMgSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /ribbon|peel|paper|card|折紙|折纸|纸带|絲帶|丝带|翻页|揭頁/.test(text)
  ) {
    return "ribbon-peel";
  }
  if (
    /pin|particle|dot|grid|badge|button|針|针|粒子|圆点|圓點|徽章|按钮/.test(
      text,
    )
  ) {
    return "pin-field";
  }
  if (
    /chrome|metal|metallic|iridescent|gloss|luxury|watch|铬|金屬|金属|镜面|鏡面|炫彩|字标|字標/.test(
      text,
    )
  ) {
    return "chrome-type";
  }
  if (
    /glass|ui|saas|app|tech|dashboard|frost|玻璃|毛玻璃|界面|仪表|儀表|科技/.test(
      text,
    )
  ) {
    return "glass-ui";
  }
  // Default: bright glass UI logo card — closest to the reference demo.
  return "glass-ui";
}

const H3_LOGO_MG_SCHEME_STILL: Record<H3LogoMgSchemeId, string> = {
  "glass-ui":
    "Bright glassmorphic C4D stage: floating frosted UI panels and iridescent spheres around a centered white card that already shows the uploaded logo/wordmark crisply readable",
  "chrome-type":
    "Clean soft-gradient studio: thick chrome / iridescent 3D extruded letters or mark matching the uploaded logo, pearlescent highlights, ready for logo hero animation",
  "ribbon-peel":
    "Vibrant blue-orange gradient void: a curling white paper/ribbon surface already carrying the uploaded logo or brand icons, mid-peel pose ready to animate",
  "pin-field":
    "Bright off-white stage: dense wave of glossy colored pin/button dots forming or framing the uploaded logo silhouette, soft shadows, premium MG still",
};

/** Logo MG allows the uploaded mark as designed type — still forbid captions/UI. */
export const H3_LOGO_MG_NEGATIVE =
  "subtitles, captions, watermarks, UI chrome overlays, voiceover, dialogue, lyrics, " +
  "slideshow, hard cut montage, jump cut, freeze-frame, blurry logo, morphing identity, " +
  "inventing a different brand mark, copy competitor logos, talking head, dark black void Nike intro, " +
  "planet Earth, busy lifestyle street";

const LOGO_MG_PROMPT_NEGATIVE =
  `${H3_LOGO_MG_NEGATIVE}, invent competitor logos, hard cut montage, ` +
  "dark black-void Nike intro only, blank grey sphere forever, NASA Earth, talking head interview";

function logoMgSchemeBeats(
  scheme: H3LogoMgSchemeId,
  img: string,
  subject: string,
): string[] {
  const lock =
    `这是 Minimax H3 风格「3D Logo 演绎」品牌运动图形：严格锁定${img}（${subject}）的 Logo／字标／吉祥物外形、配色与可读性。` +
    `明亮高级 C4D／玻璃／金属质感，不是黑场球鞋片头，不是电商环绕。` +
    `上传标识必须始终可辨认；允许把标识做成三维字／浮雕卡／材质变形，禁止换成另一品牌名。` +
    `允许设计感动能大字（仅服务本标识），禁止字幕条／仿社交 UI 覆盖层。`;
  const sharedClose =
    `5.5–8s：收在干净英雄位，${img} 标识清晰居中可读；可留轻动能光扫；一镜到底连续运动。`;
  const neg = `Negative: ${LOGO_MG_PROMPT_NEGATIVE}`;

  if (scheme === "chrome-type") {
    return [
      `H3 三维 Logo 演绎「Chrome type」：镜面／炫彩立体字标英雄。${lock}`,
      `0–2s：柔和浅色渐变背景，粗体立体金属／虹彩字母或标识缓慢旋转呼吸，高光扫过。`,
      `2–5.5s：镜头轻推或弧形掠过立体字标，材质从哑光到高光铬面／珍珠渐变；外形必须与${img}一致。`,
      sharedClose,
      `适合字标、几何 Logo、奢侈／科技品牌。`,
      neg,
    ];
  }
  if (scheme === "ribbon-peel") {
    return [
      `H3 三维 Logo 演绎「Ribbon peel」：白色丝带／纸面卷曲揭幕。${lock}`,
      `0–2s：蓝橙渐变虚空，白色丝带／纸面已印有${img}标识或品牌图形，开始卷曲。`,
      `2–5.5s：丝带连续翻卷／揭开，标识随曲面运动仍可读，最终展平或停在英雄角度。`,
      sharedClose,
      `适合扁平 Logo、图标系统、活动视觉。`,
      neg,
    ];
  }
  if (scheme === "pin-field") {
    return [
      `H3 三维 Logo 演绎「Pin field」：亮色立体钉／圆点粒子场。${lock}`,
      `0–2s：浅色台面，密集彩色光泽钉／按钮波纹起伏；整体轮廓暗示${img}。`,
      `2–5.5s：粒子场波浪运动，逐渐聚成或托出可读的${img}标识英雄形。`,
      sharedClose,
      `适合抽象 Logo、点阵品牌、年轻科技感。`,
      neg,
    ];
  }
  return [
    `H3 三维 Logo 演绎「Glass UI」：毛玻璃界面世界 → 标识卡英雄。${lock}`,
    `0–2s：明亮玻璃拟态工作室，半透明面板、虹彩球体；中央白色圆角卡已清晰印有${img}标识。`,
    `2–5.5s：镜头缓推／轻环绕浮岛 UI，玻璃折射与景深变化；标识卡始终是主角，禁止换成别的品牌名。`,
    sharedClose,
    `通用默认：任意清晰 Logo／字标／吉祥物，以及产品包装上的品牌标。`,
    neg,
  ];
}

/**
 * Triangle light MG / 三角光品牌片头 — frosted triangles + orange caustics + kinetic type.
 * Inspired by LIGHTME “三角光 / 流动的三角符号” demos. Concept-first brand bumper.
 * Schemes: Exhibit (gallery title cards) vs Flow (flowing symbols → product film).
 */
export const H3_TRIANGLE_LIGHT_MG_SCHEME_IDS = ["exhibit", "flow"] as const;
export type H3TriangleLightMgSchemeId =
  (typeof H3_TRIANGLE_LIGHT_MG_SCHEME_IDS)[number];
export type H3TriangleLightMgSchemePick = H3TriangleLightMgSchemeId | "auto";

/** Duration pills for this recipe (no auto). */
export const H3_TRIANGLE_LIGHT_MG_DURATION_OPTIONS = ["10", "12"] as const;

export function clampTriangleLightMgDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 10;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 10;
  return Math.round(n) >= 12 ? 12 : 10;
}

export function triangleLightMgDurationOptions(): VideoDuration[] {
  return [...H3_TRIANGLE_LIGHT_MG_DURATION_OPTIONS];
}

export function h3TriangleLightMgSchemePreviewSrc(
  id: H3TriangleLightMgSchemeId,
): string {
  return `/images/studio/schemes/triangle-light-mg/${id}.png?v=1`;
}

export function isH3TriangleLightMgSchemeId(
  value: string | null | undefined,
): value is H3TriangleLightMgSchemeId {
  return (H3_TRIANGLE_LIGHT_MG_SCHEME_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseH3TriangleLightMgSchemePick(
  raw: unknown,
): H3TriangleLightMgSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isH3TriangleLightMgSchemeId(s) ? s : "auto";
}

export function resolveH3TriangleLightMgScheme(input: {
  pick: H3TriangleLightMgSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): H3TriangleLightMgSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /flow|fluid|liquid|mapping|spiral|流动|流動|丝带|絲帶|螺旋|映射/.test(text)
  ) {
    return "flow";
  }
  if (
    /exhibit|gallery|art|tvc|museum|展|艺术|藝術|展览|展覽|三角光/.test(text)
  ) {
    return "exhibit";
  }
  // Default: exhibit — closest to the “phone becomes art gallery” demo.
  return "exhibit";
}

const H3_TRIANGLE_LIGHT_MG_SCHEME_STILL: Record<
  H3TriangleLightMgSchemeId,
  string
> = {
  exhibit:
    "Dark void C4D stage: frosted translucent triangular glass prisms catching warm orange-gold caustic light; a crisp brand mark / logo card already readable at center, ready for kinetic title animation",
  flow:
    "Dark void with soft amber gradient: layered frosted rounded triangles drifting in warm light rays; uploaded logo silhouette faintly formed by the glass shapes, premium abstract MG still",
};

/** Triangle light allows designed kinetic titles — still forbid captions/UI. */
export const H3_TRIANGLE_LIGHT_MG_NEGATIVE =
  "subtitles, captions, watermarks, UI chrome overlays, voiceover, dialogue, lyrics, " +
  "slideshow, hard cut montage, jump cut, freeze-frame, blurry logo, morphing identity, " +
  "inventing a different brand mark, copy competitor logos, talking head, lifestyle street, " +
  "product packshot orbit, SKU walk, grocery shelf, daylight beach";

const TRIANGLE_LIGHT_MG_PROMPT_NEGATIVE =
  `${H3_TRIANGLE_LIGHT_MG_NEGATIVE}, invent competitor logos, hard cut montage, ` +
  "packshot turntable, person walking with product, CAD explode teardown";

function triangleLightMgSchemeBeats(
  scheme: H3TriangleLightMgSchemeId,
  img: string,
  subject: string,
  durationSec: number,
): string[] {
  const sec = clampTriangleLightMgDurationSec(durationSec);
  const t1 = sec <= 10 ? "2.5" : "3";
  const t2 = sec <= 10 ? "5.5" : "6.5";
  const t3 = sec <= 10 ? "8" : "9.5";
  const tEnd = String(sec);
  const lock =
    `这是 Minimax H3「三角光品牌片头」：严格锁定${img}（${subject}）的 Logo／字标／吉祥物外形、配色与可读性。` +
    `黑场／暗场 + 毛玻璃三角棱镜 + 橙金焦散光线；允许设计感动能大字（仅服务本品牌），禁止字幕条／仿社交 UI。` +
    `不是电商环绕、不是生活场景走秀、不是产品拆解。` +
    `Exact runtime ${sec}s — fit all beats; do not invent extra acts.`;
  const sharedClose =
    `${t3}–${tEnd}s：收束到品牌锁 — ${img} 标识清晰居中，可叠中文品牌名与英文副标（仅当用户已提供）；橙金光扫；一镜到底。`;
  const neg = `Negative: ${TRIANGLE_LIGHT_MG_PROMPT_NEGATIVE}`;

  if (scheme === "flow") {
    return [
      `H3 三角光「Flow」：流动三角符号 → 动能标题 → 品牌锁。${lock}`,
      `0–${t1}s：暗场暖色，多层毛玻璃圆角三角缓慢漂浮／折射橙金光线。`,
      `${t1}–${t2}s：动能标题卡（可用 MAPPING / PRODUCT FILM 类设计大字，或用户品牌英文）+ 光迹环绕；三角网格／螺旋金属通道掠过。`,
      `${t2}–${t3}s：光柱／网格开口，${img} 标识作为英雄浮出，材质为三角切面晶体／金属。`,
      sharedClose,
      `适合科技／创意工作室／抽象字标品牌。`,
      neg,
    ];
  }
  return [
    `H3 三角光「Exhibit」：三角光艺术展 → 动能标题 → 品牌锁。${lock}`,
    `0–${t1}s：黑场中心一团三角光晶体／玻璃棱镜发光，像手机秒变艺术展。`,
    `${t1}–${t2}s：动能标题框（可用 3D / TVC 类设计大字，或用户品牌英文）浮于三角玻璃场；金属三角网格掠过；镜头轻推。`,
    `${t2}–${t3}s：晶体重组为可读的${img} 标识／几何徽章，橙金高光扫过切面。`,
    sharedClose,
    `通用默认：任意清晰 Logo／字标／吉祥物品牌片头。`,
    neg,
  ];
}

/**
 * Glass type MG / 透明3D立体字 — bright studio translucent extruded letters
 * with mini diorama fills + optional cursor click. MiniMax Design H3 tutorial.
 * Schemes: Click reveal (deboss → ripple) vs Type parade (isometric wordmark).
 */
export const H3_GLASS_TYPE_MG_SCHEME_IDS = ["click-reveal", "type-parade"] as const;
export type H3GlassTypeMgSchemeId =
  (typeof H3_GLASS_TYPE_MG_SCHEME_IDS)[number];
export type H3GlassTypeMgSchemePick = H3GlassTypeMgSchemeId | "auto";

export const H3_GLASS_TYPE_MG_DURATION_OPTIONS = ["10", "12"] as const;

export function clampGlassTypeMgDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 12;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 12;
  return Math.round(n) <= 10 ? 10 : 12;
}

export function glassTypeMgDurationOptions(): VideoDuration[] {
  return [...H3_GLASS_TYPE_MG_DURATION_OPTIONS];
}

export function h3GlassTypeMgSchemePreviewSrc(id: H3GlassTypeMgSchemeId): string {
  return `/images/studio/schemes/glass-type-mg/${id}.png?v=1`;
}

export function isH3GlassTypeMgSchemeId(
  value: string | null | undefined,
): value is H3GlassTypeMgSchemeId {
  return (H3_GLASS_TYPE_MG_SCHEME_IDS as readonly string[]).includes(value ?? "");
}

export function parseH3GlassTypeMgSchemePick(
  raw: unknown,
): H3GlassTypeMgSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isH3GlassTypeMgSchemeId(s) ? s : "auto";
}

export function resolveH3GlassTypeMgScheme(input: {
  pick: H3GlassTypeMgSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): H3GlassTypeMgSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /parade|isometric|wordmark|google|design|字标游行|立体字|字阵|字列/.test(
      text,
    )
  ) {
    return "type-parade";
  }
  if (/click|cursor|deboss|ripple|点击|光标|压印|涟漪|透明3d/.test(text)) {
    return "click-reveal";
  }
  // Default: click-reveal — matches the tutorial opening gag.
  return "click-reveal";
}

const H3_GLASS_TYPE_MG_SCHEME_STILL: Record<H3GlassTypeMgSchemeId, string> = {
  "click-reveal":
    "Bright off-white matte studio: soft debossed brand initials on a sand-textured plane, translucent blue 3D cursor mid-click with concentric ripples, ready for transparent glass type to rise",
  "type-parade":
    "Bright light-gray studio: thick translucent rainbow glass 3D letters spelling the brand wordmark in isometric line, each letter filled with tiny colorful diorama objects, soft shadows, commercial MG still",
};

export const H3_GLASS_TYPE_MG_NEGATIVE =
  "subtitles, captions, watermarks, UI chrome overlays, voiceover, dialogue, lyrics, " +
  "slideshow, hard cut montage, jump cut, freeze-frame, blurry logo, morphing identity, " +
  "inventing a different brand mark, copy competitor logos, talking head, dark black void, " +
  "triangle caustic dark stage, lifestyle street, packshot orbit, SKU walk";

const GLASS_TYPE_MG_PROMPT_NEGATIVE =
  `${H3_GLASS_TYPE_MG_NEGATIVE}, invent competitor logos, hard cut montage, ` +
  "dark Nike intro void, frosted triangle prism dark gallery only";

function glassTypeMgSchemeBeats(
  scheme: H3GlassTypeMgSchemeId,
  img: string,
  subject: string,
  durationSec: number,
): string[] {
  const sec = clampGlassTypeMgDurationSec(durationSec);
  const t1 = sec <= 10 ? "2.5" : "3";
  const t2 = sec <= 10 ? "5.5" : "7";
  const t3 = sec <= 10 ? "8" : "10";
  const tEnd = String(sec);
  const lock =
    `这是 Minimax H3「透明3D立体字」商业动效：严格锁定${img}（${subject}）的 Logo／字标外形与可读性。` +
    `明亮浅灰／米白工作室（不是黑场三角光）；厚实半透明玻璃／树脂立体字，字内可有微型场景／物件（设计工具、UI 面板、色板等），禁止发明竞品名。` +
    `允许设计感动能大字与 3D 光标，禁止字幕条／仿社交 UI。` +
    `Exact runtime ${sec}s — fit all beats; do not invent extra acts.`;
  const sharedClose =
    `${t3}–${tEnd}s：收在干净英雄字标位 — 透明立体字完整可读，轻阴影，可叠小字副标（仅用户已提供的品牌英文／中文）；一镜到底。`;
  const neg = `Negative: ${GLASS_TYPE_MG_PROMPT_NEGATIVE}`;

  if (scheme === "type-parade") {
    return [
      `H3 透明3D立体字「Type parade」：等距彩色玻璃字列游行。${lock}`,
      `0–${t1}s：明亮浅灰台面，厚实半透明立体字母斜向排列（用用户品牌英文／字标拆成可读字母），每字内嵌微型彩色物件。`,
      `${t1}–${t2}s：镜头沿字列轻推／侧滑，折射与软阴影变化；字母可轻微呼吸／旋转，外形必须服务${img}身份。`,
      `${t2}–${t3}s：字列收束为完整品牌字标英雄构图，标识清晰。`,
      sharedClose,
      `适合英文品牌名、工作室字标、作品集片头。`,
      neg,
    ];
  }
  return [
    `H3 透明3D立体字「Click reveal」：压印平面 → 光标点击涟漪 → 透明立体字升起。${lock}`,
    `0–${t1}s：米白磨砂平面，${img} 标识以轻压印／凹印轮廓出现；半透明蓝色 3D 光标移向点击点。`,
    `${t1}–${t2}s：光标点击，同心涟漪扩散；压印处升起厚实半透明彩色立体字／字标（字内可有微型设计物件）。`,
    `${t2}–${t3}s：立体字排成可读品牌字标（如用户英文名），光标可掠过；玻璃折射清晰。`,
    sharedClose,
    `通用默认：任意清晰 Logo／字标品牌商业动效。`,
    neg,
  ];
}

/**
 * Design studio MG / 设计台玻璃品牌片 — FORM|COLOR|MOTION desk showreel:
 * drafting mat, form study (pillow→sphere→letter), glass wordmark + UI panels → moodboard lock.
 * Schemes: Form study vs Brand desk. Distinct from transparent-type (105857) and logo-mg cards.
 */
export const H3_DESIGN_STUDIO_MG_SCHEME_IDS = ["form-study", "brand-desk"] as const;
export type H3DesignStudioMgSchemeId =
  (typeof H3_DESIGN_STUDIO_MG_SCHEME_IDS)[number];
export type H3DesignStudioMgSchemePick = H3DesignStudioMgSchemeId | "auto";

export const H3_DESIGN_STUDIO_MG_DURATION_OPTIONS = ["10", "12"] as const;

export function clampDesignStudioMgDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 12;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 12;
  return Math.round(n) <= 10 ? 10 : 12;
}

export function designStudioMgDurationOptions(): VideoDuration[] {
  return [...H3_DESIGN_STUDIO_MG_DURATION_OPTIONS];
}

export function h3DesignStudioMgSchemePreviewSrc(
  id: H3DesignStudioMgSchemeId,
): string {
  return `/images/studio/schemes/design-studio-mg/${id}.png?v=1`;
}

export function isH3DesignStudioMgSchemeId(
  value: string | null | undefined,
): value is H3DesignStudioMgSchemeId {
  return (H3_DESIGN_STUDIO_MG_SCHEME_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseH3DesignStudioMgSchemePick(
  raw: unknown,
): H3DesignStudioMgSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isH3DesignStudioMgSchemeId(s) ? s : "auto";
}

export function resolveH3DesignStudioMgScheme(input: {
  pick: H3DesignStudioMgSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): H3DesignStudioMgSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (
    /desk|moodboard|portfolio|showreel|studio|grid|ui panel|设计台|作品集|情绪板|品牌台/.test(
      text,
    )
  ) {
    return "brand-desk";
  }
  if (
    /form|sphere|geode|pillow|morph|cursor|form study|造型|球体|形态/.test(text)
  ) {
    return "form-study";
  }
  // Default: form-study — matches the tutorial opening gag.
  return "form-study";
}

const H3_DESIGN_STUDIO_MG_SCHEME_STILL: Record<
  H3DesignStudioMgSchemeId,
  string
> = {
  "form-study":
    "Bright drafting-table studio: soft translucent orange-to-purple glass pillow form with tiny FORM|COLOR|MOTION type, blue 3D cursor mid-click on a white technical mat with faint grid circles, ready for form-study morph",
  "brand-desk":
    "Bright modern design studio desk: thick iridescent glass 3D brand wordmark (orange→purple), frosted UI panels and a chrome sphere beside it, soft daylight, ready for brand-desk showreel",
};

export const H3_DESIGN_STUDIO_MG_NEGATIVE =
  "subtitles, captions, watermarks, UI chrome overlays, voiceover, dialogue, lyrics, " +
  "slideshow, hard cut montage, jump cut, freeze-frame, blurry logo, morphing identity, " +
  "inventing a different brand mark, copy competitor logos, talking head, dark black void, " +
  "triangle caustic dark stage, lifestyle street, packshot orbit, SKU walk, " +
  "deboss-only transparent type rise without design desk context";

const DESIGN_STUDIO_MG_PROMPT_NEGATIVE =
  `${H3_DESIGN_STUDIO_MG_NEGATIVE}, invent competitor logos, hard cut montage, ` +
  "dark Nike intro void, frosted triangle prism dark gallery only, isometric letter parade only";

function designStudioMgSchemeBeats(
  scheme: H3DesignStudioMgSchemeId,
  img: string,
  subject: string,
  durationSec: number,
): string[] {
  const sec = clampDesignStudioMgDurationSec(durationSec);
  const t1 = sec <= 10 ? "2.5" : "3";
  const t2 = sec <= 10 ? "5.5" : "7";
  const t3 = sec <= 10 ? "8" : "10";
  const tEnd = String(sec);
  const lock =
    `这是 Minimax H3「设计台玻璃品牌片」商业动效：严格锁定${img}（${subject}）的 Logo／字标外形与可读性。` +
    `明亮设计工作室／绘图台（不是黑场三角光，也不是单纯压印立体字）；半透明橙→紫玻璃材质、3D 光标、UI 面板／色板道具允许。` +
    `允许设计感动能大字（FORM/COLOR/MOTION、TYPE/VISUAL 等）与作品集情绪，禁止字幕条／仿社交 UI、禁止发明竞品名。` +
    `Exact runtime ${sec}s — fit all beats; do not invent extra acts.`;
  const sharedClose =
    `${t3}–${tEnd}s：收在干净英雄字标／作品集片头位 — 玻璃品牌字标完整可读，可叠小字副标（仅用户已提供品牌名／SHOWREEL 年号类设计字）；一镜到底。`;
  const neg = `Negative: ${DESIGN_STUDIO_MG_PROMPT_NEGATIVE}`;

  if (scheme === "brand-desk") {
    return [
      `H3 设计台玻璃「Brand desk」：玻璃字标 + UI 面板 → 情绪板网格 → 品牌锁。${lock}`,
      `0–${t1}s：明亮工作室台面，厚实半透明橙紫玻璃立体字标（${img}）立于桌上，旁有磨砂 UI 面板／色板／铬球。`,
      `${t1}–${t2}s：镜头轻推／侧滑，玻璃折射变化；可掠过 3D 光标；面板轻微浮起，身份始终服务${img}。`,
      `${t2}–${t3}s：切到／推入设计情绪板网格（多格玻璃卡 + 中央字标），光标可点选边角变换手柄。`,
      sharedClose,
      `适合工作室字标、设计品牌、作品集／showreel 片头。`,
      neg,
    ];
  }
  return [
    `H3 设计台玻璃「Form study」：软垫形 → 球体剖切 → 立体字母 → 品牌锁。${lock}`,
    `0–${t1}s：白色绘图台／切割垫（淡网格同心圆），橙紫半透明玻璃软垫形／枕头形，可出现 FORM|COLOR|MOTION 小字；蓝 3D 光标点击。`,
    `${t1}–${t2}s：形态研究 — 哑光球体纹理 → 剖开露出霓虹晶体内核 → 过渡为虹彩立体字母（服务${img}外形）。`,
    `${t2}–${t3}s：字母收束为可读玻璃品牌字标，旁可有色板／尺子虚化道具。`,
    sharedClose,
    `通用默认：任意清晰 Logo／字标的设计台片头。`,
    neg,
  ];
}


export const MACRO_SNAP_INTENSITIES = ["weak", "medium", "strong"] as const;
export type MacroSnapIntensity = (typeof MACRO_SNAP_INTENSITIES)[number];
export const DEFAULT_MACRO_SNAP_INTENSITY: MacroSnapIntensity = "strong";

export function isMacroSnapIntensity(
  value: string | null | undefined,
): value is MacroSnapIntensity {
  return (MACRO_SNAP_INTENSITIES as readonly string[]).includes(value ?? "");
}

export function parseMacroSnapIntensity(raw: unknown): MacroSnapIntensity {
  return isMacroSnapIntensity(String(raw ?? "").trim())
    ? (String(raw).trim() as MacroSnapIntensity)
    : DEFAULT_MACRO_SNAP_INTENSITY;
}

/**
 * food-bullet-time narrative arc.
 * - classic: Matrix freeze ends on the mid-air explosion
 * - hero-plate: Static → lighter explosion → clean finished plate again
 */
export const FOOD_BULLET_ARCS = ["classic", "hero-plate"] as const;
export type FoodBulletArc = (typeof FOOD_BULLET_ARCS)[number];
export const DEFAULT_FOOD_BULLET_ARC: FoodBulletArc = "classic";

export function isFoodBulletArc(
  value: string | null | undefined,
): value is FoodBulletArc {
  return (FOOD_BULLET_ARCS as readonly string[]).includes(value ?? "");
}

export function parseFoodBulletArc(raw: unknown): FoodBulletArc {
  return isFoodBulletArc(String(raw ?? "").trim())
    ? (String(raw).trim() as FoodBulletArc)
    : DEFAULT_FOOD_BULLET_ARC;
}

/** Seconds for generate POST — hero-plate needs more time for a clear third beat. */
export function foodBulletDurationSec(arc: FoodBulletArc): number {
  return arc === "hero-plate" ? 8 : 6;
}

export type H3ShotPromptInput = {
  mode: H3ShotRecipeMode;
  conceptMode: boolean;
  product: string;
  headline?: string;
  conceptIdea?: string;
  hasReferenceVideo?: boolean;
  /** macro-snap only — crack/drip strength. Default strong. */
  macroSnapIntensity?: MacroSnapIntensity;
  /** food-bullet-time only — classic freeze vs 3-beat return to plate. */
  foodBulletArc?: FoodBulletArc;
  /** h3-showreel only — 9:16 feed or 16:9 landscape showreel. */
  showreelAspect?: H3ShowreelAspect;
  /** h3-showreel only — style card. Resolved before prompt build. */
  showreelScheme?: H3ShowreelSchemeId;
  /** h3-sphere-mg only — sphere MG style card. */
  sphereMgScheme?: H3SphereMgSchemeId;
  /** h3-logo-mg only — 3D logo 演绎 style card. */
  logoMgScheme?: H3LogoMgSchemeId;
  /** h3-triangle-light-mg only — 三角光 Exhibit / Flow. */
  triangleLightMgScheme?: H3TriangleLightMgSchemeId;
  /** h3-glass-type-mg only — 透明3D立体字 Click / Parade. */
  glassTypeMgScheme?: H3GlassTypeMgSchemeId;
  /** h3-design-studio-mg only — Form study / Brand desk. */
  designStudioMgScheme?: H3DesignStudioMgSchemeId;
  /** Optional runtime override (triangle-light / glass-type 10/12). */
  durationSec?: number;
};

function foodBulletTimeBeats(
  img: string,
  subject: string,
  arc: FoodBulletArc,
): string[] {
  if (arc === "hero-plate") {
    return [
      `美食促销三拍一镜（Static → Explosion → Hero Plate）：严格锁定${img}（${subject}）人物面孔、发型服饰、食物种类与摆盘、场景；禁止换脸换菜。`,
      `明确做成 3 Beat 商业短片，不是停在半空碎屑高潮：`,
      `Beat 1 · Static Product Shot（0–1.8s）：干净完整成品静物建立 — 完整摆盘/完整食物清晰可读，人物可递向镜头但食物必须是完整未拆状态；商业打卡感、留白干净。`,
      `Beat 2 · Ingredient Explosion（1.8–4.5s）：中等强度、克制的食材爆裂 — 只飞散少量属于这道菜的元素（约 6–12 颗可读碎屑/酱珠/叶菜），径向散开；比经典子弹时间更稀疏，禁止密到看不清主体。核心仍握在手里。`,
      `Beat 3 · Final Hero Plate（4.5–8s）：必须回到非常干净的完整成品画面 — 碎屑收回/重组/落回完整摆盘，最后定格在整盘/整份清晰英雄位（像菜单主图），浅景深、无半空碎屑云遮挡；禁止停在爆炸最高点结束。`,
      `一镜到底，无切镜、无字幕。镜头可轻推或短弧，但第三拍必须是完整成品。`,
      `Negative: ${FOOD_BULLET_TIME_NEGATIVE}, end on mid-air debris only, never reassemble the plate, dense debris wall hiding the food, incomplete plated hero at the end`,
    ];
  }

  return [
    `美食子弹时间一镜（Matrix 级 3D 食物爆裂打卡）：严格锁定${img}（${subject}）的人物面孔、发型服饰、食物/饮品种类与摆盘、场景环境；禁止换脸换菜、禁止凭空添加原图没有的食材或配料。`,
    `这是商业美食广告的高速摄影高潮：食物在双手间径向爆开成可读的立体碎屑云，不是轻轻飘两三片菜叶。人物身姿基本静止，人脸尽量清晰；镜头绕着爆裂体积运动。`,
    `0–0.8s：英雄位建立 — 人物把完整食物/饮品递向镜头，商业打卡感，食物身份清晰。`,
    `0.8–1.8s：戏剧性爆裂高潮 — 该食物的层次沿径向崩开（面包/饼皮、馅料、酱汁液珠、芝士拉丝、碎屑/生菜/冰块/珍珠等属于这道菜的元素），充满双手周围的空气体积；动能强、粒子密、慢动作可读；核心仍握在手里，不要整份飞出画外。`,
    `1.8–5s：在爆裂最高点冻结成子弹时间：碎屑云保持立体悬停（不是落地、不是消失），镜头以人物为中心向右弧形环绕约 120–180°，运镜比普通环绕更有力，浅景深、背景视差，让 3D 爆裂体积转起来。`,
    `5–6s：微推近收在最戏剧的凝固瞬间 — 层次分离、酱汁珠与碎屑仍定格在空中，高清升格。`,
    `一镜到底，无切镜、无幻灯片定格、无字幕。`,
    `Negative: ${FOOD_BULLET_TIME_NEGATIVE}`,
  ];
}

function macroSnapPhysicsBeats(
  img: string,
  subject: string,
  intensity: MacroSnapIntensity,
): string[] {
  const open = `0–1.5s：先建立完整产品英雄位 — 整件/整盘轮廓清晰可读、居中留白，与${img}构图一致，禁止一开场就裁切掉产品边缘。`;
  const close =
    intensity === "strong"
      ? `4.5–6s：碎屑/液滴落定后略微拉回，收在仍能看见完整轮廓的诱人静物英雄位（裂开后的产品或半开断面仍要可读）。`
      : `4–6s：碎屑/液滴落定后略微拉回，收在仍能看见完整轮廓的诱人静物英雄位（可略近，但不要只剩无法辨认的局部纹理）。`;

  if (intensity === "weak") {
    return [
      `美食/材质微距物理一镜：严格保持${img}（${subject}）外形与材质，做轻量可食用物理（细裂纹 + 轻滴），不要夸张掰成两半。`,
      open,
      `1.5–4s：从全貌缓慢推近到局部，液体缓慢滴落/拉丝，或饼干表面出现细裂纹/轻微碎裂瞬间用慢动作；连续运动无定格；推近过程中主体身份仍可辨认。`,
      close,
      `禁止切镜、禁止变成另一盘食物、禁止字幕、禁止全程只有极端微距裁切、禁止把产品炸成碎片。`,
      `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, extreme crop with no full product silhouette, mystery texture only, explosive shatter into many pieces`,
    ];
  }

  if (intensity === "medium") {
    return [
      `美食/材质微距物理一镜：严格保持${img}（${subject}）外形与材质，做中等冲击可食用物理（清晰裂缝 + 可见滴落），比细线裂纹更强，但不要极端掰成两半狂涌。`,
      open,
      `1.5–4s：从全貌推近到受力点，饼干/食物出现清晰可读的裂缝并略微分开；熔融巧克力/酱汁从裂缝中明显流出并向下拉丝滴落；少量碎屑；慢动作强调断口与液柱；连续运动无切镜；主体仍可辨认。`,
      close,
      `禁止切镜、禁止变成另一盘食物、禁止字幕、禁止全程只有极端微距裁切、禁止只有看不见的细线裂纹、禁止过度夸张成两半狂涌。`,
      `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, extreme crop with no full product silhouette, mystery texture only, tiny hairline crack only, full two-piece explosive break`,
    ];
  }

  return [
    `美食/材质微距物理一镜：严格保持${img}（${subject}）外形与材质身份，做高冲击可食用物理（碎裂 + 滴落），不要只做轻微表面裂纹。`,
    open,
    `1.5–4.5s：从全貌推近到受力点，制造戏剧性碎裂高潮：饼干/食物沿中缝明显裂开、掰开或断裂成两块（裂缝要宽、深、可读，不是细线裂纹）；熔融巧克力/酱汁从裂缝中大量涌出并向下拉丝滴落；碎屑与细盐飞溅；慢动作强调断口与液柱，连续运动无切镜；推近时主体仍可辨认。`,
    close,
    `禁止切镜、禁止变成另一盘食物、禁止字幕、禁止全程只有极端微距裁切、禁止只有细微表面裂纹而无真正断裂/涌出。`,
    `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, extreme crop with no full product silhouette, mystery texture only, tiny hairline crack only, static intact cookie with no break`,
  ];
}

const H3_STILL_DEFAULT: Record<H3ShotRecipeMode, string> = {
  "ecom-orbit": "a glossy white ceramic tumbler with a small gold mark",
  "object-lock": "a matte-black wireless earbuds case",
  "macro-snap": "a glossy chocolate lava cake with molten center",
  "luxury-tabletop": "a gold-capped glass serum bottle",
  "beauty-mv": "a young East Asian woman with dewy makeup, looking at camera",
  "imitate-ad": "a premium skincare bottle, clean packshot",
  "neon-on-real": "a premium product or brand mark for neon overlay identity",
  "food-bullet-time":
    "a young East Asian woman smiling at camera holding a loaded wrap/sandwich toward lens at an outdoor cafe, high-speed frozen food explosion with bread layers, lettuce, tomatoes, cheese strands and sauce droplets bursting radially around her hands",
  "c4d-motion":
    "a premium athletic sneaker, red and black materials, centered on pure black void",
  "h3-showreel":
    "a premium smartphone, glass and metal, centered on a dark cinematic void",
  "h3-sphere-mg":
    "ONE large matte C4D clay orb centered on a black studio void, brand-colored albedo — not planet Earth",
  "h3-logo-mg":
    "a crisp brand logo or wordmark on a bright glassmorphic C4D stage, white card hero, ready for 3D logo MG",
  "h3-triangle-light-mg":
    "a crisp brand logo or wordmark among frosted triangular glass prisms on a dark void, warm orange caustic light, ready for triangle-light brand MG",
  "h3-glass-type-mg":
    "thick translucent rainbow glass 3D brand letters on a bright off-white studio plane with soft shadows and a blue 3D cursor, ready for transparent type MG",
  "h3-design-studio-mg":
    "iridescent orange-to-purple glass brand wordmark on a bright drafting-table design studio desk with UI panels and a blue 3D cursor, ready for design-studio MG",
  "h3-movie-title":
    "a premium product hero ready for cinematic title cards, dark editorial backdrop",
  "h3-lifestyle":
    "a young adult holding the product in a bright lifestyle cafe or street setting, face clear",
};

function namedSubject(input: {
  product: string;
  headline?: string;
  conceptIdea?: string;
}): string {
  return (
    input.product.trim() ||
    input.headline?.trim() ||
    input.conceptIdea?.trim() ||
    ""
  );
}

function subjectLabel(input: H3ShotPromptInput): string {
  return (
    namedSubject(input) ||
    (input.conceptMode ? "brand mark" : "product")
  );
}

/** Uploaded photo is the SKU. Typed name is a caption — never a second product. */
function h3PhotoIdentityWins(img: string, subject: string): string {
  return [
    `身份唯一来源是${img}的像素外形与类别。名称「${subject}」只是标签/卖点文案，禁止按名称发明另一件商品。`,
    `若名称写便攜電源/电池/电源但${img}是汽车，必须保持汽车，禁止变成移动电源。`,
    nameIsClaimImage1IsObjectLine(subject),
  ].join(" ");
}

/** Continuous one-take prompts — Chinese beats where H3 responds well. */
export function buildH3ShotRecipePrompt(input: H3ShotPromptInput): string {
  const subject = subjectLabel(input);
  const img = "@Image1";

  const beats = ((): string => {
  switch (input.mode) {
    case "ecom-orbit":
      return [
        `电商产品环绕一镜到底，主体严格锁定${img}（${subject}）外形、材质、Logo与配色，禁止变形换款。`,
        `0–1s：静物特写开场，柔光扫过表面，微距纹理清晰。`,
        `1–4s：镜头平滑环绕产品约180°，景深浅，背景虚化干净，速度匀速不卡顿。`,
        `4–6s：轻微仰拍或爆炸式慢旋停在卖点角度，高光扫过边缘，收在干净产品英雄位。`,
        `全程无切镜、无定格、无字幕。商业电商广告质感。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}`,
      ].join("\n");

    case "object-lock":
      return [
        `物体锁定运镜（SnorriCam / object-locked）：相机像粘在${img}（${subject}）上，产品相对画面几乎不动，周围环境与光线快速流动。`,
        `0–1s：产品居中占满画面，身份锁死。`,
        `1–5s：世界旋转/平移，背景拖影与光轨流动，产品边缘锐利稳定。`,
        `5–6s：环境减速，落在干净静物停顿，仍保持同一产品身份。`,
        `禁止产品飞出画框、禁止换机位硬切。一镜到底。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}`,
      ].join("\n");

    case "macro-snap":
      return macroSnapPhysicsBeats(
        img,
        subject,
        parseMacroSnapIntensity(input.macroSnapIntensity),
      ).join("\n");

    case "luxury-tabletop":
      return [
        `奢侈品桌面广告一镜：大理石/丝绒台面，${img}（${subject}）居中，材质与Logo锁死。`,
        `0–2s：低角度桌面建立，柔和体积光，产品静置。`,
        `2–6s：一只干净的手从画面边缘进入，轻触/旋转/打开产品，动作优雅克制，产品身份不变。`,
        `6–8s：手退出，镜头微推至产品英雄特写，高光扫过金属或玻璃。`,
        `一镜到底，无字幕，高端商业片质感。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, dirty nails, multiple hands, cheap plastic look`,
      ].join("\n");

    case "beauty-mv":
      return [
        `美妆/角色一镜MV感：人脸或吉祥物身份严格锁定${img}（${subject}），肤质/妆面/毛发或角色外形一致。`,
        `0–2s：柔光肖像或胸上景，眼神或表情微动，背景浅景深。`,
        `2–7s：镜头缓慢环绕或推拉，发丝/布料轻动，光影连续变化，音乐录影带节奏但无切镜。`,
        `7–10s：落在干净英雄肖像，表情自然收束。`,
        `禁止换脸、禁止多机位硬切、禁止字幕歌词。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, face morph, identity swap, hard cut montage`,
      ].join("\n");

    case "imitate-ad":
      return [
        `仿拍参考广告：产品身份严格锁定${img}（${subject}）。`,
        input.hasReferenceVideo
          ? `运镜、节奏、景别、转场感跟随 @Video1，把参考片的镜头语言迁移到本产品上。`
          : `无参考视频时：用干净电商环绕+微推完成一条专业短广告。`,
        `全程保持产品外形、Logo、配色与${img}一致，禁止换成参考片里的原产品。`,
        `一镜或极少切感的连续运动，无字幕。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, copy competitor logo, wrong product identity`,
      ].join("\n");

    case "neon-on-real":
      return [
        `霓虹叠实景一镜：以 @Video1 真实场景为基底，保留实景透视、运镜与环境光；在画面上叠加发光霓虹线稿（动物、符号或与${subject}相关的图形）并让其在场景中游走、生长、环绕。`,
        `若有${img}：霓虹图形或主体身份跟随${img}（${subject}）外形与配色，禁止换脸换款。`,
        input.hasReferenceVideo
          ? `0–1s：从 @Video1 实景建立，霓虹线开始浮现。`
          : `0–1s：干净实景建立，霓虹线开始浮现。`,
        `1–6s：霓虹图形在实景中连续移动（绕主体、穿巷、沿边缘），线迹发光清晰，实景不被完全替换成纯CG。`,
        `6–8s：霓虹收束或定格成干净构图，实景仍可辨认。`,
        `一镜到底，无切镜、无字幕。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, replace real scene with full CGI world, flat 2D sticker collage, unreadable neon scribble`,
      ].join("\n");

    case "food-bullet-time":
      return foodBulletTimeBeats(
        img,
        subject,
        parseFoodBulletArc(input.foodBulletArc),
      ).join("\n");

    case "c4d-motion":
      return [
        `顶级 C4D / 三维品牌动态视觉一镜：严格锁定${img}像素外形、材质、Logo 与配色；名称「${subject}」只用于称呼这件已上传的物体。黑场虚空、金属高光、抽象材质与动能拖影，像 Nike 级运动广告片头，但产品必须是${img}这一件，禁止按名称换成电源/电池/球鞋。`,
        `0–1.5s：纯黑背景，居中的${img}剪影或金属/玻璃质感外形缓慢呼吸发光 — 开场就必须能辨认${img}的真实类别（汽车就是车剪影，不要变成电源砖或抽象徽章）。`,
        `1.5–3.5s：镜头连续推入与${img}配色相关的抽象微距材质（织物网眼、液态涟漪、半透明胶囊体），光扫过湿润表面；抽象元素只服务${img}，不要在抽象段换成名称里的另一件商品。`,
        `3.5–6s：产品从暗部轮廓以 rim light / 液面涟漪揭幕现身，外形必须与${img}一致；可做轻动能拖影或重影，但身份不变形、不换成便攜電源。`,
        `6–8s：环绕或弧形掠过${img}，收在纯黑虚空上的干净英雄位，高光扫过边缘。`,
        `一镜到底连续运动，无硬切、无字幕、无发明品牌名。商业三维渲染质感。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, invent Nike or competitor logos, wrong sneaker SKU, power bank or battery brick that is not @Image1, generic C4D logo badge instead of @Image1 silhouette, hard cut montage, bright white studio backdrop, busy lifestyle street`,
      ].join("\n");

    case "h3-showreel":
      return showreelSchemeBeats(
        input.showreelScheme ??
          resolveH3ShowreelScheme({
            pick: "auto",
            product: input.product,
            headline: input.headline,
            conceptIdea: input.conceptIdea,
            conceptMode: input.conceptMode,
          }),
        img,
        subject,
        Boolean(input.hasReferenceVideo),
      ).join("\n");

    case "h3-sphere-mg":
      return sphereMgSchemeBeats(
        input.sphereMgScheme ??
          resolveH3SphereMgScheme({
            pick: "auto",
            product: input.product,
            headline: input.headline,
            conceptIdea: input.conceptIdea,
            conceptMode: input.conceptMode,
          }),
        img,
        subject,
      ).join("\n");

    case "h3-logo-mg":
      return logoMgSchemeBeats(
        input.logoMgScheme ??
          resolveH3LogoMgScheme({
            pick: "auto",
            product: input.product,
            headline: input.headline,
            conceptIdea: input.conceptIdea,
            conceptMode: input.conceptMode,
          }),
        img,
        subject,
      ).join("\n");

    case "h3-triangle-light-mg":
      return triangleLightMgSchemeBeats(
        input.triangleLightMgScheme ??
          resolveH3TriangleLightMgScheme({
            pick: "auto",
            product: input.product,
            headline: input.headline,
            conceptIdea: input.conceptIdea,
            conceptMode: input.conceptMode,
          }),
        img,
        subject,
        input.durationSec ?? H3_SHOT_RECIPE_DURATION_SEC["h3-triangle-light-mg"],
      ).join("\n");

    case "h3-glass-type-mg":
      return glassTypeMgSchemeBeats(
        input.glassTypeMgScheme ??
          resolveH3GlassTypeMgScheme({
            pick: "auto",
            product: input.product,
            headline: input.headline,
            conceptIdea: input.conceptIdea,
            conceptMode: input.conceptMode,
          }),
        img,
        subject,
        input.durationSec ?? H3_SHOT_RECIPE_DURATION_SEC["h3-glass-type-mg"],
      ).join("\n");

    case "h3-design-studio-mg":
      return designStudioMgSchemeBeats(
        input.designStudioMgScheme ??
          resolveH3DesignStudioMgScheme({
            pick: "auto",
            product: input.product,
            headline: input.headline,
            conceptIdea: input.conceptIdea,
            conceptMode: input.conceptMode,
          }),
        img,
        subject,
        input.durationSec ?? H3_SHOT_RECIPE_DURATION_SEC["h3-design-studio-mg"],
      ).join("\n");

    case "h3-movie-title":
      return [
        `H3 电影标题／多格一镜：严格锁定${img}（${subject}）外形、材质、Logo 与配色。`,
        `允许设计感电影标题字 / kinetic type / 分镜格边框与擦除转场；禁止字幕条、禁止发明竞品名。`,
        `0–1.5s：暗场或色块开场，可出现一行大字 masthead（服务本品牌情绪）。`,
        `1.5–5s：多格面板／分镜擦除／标题卡连续推进 — 每格仍以${img}身份为主角，可做轻缩放与光扫。`,
        `5–8s：面板收束到单一干净英雄位，产品清晰可读；可留一句收束大字。`,
        `一镜感或极少切感的面板过渡，不是硬切蒙太奇。适合任何清晰 SKU 与概念 Logo。`,
        `Negative: ${H3_MOVIE_TITLE_NEGATIVE}`,
      ].join("\n");

    case "h3-lifestyle":
      return [
        `H3 生活人物一镜：真人生活方式广告，严格锁定${img}（${subject}）产品外形与配色；人物与场景服务产品。`,
        `0–1.5s：生活场景建立（咖啡馆／街道／居家／户外），人物与产品同框，脸部可读。`,
        `1.5–6s：自然使用／展示产品 — 手持、试戴、轻转、递向镜头；镜头轻推或轻环绕，连续运动。`,
        `6–8s：收在人物＋产品英雄位，表情自然，产品清晰。`,
        `与 beauty-mv 不同：这是生活使用场景，不是美妆 MV 环绕肖像。禁止换脸、禁止换成另一件商品、禁止字幕。`,
        `Negative: ${H3_SHOT_RECIPE_NEGATIVE}, face morph, identity swap, product swap, hard cut montage, studio beauty MV only with no lifestyle context`,
      ].join("\n");
  }
  })();
  return `${h3PhotoIdentityWins(img, subject)}\n${beats}`;
}

/** Nano Banana still — H3 identity lock. Fast path when user has no upload. */
export function buildH3ShotRecipeStillPrompt(input: H3ShotPromptInput): string {
  const named = namedSubject(input);
  const showreelScheme =
    input.mode === "h3-showreel"
      ? (input.showreelScheme ??
        resolveH3ShowreelScheme({
          pick: "auto",
          product: input.product,
          headline: input.headline,
          conceptIdea: input.conceptIdea,
          conceptMode: input.conceptMode,
        }))
      : null;
  const sphereMgScheme =
    input.mode === "h3-sphere-mg"
      ? (input.sphereMgScheme ??
        resolveH3SphereMgScheme({
          pick: "auto",
          product: input.product,
          headline: input.headline,
          conceptIdea: input.conceptIdea,
          conceptMode: input.conceptMode,
        }))
      : null;
  const logoMgScheme =
    input.mode === "h3-logo-mg"
      ? (input.logoMgScheme ??
        resolveH3LogoMgScheme({
          pick: "auto",
          product: input.product,
          headline: input.headline,
          conceptIdea: input.conceptIdea,
          conceptMode: input.conceptMode,
        }))
      : null;
  const triangleLightMgScheme =
    input.mode === "h3-triangle-light-mg"
      ? (input.triangleLightMgScheme ??
        resolveH3TriangleLightMgScheme({
          pick: "auto",
          product: input.product,
          headline: input.headline,
          conceptIdea: input.conceptIdea,
          conceptMode: input.conceptMode,
        }))
      : null;
  const glassTypeMgScheme =
    input.mode === "h3-glass-type-mg"
      ? (input.glassTypeMgScheme ??
        resolveH3GlassTypeMgScheme({
          pick: "auto",
          product: input.product,
          headline: input.headline,
          conceptIdea: input.conceptIdea,
          conceptMode: input.conceptMode,
        }))
      : null;
  const designStudioMgScheme =
    input.mode === "h3-design-studio-mg"
      ? (input.designStudioMgScheme ??
        resolveH3DesignStudioMgScheme({
          pick: "auto",
          product: input.product,
          headline: input.headline,
          conceptIdea: input.conceptIdea,
          conceptMode: input.conceptMode,
        }))
      : null;
  const fallback =
    input.mode === "h3-showreel" && showreelScheme
      ? H3_SHOWREEL_SCHEME_STILL[showreelScheme]
      : input.mode === "h3-sphere-mg" && sphereMgScheme
        ? H3_SPHERE_MG_SCHEME_STILL[sphereMgScheme]
        : input.mode === "h3-logo-mg" && logoMgScheme
          ? H3_LOGO_MG_SCHEME_STILL[logoMgScheme]
          : input.mode === "h3-triangle-light-mg" && triangleLightMgScheme
            ? H3_TRIANGLE_LIGHT_MG_SCHEME_STILL[triangleLightMgScheme]
            : input.mode === "h3-glass-type-mg" && glassTypeMgScheme
              ? H3_GLASS_TYPE_MG_SCHEME_STILL[glassTypeMgScheme]
              : input.mode === "h3-design-studio-mg" && designStudioMgScheme
                ? H3_DESIGN_STUDIO_MG_SCHEME_STILL[designStudioMgScheme]
                : H3_STILL_DEFAULT[input.mode];
  const subject = named
    ? `${named}${input.conceptMode ? " logo or mascot" : ""}`
    : input.conceptMode
      ? "a simple geometric brand mark / cute mascot"
      : fallback;
  const photoWins =
    "When IMAGE 1 is attached, IMAGE 1 pixels ARE the only product identity. " +
    nameIsClaimImage1IsObjectLine(named || undefined) +
    " Keep IMAGE 1's real category and silhouette (a car stays a car even if the name says 便攜電源 / battery / power bank). Do not restyle IMAGE 1 into a power bank, sneaker, or C4D primitive that only matches the typed name.";
  const lock = named
    ? `${photoWins} Call it "${subject}" as a label only. Keep shape, color, materials of IMAGE 1 when attached. No invented logos or readable fake words.`
    : `Hero: ${subject}. ${photoWins} No invented brand names, no readable fake words.`;
  const aspect = resolveH3ShotStillAspectRatio(input.mode, input.showreelAspect);

  const shared = [
    `Photoreal commercial still, ${aspect}, textless, no captions, no watermarks, no UI.`,
    lock,
    "Single hero, sharp, studio-grade, ready to animate as @Image1.",
  ];

  switch (input.mode) {
    case "ecom-orbit":
      return [
        ...shared,
        "Centered product hero on a clean seamless backdrop, 3/4 view, soft rim light, shallow depth.",
        "E-commerce packshot — not a lifestyle scene, not a collage.",
      ].join(" ");
    case "object-lock":
      return [
        ...shared,
        "Product fills the frame, camera glued to the object, background softly blurred.",
        "SnorriCam still — product sharp and centered.",
      ].join(" ");
    case "macro-snap":
      return [
        ...shared,
        "Full-product food or material hero still: entire cookie/dish/object silhouette readable with margin, appetite photography.",
        "Gloss, crumbs, sauce, surface tension visible — but do NOT extreme-crop; keep the whole subject in frame.",
        "One plate/object, no hands, no restaurant interior.",
      ].join(" ");
    case "luxury-tabletop":
      return [
        ...shared,
        "Luxury product on marble or dark silk, low tabletop angle, volumetric light, no people yet.",
        "High-end still life, metal/glass highlights.",
      ].join(" ");
    case "beauty-mv":
      return [
        ...shared,
        input.conceptMode
          ? "Soft-light mascot or logo character portrait, chest-up, MV grade."
          : "Soft-light beauty portrait, chest-up, dewy skin, shallow bokeh, MV grade.",
        "Identity-lock face or character — one subject only.",
      ].join(" ");
    case "imitate-ad":
      return [
        ...shared,
        "Clean product packshot, 3/4 hero, seamless backdrop, commercial lighting.",
        "This still is the SKU H3 must lock while copying a reference video's camera.",
      ].join(" ");
    case "neon-on-real":
      return [
        ...shared,
        "Clean hero packshot or logo mark on a simple dark backdrop, ready for neon overlay identity.",
        "Optional @Image1 lock for neon-on-real — the real scene comes from the reference MP4.",
      ].join(" ");
    case "food-bullet-time": {
      const arc = parseFoodBulletArc(input.foodBulletArc);
      if (arc === "hero-plate") {
        return [
          "Photoreal commercial still, 9:16, textless, no captions, no watermarks, no UI.",
          lock,
          "Food promo keyframe for a 3-beat plate return: young person with a COMPLETE, CLEAN plated dish / wrap / drink held toward camera — fully assembled, menu-hero plating, no mid-air debris.",
          "Face clear; food identity sharp and fully intact. Cafe / restaurant backdrop, shallow depth of field.",
          "This still locks the Final Hero Plate look — explosion happens only in video, then must return to this clean complete plate.",
        ].join(" ");
      }
      return [
        "Photoreal commercial still, 9:16, textless, no captions, no watermarks, no UI.",
        lock,
        "Viral RedNote food check-in photo: young person smiling at camera, holding a wrap / sandwich / boba cup / plated dish TOWARD the lens with both hands (or one hand for drinks) — face clear and sharp.",
        "PEAK high-speed BULLET-TIME FOOD EXPLOSION already frozen at maximum drama: the dish's own layers radially burst apart around the hands — bread/wrap sheets, filling, sauce droplets, cheese strands, crumbs, lettuce, ice, or pearls that BELONG to this food. Dense 3D debris cloud filling mid-air (dozens of readable particles, not two timid floating leaves). Core of the dish still gripped; nothing unreadable off-frame.",
        "Real cafe / street / restaurant backdrop with shallow depth of field. Keep exact food types and plating — do not invent unrelated ingredients.",
        "Commercial SLR texture, cinematic daylight, Matrix-style freeze — ready as @Image1 for a rightward orbit around the frozen explosion while the person stays almost still.",
      ].join(" ");
    }
    case "c4d-motion":
      return [
        ...shared,
        "Centered IMAGE 1 hero on a pure black void, dramatic rim light, metallic / glossy C4D commercial look.",
        "High-contrast dark studio — no street lifestyle, no white seamless e-com backdrop, no readable invented brand words.",
        "Do not replace IMAGE 1 with a generic power bank, battery brick, or sneaker because of the product name.",
        "Premium brand motion-graphics still ready for abstract → product reveal animation.",
      ].join(" ");
    case "h3-showreel": {
      const schemeNote =
        showreelScheme === "car-cinematic"
          ? "Cinematic car / vehicle hero, wet-night reflections, low angle ready for car-cinematic showreel."
          : showreelScheme === "keyboard-tech"
            ? "Tech keyboard / peripheral hero, sharp keycaps, subtle RGB, dark desk ready for keyboard-tech showreel."
            : "Premium product or brand-mark hero on a dark cinematic void, ready for abstract-morph showreel.";
      return [
        ...shared,
        schemeNote,
        "Phone, car, keyboard, bottle, sneaker, or logo mascot all work — sharp silhouette ready for kinetic showreel animation.",
        "No captions, no UI chrome; optional designed masthead space only if needed later in video.",
      ].join(" ");
    }
    case "h3-sphere-mg": {
      const schemeNote =
        sphereMgScheme === "crystal-glass"
          ? "Crystal-glass C4D stage: large glass orb with a photoreal miniature of the uploaded product INSIDE, ready to emerge."
          : sphereMgScheme === "chrome-spin"
            ? "Chrome-spin C4D stage: large chrome orb with the product front face readable, ready to step out as the hero."
            : sphereMgScheme === "liquid-mercury"
              ? "Liquid-mercury C4D stage: product silhouette coalescing in the fluid, ready to be lifted out."
              : sphereMgScheme === "neon-core"
                ? "Neon-core C4D stage: product silhouette in the plasma core, ready to come forward."
                : "Matte C4D orb as a STAGE — product front face large on the facing side, about to step off as the hero (not a blank moon).";
      return [
        ...shared,
        schemeNote,
        "Motion-graphics still (not a space documentary). Sphere is the opening world; the uploaded product must already be recognizable so the video can bring it OUT.",
        "Do NOT output a blank grey planet, bump-map etchings only, NASA Earth, or extra moons. Do NOT reshape the SKU into a spherical car/phone.",
        "Optional empty masthead space for kinetic type later. No captions, no UI chrome.",
      ].join(" ");
    }
    case "h3-logo-mg": {
      const schemeNote =
        logoMgScheme === "chrome-type"
          ? "Chrome / iridescent 3D extruded wordmark or mark matching the uploaded logo, soft gradient studio, pearlescent highlights."
          : logoMgScheme === "ribbon-peel"
            ? "Curling white ribbon/paper already carrying the uploaded logo, vibrant blue-orange gradient void."
            : logoMgScheme === "pin-field"
              ? "Wave of glossy colored pins/buttons framing or forming the uploaded logo silhouette on a bright stage."
              : "Bright glassmorphic C4D stage: frosted UI panels + iridescent spheres around a white card with the uploaded logo crisply readable.";
      return [
        ...shared,
        schemeNote,
        "3D logo interpretation still — the uploaded mark IS the hero (not a dark sphere void, not a packshot orbit).",
        "Keep logo geometry and colors locked; no invented competitor brands; no readable fake words beyond the mark.",
        "Ready for bright motion-graphics logo animation as @Image1.",
      ].join(" ");
    }
    case "h3-triangle-light-mg": {
      const schemeNote =
        triangleLightMgScheme === "flow"
          ? "Dark amber void: layered frosted rounded triangles drifting in warm caustic light, uploaded logo silhouette faintly formed by glass shapes."
          : "Dark void C4D exhibit: frosted triangular glass prisms with warm orange-gold caustics; brand mark / logo card crisply readable at center.";
      return [
        ...shared,
        schemeNote,
        "Triangle-light brand MG still — dark void + glass triangles + caustic light; the uploaded mark IS the hero.",
        "Not a packshot orbit, not lifestyle, not bright glass-UI logo card. Keep mark locked; no competitor brands.",
        "Ready for kinetic title + brand-lock animation as @Image1.",
      ].join(" ");
    }
    case "h3-glass-type-mg": {
      const schemeNote =
        glassTypeMgScheme === "type-parade"
          ? "Bright studio: thick translucent rainbow glass 3D letters spelling the brand wordmark in isometric line, tiny colorful diorama objects inside each letter."
          : "Bright off-white matte studio: soft debossed brand mark on a textured plane, translucent blue 3D cursor mid-click with concentric ripples.";
      return [
        ...shared,
        schemeNote,
        "Transparent 3D commercial type still — bright studio glass letters (not dark triangle-light void).",
        "Keep uploaded mark / brand letters locked; no competitor brands; no subtitle bars.",
        "Ready for transparent glass-type kinetic animation as @Image1.",
      ].join(" ");
    }
    case "h3-design-studio-mg": {
      const schemeNote =
        designStudioMgScheme === "brand-desk"
          ? "Bright design studio desk: iridescent orange-to-purple glass brand wordmark with frosted UI panels and chrome sphere accents."
          : "Bright drafting table: translucent orange-to-purple glass pillow form + blue 3D cursor on a technical mat, ready to morph into a brand letter.";
      return [
        ...shared,
        schemeNote,
        "Design-studio glass brand still — drafting desk / showreel energy (not dark triangle-light, not pure type-rise).",
        "Keep uploaded mark / brand letters locked; no competitor brands; no subtitle bars.",
        "Ready for design-studio kinetic animation as @Image1.",
      ].join(" ");
    }
    case "h3-movie-title":
      return [
        ...shared,
        "Cinematic product or brand-mark hero on a dark editorial void, framed like a movie title card still.",
        "Leave negative space for designed masthead type later; no readable fake words in the still.",
        "Ready for multi-panel / title-card animation as @Image1.",
      ].join(" ");
    case "h3-lifestyle":
      return [
        ...shared,
        input.conceptMode
          ? "Lifestyle photo: person with logo/mascot prop in a real cafe/street/home setting — face clear, brand identity readable."
          : "Lifestyle photo: person holding or using the product in a real cafe/street/home setting — face clear, product sharp.",
        "Not a beauty MV portrait, not a pure studio packshot — lifestyle use context.",
        "Single subject pair (person + hero), ready to animate as @Image1.",
      ].join(" ");
  }
}
