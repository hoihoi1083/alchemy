/**
 * MiniMax H3 shot recipes — single-clip, recipe-owned prompts (not 九宫格).
 * Pattern matches blockbuster / motion-poster: H3 only, no Kling.
 */

import type { VideoCreativeMode } from "@/lib/creative-workflow";
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
};

export const H3_SHOT_RECIPE_NEGATIVE =
  "on-screen text, subtitles, captions, watermarks, logos invented by the model, " +
  "voiceover, dialogue, lyrics, slideshow, hard cut, jump cut, freeze-frame, " +
  "blurry product, morphing identity, extra people unless specified, UI chrome, " +
  "lab interior, talking head unless beauty-mv, generic slow push-in unless specified";

/** Bullet-time allows frozen splash physics; still forbid slideshow / hard freeze with no camera. */
const FOOD_BULLET_TIME_NEGATIVE =
  "on-screen text, subtitles, captions, watermarks, logos invented by the model, " +
  "voiceover, dialogue, lyrics, slideshow still frames, hard cut, jump cut, " +
  "zero camera motion, blurry food, morphing identity, inventing ingredients not in the still, " +
  "UI chrome, lab interior, talking head, explosive chaotic scatter of food off-frame";

const MODE_TO_SUBPATH: Record<H3ShotRecipeMode, VideoSubpath> = {
  "ecom-orbit": "ecom_orbit",
  "object-lock": "object_lock",
  "macro-snap": "macro_snap",
  "luxury-tabletop": "luxury_tabletop",
  "beauty-mv": "beauty_mv",
  "imitate-ad": "imitate_ad",
  "neon-on-real": "neon_on_real",
  "food-bullet-time": "food_bullet_time",
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

/** True when this creative mode needs a reference MP4 (imitate-ad / neon-on-real). */
export function h3ShotRecipeNeedsReel(mode: H3ShotRecipeMode): boolean {
  return mode === "imitate-ad" || mode === "neon-on-real";
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

export type H3ShotPromptInput = {
  mode: H3ShotRecipeMode;
  conceptMode: boolean;
  product: string;
  headline?: string;
  conceptIdea?: string;
  hasReferenceVideo?: boolean;
  /** macro-snap only — crack/drip strength. Default strong. */
  macroSnapIntensity?: MacroSnapIntensity;
};

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
    "a young East Asian woman holding a loaded sandwich toward camera at an outdoor cafe",
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

/** Continuous one-take prompts — Chinese beats where H3 responds well. */
export function buildH3ShotRecipePrompt(input: H3ShotPromptInput): string {
  const subject = subjectLabel(input);
  const img = "@Image1";

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
      return [
        `美食子弹时间一镜（3D食物飞溅）：严格锁定${img}（${subject}）的人物面孔、服饰、食物种类与摆盘、场景环境；禁止换脸换菜、禁止凭空添加原图没有的食材。`,
        `画面里食物/酱汁/碎屑已呈高速摄影定格悬浮态：主体几乎冻结，只有镜头在运动。`,
        `0–1s：从英雄位建立，悬浮食材与飞溅弧清晰可读，人脸尽量清晰。`,
        `1–5s：镜头缓慢环绕或弧形掠过（约90–180°）悬浮飞溅核心，景深浅，背景有视差；食物保持悬停，不崩散、不落地、不爆炸式飞出画框。`,
        `5–6s：微推近或收在诱人英雄角，飞溅仍定格，商业美食打卡感。`,
        `一镜到底，无切镜、无幻灯片定格、无字幕。`,
        `Negative: ${FOOD_BULLET_TIME_NEGATIVE}`,
      ].join("\n");
  }
}

/** Nano Banana textless 9:16 still — H3 identity lock. Fast path when user has no upload. */
export function buildH3ShotRecipeStillPrompt(input: H3ShotPromptInput): string {
  const named = namedSubject(input);
  const fallback = H3_STILL_DEFAULT[input.mode];
  const subject = named
    ? `${named}${input.conceptMode ? " logo or mascot" : ""}`
    : input.conceptMode
      ? "a simple geometric brand mark / cute mascot"
      : fallback;
  const lock = named
    ? `The hero is exactly ${subject}. Keep shape, color, materials. No invented logos or readable fake words.`
    : `Hero: ${subject}. No invented brand names, no readable fake words.`;

  const shared = [
    "Photoreal commercial still, 9:16, textless, no captions, no watermarks, no UI.",
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
    case "food-bullet-time":
      return [
        "Photoreal commercial still, 9:16, textless, no captions, no watermarks, no UI.",
        lock,
        "Lifestyle food check-in photo: person holding or presenting the dish toward camera in a real cafe/street setting — face mostly clear and sharp.",
        "High-speed photography BULLET-TIME FOOD SPLASH freeze: sauces, crumbs, cheese strands, or droplets that BELONG to this dish suspended mid-air in a concentrated arc around the food — weightless float, not explosive scatter.",
        "Keep exact food types, quantities, and plating logic — do not invent unrelated ingredients.",
        "Commercial food photography, SLR texture, cinematic daylight, rich layers — ready to animate as @Image1 for a camera orbit around the frozen splash.",
      ].join(" ");
  }
}
