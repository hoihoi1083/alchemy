/**
 * Blockbuster 3-ref logistics ad — one 9s take, not a 九宫格 stitch.
 * Matches the Lynn / Seedance “3张图复刻大片级AI广告” timed prompt:
 * scene first frame → violent overpass hit → float → hero reveal.
 *
 * Image order sent to MiniMax H3 (first URL ≈ first frame):
 *   scene plate → packaging → hero. Hero must not open the clip.
 */

import type { CaptionLine } from "@/lib/ad-pack-types";

export const BLOCKBUSTER_DURATION_SEC = 9;

export const BLOCKBUSTER_TIMING_IDS = ["classic", "early-reveal"] as const;
export type BlockbusterTimingId = (typeof BLOCKBUSTER_TIMING_IDS)[number];

export function parseBlockbusterTiming(raw: unknown): BlockbusterTimingId {
  const v = String(raw ?? "classic").trim();
  if (BLOCKBUSTER_TIMING_IDS.includes(v as BlockbusterTimingId)) {
    return v as BlockbusterTimingId;
  }
  return "classic";
}

export const BLOCKBUSTER_NEGATIVE =
  "on-screen text, subtitles, captions, watermarks, logos invented by the model, " +
  "voiceover, dialogue, lyrics, slideshow, hard cut, second location, " +
  "freeze-frame, hold frame, pause between beats, still moment, jump cut, " +
  "camera teleport, snap zoom, whip-pan cut, stutter, flicker, morph-cut, " +
  "truck vanishing, product popping in, " +
  "blurry product, morphing identity, extra people, UI chrome, " +
  "laboratory interior, office desk, talking head, beauty-shot opening, " +
  "product or mascot visible in the first 4 seconds, skip the truck, skip the collision";

export type BlockbusterPromptInput = {
  conceptMode: boolean;
  product: string;
  headline?: string;
  conceptIdea?: string;
  hasPackaging: boolean;
  hasSceneFrame: boolean;
  /** classic = original 0-2 / 2-4 / 4-6 / 6-9; early-reveal = tighter boxes, longer hero */
  timing?: BlockbusterTimingId;
};

/** MiniMax / Seedance slot numbers — scene first so H3 does not start on the SKU. */
export type BlockbusterImageMap = {
  scene?: number;
  packaging?: number;
  hero: number;
};

export function blockbusterImageMap(input: {
  hasPackaging: boolean;
  hasSceneFrame: boolean;
}): BlockbusterImageMap {
  let n = 1;
  const map: BlockbusterImageMap = { hero: 1 };
  if (input.hasSceneFrame) map.scene = n++;
  if (input.hasPackaging) map.packaging = n++;
  map.hero = n;
  return map;
}

export function orderedBlockbusterRefFiles<T>(files: {
  hero: T;
  packaging?: T | null;
  scene?: T | null;
}): T[] {
  const out: T[] = [];
  if (files.scene) out.push(files.scene);
  if (files.packaging) out.push(files.packaging);
  out.push(files.hero);
  return out;
}

function heroLabel(input: BlockbusterPromptInput): string {
  const named =
    input.product.trim() ||
    input.headline?.trim() ||
    input.conceptIdea?.trim() ||
    (input.conceptMode ? "brand mark" : "product");
  return named;
}

function tag(n: number): string {
  return `@Image${n}`;
}

/** Default on-screen copy for cream / product-reveal memes (burned in post). */
export const BLOCKBUSTER_DEFAULT_CAPTIONS = {
  en: [
    "DON'T JUST SHOW THE PRODUCT.",
    "BUILD THE REVEAL.",
    "One photo → one cinematic concept.",
    "Storyboard first. Generate second.",
  ],
  zh: [
    "不要只是展示产品。",
    "先设计它的登场。",
    "一张照片 → 一个完整视觉概念。",
  ],
} as const;

export type BlockbusterCaptionLang = keyof typeof BLOCKBUSTER_DEFAULT_CAPTIONS;

/**
 * Timed caption lines for a ~9s clip (early-reveal friendly).
 * Users can edit the text; timings scale to clip duration later.
 */
export function blockbusterCaptionLinesFromText(
  text: string,
  durationSec = BLOCKBUSTER_DURATION_SEC,
): CaptionLine[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6);
  if (lines.length === 0) return [];
  const startAt = Math.min(2.2, durationSec * 0.28);
  const endAt = Math.max(startAt + 1.2, durationSec - 0.4);
  const span = endAt - startAt;
  const slot = span / lines.length;
  return lines.map((line, i) => ({
    startSec: Number((startAt + i * slot).toFixed(2)),
    endSec: Number(
      Math.min(durationSec - 0.15, startAt + (i + 1) * slot + 0.15).toFixed(2),
    ),
    text: line,
    position: i < 2 ? ("top" as const) : ("bottom" as const),
  }));
}

export function defaultBlockbusterCaptionText(
  lang: BlockbusterCaptionLang = "en",
): string {
  return BLOCKBUSTER_DEFAULT_CAPTIONS[lang].join("\n");
}

/** Timed one-take prompt for MiniMax H3 / R2V — Chinese beats (Hailuo-native), @ tags in-shot. */
export function buildBlockbusterVideoPrompt(input: BlockbusterPromptInput): string {
  const hero = heroLabel(input);
  const ids = blockbusterImageMap(input);
  const heroTag = tag(ids.hero);
  const packTag = ids.packaging ? tag(ids.packaging) : null;
  const sceneTag = ids.scene ? tag(ids.scene) : null;
  const timing = parseBlockbusterTiming(input.timing);

  const cargo = input.conceptMode
    ? packTag
      ? `高高堆叠的${packTag}品牌色块／Logo 卡片／吉祥物贴纸`
      : "高高堆叠的品牌色块／Logo 卡片／吉祥物贴纸（配色跟品牌一致，不要假字）"
    : packTag
      ? `高高堆叠的${packTag}品牌包装纸箱`
      : "高高堆叠的品牌包装纸箱";

  const revealObject = input.conceptMode
    ? `精确复制${heroTag}照片中的 Logo／吉祥物像素（称呼：${hero}），带暖金轮廓光 — 禁止另造假冒 SKU 瓶子或换形状`
    : `精确复制${heroTag}照片中的实物（称呼仅作标签：${hero}）— 形状、盖子、材质、标签排版必须与照片一致；禁止按品类名改成滴管瓶／安瓿／泵瓶／新包装`;

  const openLock = sceneTag
    ? `以${sceneTag}为第一帧：机位在货车后方、略低，望向正前方天桥。锁定同一黄昏城市道路、天桥、灯光与货车，不要换成别的地点。`
    : "开场必须是货车后方低机位：黄昏城市公路、湿沥青、金蓝时刻，正前方一座天桥，货车背对镜头驶去。不要用产品棚拍、实验室、办公桌当开场。";

  const heroBanSec = timing === "early-reveal" ? "0-2.5秒" : "0-4秒";
  const storyBeats =
    timing === "early-reveal"
      ? [
          `0-2s：同一后方机位持续跟着走，不要锁死、不要换角度。货车满载${cargo}沿公路快速驶向正前方天桥。货箱堆得过高，顶层几乎要擦到桥底。箱子随车轻微晃动。路面运动模糊连续。`,
          `2-2.5s：行驶途中直接撞击（压缩碰撞段），不要先停再撞、不要切到新机位。货车高速钻过天桥，最上层箱子与天桥底部剧烈撞击——错位、倾覆，大量纸箱立刻向前上方、朝镜头炸开散出。货车继续向前驶出，不要凭空消失。带运动模糊。`,
          `2.5-4.5s：镜头不停不切；仍在原轨道上略微前推。速度平滑放慢。货车在远处继续驶离。箱子翻滚朝镜头飞来。一箱在飞的过程中打开，内部爆出暖金光晕，${revealObject}，从打开的箱中边飞边浮现，不要突然出现在画面中心。`,
          `4.5-9s：同一镜头极慢前推，浅景深，${revealObject}，升起并轻轻转动，长时间占画面中心成为真正 Hero（约一半片长），边缘强光晕。周围箱子继续缓慢翻转坠落。背景仍是同一条城市道路与天桥，自然虚化。禁止定格、禁止Hold。`,
        ]
      : [
          `0-2s：同一后方机位持续跟着走，不要锁死、不要换角度。货车满载${cargo}沿公路快速驶向正前方天桥。货箱堆得过高，顶层几乎要擦到桥底。箱子随车轻微晃动。路面运动模糊连续。`,
          `2-4s：行驶途中直接撞击，不要先停再撞、不要切到新机位。货车高速钻过天桥，最上层箱子与天桥底部剧烈撞击——错位、倾覆，大量纸箱立刻向前上方、朝镜头炸开散出。货车继续向前驶出，不要凭空消失。带运动模糊。尘土、纸屑可以有，画面仍干净高级。`,
          `4-6s：镜头不停不切、不降机、不瞬移；仍在原轨道上略微前推。速度平滑放慢。货车在远处继续驶离。几十只箱子继续朝镜头翻滚飞来、占满前景。一箱在飞的过程中打开（不要停在空中），内部爆出暖金光晕，${revealObject}，从打开的箱中边飞边浮现，不要突然出现在画面中心。`,
          `6-9s：同一镜头极慢前推，浅景深，直到最后一帧仍在微动。${revealObject}，升起并轻轻转动，占画面中心，边缘强光晕。周围箱子继续缓慢翻转坠落。背景仍是同一条城市道路与天桥，自然虚化。禁止定格、禁止Hold。`,
        ];

  const beats = [
    `现代时尚商业广告 ONE-TAKE ${BLOCKBUSTER_DURATION_SEC}秒 9:16。画面干净通透、高饱和高对比，创意视觉冲击力强，节奏紧凑，高级质感。`,
    "全片一条连续长镜头、同一机位轨道：相机始终钉在货车正后方略低处，像装在跟随车上，光流连续。时间码只标故事阶段，不是分镜切点。禁止硬切、幻灯片、跳切、闪帧、机位瞬移、突然变焦。速度只允许光学渐变（撞击后平滑减速），禁止突然升格冻帧。货车、公路、天桥必须一直在同一条路上。",
    openLock,
    `${heroTag}是结尾英雄，${heroBanSec}严禁出现产品／吉祥物特写或棚拍。Pixels win：必须以${heroTag}照片为准，形状、颜色、材质、标签文字不许替换或变形；产品名字段只是称呼，不是重新设计依据。`,
    packTag
      ? `${packTag}＝包装／飞行道具。空中每一只箱子、卡片必须跟这张印刷一致（颜色、Logo、图案）。箱子要多、要密，占满画面，不要只有三四只。`
      : "空中包装／色块要多、要密，占满画面。",
    ...storyBeats,
    "音效：货车引擎、纸箱撞击、空气呼啸、开盒、产品出现轻微能量音。无旁白、无配乐、无字幕。",
    `FORBIDDEN: freeze-frame, pause between beats, hold frame, still hero lock, jump cut, camera teleport, snap zoom, truck vanishing, product pop-in, second location, tutorial steps, lab/desk opening, fake SKU swap, inventing a different bottle/serum/dropper/ampoule instead of the exact ${heroTag} photo, invented letters, watermarks, showing the hero before ${timing === "early-reveal" ? "2.5s" : "4s"}.`,
  ];

  return beats.filter(Boolean).join("\n");
}

/** Textless truck/overpass plate when the user has no scene upload. */
export function buildBlockbusterSceneStillPrompt(input: {
  conceptMode: boolean;
  product: string;
}): string {
  const cargo = input.conceptMode
    ? "trailer stacked TOO HIGH with brand tiles / logo cards (blank or brand colors — no readable fake words)"
    : `trailer stacked TOO HIGH with branded boxes matching ${input.product.trim() || "the product"} packaging colors — top layer almost scraping the overpass underside`;
  return [
    "Photoreal cinematic 9:16 FIRST FRAME, textless.",
    "Camera BEHIND the truck, slightly low, looking FORWARD down a dusk city highway toward a concrete overpass (not a bird's-eye from the bridge).",
    "Wet reflective asphalt, golden-blue hour, high contrast.",
    `A dark semi-truck drives AWAY from camera toward the underpass, ${cargo}.`,
    "The load is dangerously tall — this still is the beat BEFORE a violent box-vs-bridge hit.",
    "Architecture: glass offices, distant tower, streetlights. No people, no UI, no captions, no watermarks, no product beauty shot.",
    "Locked composition, commercial look, ready to animate.",
  ].join(" ");
}

export function isBlockbusterLandingRecipeId(
  value: string | null | undefined,
): boolean {
  return value === "product-blockbuster-9s" || value === "concept-blockbuster-9s";
}
