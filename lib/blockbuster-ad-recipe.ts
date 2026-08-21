/**
 * Blockbuster 3-ref logistics ad — one 9s take, not a 九宫格 stitch.
 * Matches the Lynn / Seedance “3张图复刻大片级AI广告” timed prompt:
 * scene first frame → violent overpass hit → float → hero reveal.
 *
 * Image order sent to MiniMax H3 (first URL ≈ first frame):
 *   scene plate → packaging → hero. Hero must not open the clip.
 *
 * Camera views:
 *   behind-truck — follow car behind the trailer (default)
 *   on-bridge — on the overpass, truck ONCOMING under the span (cab toward camera)
 *   bridge-down-road — on TOP of the overpass looking DOWN / along the highway
 *                      (vanishing point); truck COMING toward camera from far;
 *                      boxes float up over the road (viral ref look — not on-truck POV)
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

export const BLOCKBUSTER_CAMERA_IDS = [
  "behind-truck",
  "on-bridge",
  "bridge-down-road",
] as const;
export type BlockbusterCameraId = (typeof BLOCKBUSTER_CAMERA_IDS)[number];

export function parseBlockbusterCamera(raw: unknown): BlockbusterCameraId {
  const v = String(raw ?? "behind-truck").trim();
  if (BLOCKBUSTER_CAMERA_IDS.includes(v as BlockbusterCameraId)) {
    return v as BlockbusterCameraId;
  }
  return "behind-truck";
}

/** Elevated bridge POVs skip the scene plate (prompt-only). */
export function isBlockbusterElevatedBridgeCamera(
  camera: BlockbusterCameraId,
): boolean {
  return camera === "on-bridge" || camera === "bridge-down-road";
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
  /** behind-truck | on-bridge (oncoming) | bridge-down-road (vanishing-point) */
  camera?: BlockbusterCameraId;
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

function cameraLockLines(input: {
  camera: BlockbusterCameraId;
  sceneTag: string | null;
}): { orbit: string; openLock: string } {
  const { camera, sceneTag } = input;
  if (camera === "bridge-down-road") {
    return {
      orbit:
        "全片一条连续长镜头、同一机位轨道：相机钉在人行天桥／立交桥的桥面上（站在桥顶），高角度往下／顺着公路纵深看（vanishing point 在画面中轴），护栏可出现在画面近景边缘。光流连续。时间码只标故事阶段，不是分镜切点。禁止硬切、幻灯片、跳切、闪帧、机位瞬移、突然变焦。严禁切到货车车厢内／货箱上方／车尾跟拍／路面平视。相机全程留在桥顶，不要下车、不要跟车。货车必须从远处沿车道迎面驶来（车头朝桥上镜头，逐渐靠近），正常前进禁止倒车。速度只允许光学渐变（撞击后平滑减速）。画面中不要出现拍摄者本人。",
      openLock: sceneTag
        ? `以${sceneTag}为构图参考（可微调）：机位在桥顶高角度顺着公路往下看；桥下货车从远处迎面驶来（车头朝镜头），正常前进禁止倒车。锁定同一白天城市／郊区公路与护栏。严禁车内视角。`
        : "开场必须是站在天桥／立交桥桥顶的高角度俯视：护栏近景，多车道公路向远处延伸。一辆满载货车从远处沿车道迎面驶来（车头朝桥上镜头，逐渐靠近），正常前进禁止倒车。货箱堆得过高。白天晴朗、手机纪实感。严禁货车驶离只露车尾，严禁切到车厢内／货箱上，不要用产品棚拍开场。",
    };
  }
  if (camera === "on-bridge") {
    return {
      orbit:
        "全片一条连续长镜头、同一机位轨道：相机钉在人行天桥／立交桥护栏旁，高角度俯视桥洞下方，望向迎面驶来的公路（车头朝镜头）。护栏可出现在画面近景边缘；画面上方可看到桥底结构。光流连续。时间码只标故事阶段，不是分镜切点。禁止硬切、幻灯片、跳切、闪帧、机位瞬移、突然变焦。禁止切到货车正后方跟拍，禁止变成顺着公路只看车尾驶离的视角。货车必须沿车道正常向前开（迎面靠近，禁止倒车）。速度只允许光学渐变（撞击后平滑减速）。画面中不要出现拍摄者本人。",
      openLock: sceneTag
        ? `以${sceneTag}为构图参考（可微调）：机位在天桥上，望向桥下迎面驶来的货车（车头／车灯朝镜头），货箱过高即将擦到桥底。正常前进禁止倒车。锁定同一白天公路与护栏。`
        : "开场必须是人行天桥上俯视迎面货车：护栏近景，桥下多车道，货车车头朝镜头驶向／钻入桥底（正常前进，禁止倒车）。货箱堆得过高，即将擦到桥底。白天晴朗。禁止只拍车尾驶离，禁止路面后方跟拍，不要用产品棚拍开场。",
    };
  }
  return {
    orbit:
      "全片一条连续长镜头、同一机位轨道：相机始终钉在货车正后方略低处，像装在跟随车上，光流连续。时间码只标故事阶段，不是分镜切点。禁止硬切、幻灯片、跳切、闪帧、机位瞬移、突然变焦。速度只允许光学渐变（撞击后平滑减速），禁止突然升格冻帧。货车、公路、天桥必须一直在同一条路上。",
    openLock: sceneTag
      ? `以${sceneTag}为第一帧：机位在货车后方、略低，望向正前方天桥。锁定同一黄昏城市道路、天桥、灯光与货车，不要换成别的地点。`
      : "开场必须是货车后方低机位：黄昏城市公路、湿沥青、金蓝时刻，正前方一座天桥，货车背对镜头驶去。不要用产品棚拍、实验室、办公桌当开场。",
  };
}

function storyBeatsFor(input: {
  camera: BlockbusterCameraId;
  timing: BlockbusterTimingId;
  cargo: string;
  revealObject: string;
}): string[] {
  const { camera, timing, cargo, revealObject } = input;
  const early = timing === "early-reveal";

  if (camera === "bridge-down-road") {
    return early
      ? [
          `0-2s：同一桥顶机位顺着公路纵深持续观看，严禁切到车上。桥下满载${cargo}的货车从远处迎面驶来（车头朝镜头，逐渐变大靠近），正常前进禁止倒车。俯视可见车顶与过高货箱，顶层几乎要擦到桥底。箱子随车轻微晃动。路面车流运动模糊连续。`,
          `2-2.5s：行驶途中直接撞击（压缩碰撞段），不要先停再撞、不要切机位、不要倒车、不要切到车厢内。货车迎面钻过桥底时，最上层箱子与桥底剧烈撞击——错位、倾覆，大量纸箱立刻向上方、朝桥顶镜头炸开飞来，铺满公路纵深前景（从路面飞向桥上视角）。货车继续向前穿过驶离，不要凭空消失、不要倒退。带运动模糊。`,
          `2.5-4.5s：镜头不停不切；仍钉在桥顶略微前推／稳住。速度平滑放慢。货车在桥下远处继续驶离。箱子在公路上方空中翻滚漂浮朝镜头飞来、层层占满前景（产品展示悬浮在公路上）。一箱在飞的过程中打开，内部爆出暖金光晕，${revealObject}，从打开的箱中边飞边浮现，不要突然出现在画面中心。`,
          `4.5-9s：同一桥顶镜头极慢前推，浅景深，${revealObject}，在打开的箱中／箱旁升起并轻轻转动，长时间占画面中心成为真正 Hero（约一半片长），边缘强光晕。周围箱子继续在公路上方缓慢翻转漂浮。背景仍是公路 vanishing point 与桥顶护栏，自然虚化。禁止定格、禁止Hold、禁止车内视角。`,
        ]
      : [
          `0-2s：同一桥顶机位顺着公路纵深持续观看，严禁切到车上。桥下满载${cargo}的货车从远处迎面驶来（车头朝镜头，逐渐变大靠近），正常前进禁止倒车。俯视可见车顶与过高货箱，顶层几乎要擦到桥底。箱子随车轻微晃动。路面车流运动模糊连续。`,
          `2-4s：行驶途中直接撞击，不要先停再撞、不要切机位、不要倒车、不要切到车厢内。货车迎面钻过桥底时，最上层箱子与桥底剧烈撞击——错位、倾覆，大量纸箱立刻向上方、朝桥顶镜头炸开飞来，铺满公路纵深前景。货车继续向前穿过驶离，不要凭空消失、不要倒退。带运动模糊。尘土、纸屑可以有，画面仍干净高级。`,
          `4-6s：镜头不停不切、不降机、不瞬移；仍钉在桥顶略微前推。速度平滑放慢。货车在桥下远处继续驶离。几十只箱子在公路上方继续朝镜头翻滚漂浮、占满前景。一箱在飞的过程中打开（不要停在空中），内部爆出暖金光晕，${revealObject}，从打开的箱中边飞边浮现，不要突然出现在画面中心。`,
          `6-9s：同一桥顶镜头极慢前推，浅景深，直到最后一帧仍在微动。${revealObject}，在打开的箱中／箱旁升起并轻轻转动，占画面中心，边缘强光晕。周围箱子继续在公路上方缓慢翻转漂浮。背景仍是公路 vanishing point 与桥顶护栏，自然虚化。禁止定格、禁止Hold、禁止车内视角。`,
        ];
  }

  if (camera === "on-bridge") {
    return early
      ? [
          `0-2s：同一天桥俯视机位持续观看。桥下公路上，满载${cargo}的货车车头朝镜头从较远处向前驶来／驶向桥底（正常前进，禁止倒车、禁止整车倒退）。货箱顶层几乎要擦到桥底。箱子随车轻微晃动。路面车流运动模糊连续。`,
          `2-2.5s：行驶途中直接撞击（压缩碰撞段），不要先停再撞、不要切机位、不要倒车。货车迎面钻过天桥下方时，最上层箱子与桥底剧烈撞击——错位、倾覆，大量纸箱立刻向上方、朝桥上镜头炸开飞来。货车继续向前穿过驶离，不要凭空消失、不要倒退。带运动模糊。`,
          `2.5-4.5s：镜头不停不切；仍在天桥俯视机位略微前推／稳住。速度平滑放慢。货车在桥下远处继续向前驶离。箱子在空中翻滚朝镜头飞来、占满前景。一箱在飞的过程中打开，内部爆出暖金光晕，${revealObject}，从打开的箱中边飞边浮现，不要突然出现在画面中心。`,
          `4.5-9s：同一镜头极慢前推，浅景深，${revealObject}，升起并轻轻转动，长时间占画面中心成为真正 Hero（约一半片长），边缘强光晕。周围箱子继续缓慢翻转坠落。背景仍是桥下公路与天桥护栏，自然虚化。禁止定格、禁止Hold。`,
        ]
      : [
          `0-2s：同一天桥俯视机位持续观看。桥下公路上，满载${cargo}的货车车头朝镜头从较远处向前驶来／驶向桥底（正常前进，禁止倒车、禁止整车倒退）。货箱顶层几乎要擦到桥底。箱子随车轻微晃动。路面车流运动模糊连续。`,
          `2-4s：行驶途中直接撞击，不要先停再撞、不要切机位、不要倒车。货车迎面钻过天桥下方时，最上层箱子与桥底剧烈撞击——错位、倾覆，大量纸箱立刻向上方、朝桥上镜头炸开飞来。货车继续向前穿过驶离，不要凭空消失、不要倒退。带运动模糊。尘土、纸屑可以有，画面仍干净高级。`,
          `4-6s：镜头不停不切、不降机、不瞬移；仍在天桥俯视机位略微前推。速度平滑放慢。货车在桥下远处继续向前驶离。几十只箱子继续朝镜头翻滚飞来、占满前景。一箱在飞的过程中打开（不要停在空中），内部爆出暖金光晕，${revealObject}，从打开的箱中边飞边浮现，不要突然出现在画面中心。`,
          `6-9s：同一镜头极慢前推，浅景深，直到最后一帧仍在微动。${revealObject}，升起并轻轻转动，占画面中心，边缘强光晕。周围箱子继续缓慢翻转坠落。背景仍是桥下公路与天桥护栏，自然虚化。禁止定格、禁止Hold。`,
        ];
  }

  return early
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
}

/** Timed one-take prompt for MiniMax H3 / R2V — Chinese beats (Hailuo-native), @ tags in-shot. */
export function buildBlockbusterVideoPrompt(input: BlockbusterPromptInput): string {
  const hero = heroLabel(input);
  const ids = blockbusterImageMap(input);
  const heroTag = tag(ids.hero);
  const packTag = ids.packaging ? tag(ids.packaging) : null;
  const sceneTag = ids.scene ? tag(ids.scene) : null;
  const timing = parseBlockbusterTiming(input.timing);
  const camera = parseBlockbusterCamera(input.camera);

  const cargo = input.conceptMode
    ? packTag
      ? `高高堆叠的${packTag}品牌色块／Logo 卡片／吉祥物贴纸`
      : "高高堆叠的空白色块／卡片（纯色或牛皮纸色，无Logo、无文字、无图案）"
    : packTag
      ? `高高堆叠的${packTag}品牌包装纸箱`
      : "高高堆叠的素面牛皮纸箱／空白纸箱（无Logo、无文字、无产品图、无假商标）";

  const revealObject = input.conceptMode
    ? `精确复制${heroTag}照片中的 Logo／吉祥物像素（称呼：${hero}），带暖金轮廓光 — 禁止另造假冒 SKU 瓶子或换形状`
    : `精确复制${heroTag}照片中的实物（称呼仅作标签：${hero}）— 形状、盖子、材质、标签排版必须与照片一致；禁止按品类名改成滴管瓶／安瓿／泵瓶／新包装`;

  const { orbit, openLock } = cameraLockLines({ camera, sceneTag });
  const heroBanSec = timing === "early-reveal" ? "0-2.5秒" : "0-4秒";
  const storyBeats = storyBeatsFor({
    camera,
    timing,
    cargo,
    revealObject,
  });

  const beats = [
    `现代时尚商业广告 ONE-TAKE ${BLOCKBUSTER_DURATION_SEC}秒 9:16。画面干净通透、高饱和高对比，创意视觉冲击力强，节奏紧凑，高级质感。`,
    orbit,
    openLock,
    `${heroTag}是结尾英雄，${heroBanSec}严禁出现产品／吉祥物特写或棚拍。Pixels win：必须以${heroTag}照片为准，形状、颜色、材质、标签文字不许替换或变形；产品名字段只是称呼，不是重新设计依据。`,
    packTag
      ? `${packTag}＝包装／飞行道具。空中每一只箱子、卡片必须跟这张印刷一致（颜色、Logo、图案）。箱子要多、要密，占满画面，不要只有三四只。`
      : "空中纸箱必须是素面空白（无Logo、无文字、无产品照片印刷）。箱子要多、要密，占满画面。禁止自创 Vitamin C／瓶身图案／假商标。",
    ...storyBeats,
    "音效：货车引擎、纸箱撞击、空气呼啸、开盒、产品出现轻微能量音。无旁白、无配乐、无字幕。",
    `FORBIDDEN: freeze-frame, pause between beats, hold frame, still hero lock, jump cut, camera teleport, snap zoom, truck reversing / driving backward toward camera, truck vanishing, product pop-in, second location, tutorial steps, lab/desk opening, fake SKU swap, inventing a different bottle/serum/dropper/ampoule instead of the exact ${heroTag} photo, invented letters on boxes, watermarks, showing the hero before ${timing === "early-reveal" ? "2.5s" : "4s"}${
      camera === "bridge-down-road"
        ? ", switching to behind-the-truck chase cam, camera jumping onto the truck bed / cargo POV, truck driving away with only rear visible"
        : camera === "on-bridge"
          ? ", switching to behind-the-truck chase cam, switching to down-the-road vanishing-point with truck driving away"
          : ", switching to on-bridge or bridge-down-road elevated POV"
    }.`,
  ];

  return beats.filter(Boolean).join("\n");
}

/** Textless truck/overpass plate when the user has no scene upload. */
export function buildBlockbusterSceneStillPrompt(input: {
  conceptMode: boolean;
  product: string;
  camera?: BlockbusterCameraId;
  /** When false, force plain blank boxes (no brand / product print). */
  hasPackaging?: boolean;
}): string {
  const camera = parseBlockbusterCamera(input.camera);
  const cargo =
    input.hasPackaging === true
      ? input.conceptMode
        ? "trailer stacked TOO HIGH with brand tiles / logo cards (blank or brand colors — no readable fake words)"
        : `trailer stacked TOO HIGH with branded boxes matching ${input.product.trim() || "the product"} packaging colors — top layer almost scraping the overpass underside`
      : "trailer stacked TOO HIGH with PLAIN blank kraft cardboard boxes only — NO logos, NO text, NO product photos, NO vitamin/serum artwork on any box face";

  if (camera === "bridge-down-road") {
    return [
      "Photoreal cinematic 9:16 FIRST FRAME, textless.",
      "Camera ON TOP of a pedestrian overpass / bridge deck, HIGH ANGLE looking DOWN / along the highway vanishing point (road stretches into the distance).",
      "Railing may sit in the near edge of frame. Daylight, phone-documentary commercial look.",
      `A semi-truck on the highway BELOW is COMING TOWARD the bridge camera from far away (cab / front toward camera — growing closer). ${cargo}.`,
      "Show roof and tall load from above as it approaches; load almost scraping the bridge underside — beat BEFORE boxes smash and explode UP toward the bridge-top camera, floating over the road.",
      "NOT behind-the-truck chase cam, NOT camera sitting on the truck bed, NOT truck driving away with only the rear visible.",
      "Architecture: city or suburban highway, trees, road signs, traffic. No people, no photographer, no UI, no captions, no watermarks, no product beauty shot.",
      "Boxes must stay blank kraft cardboard with zero readable branding.",
      "Locked composition, ready to animate.",
    ].join(" ");
  }

  if (camera === "on-bridge") {
    return [
      "Photoreal cinematic 9:16 FIRST FRAME, textless.",
      "Camera ON a pedestrian overpass / bridge, HIGH ANGLE looking at ONCOMING traffic under THIS overpass (cab / headlights toward camera).",
      "Railing may sit in the near edge of frame; bridge underside may frame the top. Daylight, commercial look.",
      `A semi-truck on the highway BELOW drives FORWARD toward / under THIS overpass (normal forward motion — NOT reversing, NOT driving away with only the rear visible). ${cargo}.`,
      "Show cab facing camera and tall load almost scraping the bridge underside — beat BEFORE boxes smash upward toward the bridge camera.",
      "NOT behind-the-truck chase cam, NOT down-the-road vanishing-point truck-away shot.",
      "Architecture: city highway, road signs, traffic. No people, no photographer, no UI, no captions, no watermarks, no product beauty shot.",
      "Boxes must stay blank kraft cardboard with zero readable branding.",
      "Locked composition, ready to animate.",
    ].join(" ");
  }

  return [
    "Photoreal cinematic 9:16 FIRST FRAME, textless.",
    "Camera BEHIND the truck, slightly low, looking FORWARD down a dusk city highway toward a concrete overpass (not a bird's-eye from the bridge).",
    "Wet reflective asphalt, golden-blue hour, high contrast.",
    `A dark semi-truck drives AWAY from camera toward the underpass, ${cargo}.`,
    "The load is dangerously tall — this still is the beat BEFORE a violent box-vs-bridge hit.",
    "Architecture: glass offices, distant tower, streetlights. No people, no UI, no captions, no watermarks, no product beauty shot.",
    input.hasPackaging === true
      ? "Locked composition, commercial look, ready to animate."
      : "Boxes must stay blank kraft cardboard with zero readable branding. Locked composition, ready to animate.",
  ].join(" ");
}

export function isBlockbusterLandingRecipeId(
  value: string | null | undefined,
): boolean {
  return value === "product-blockbuster-9s" || value === "concept-blockbuster-9s";
}
