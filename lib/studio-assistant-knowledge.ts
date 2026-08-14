/**
 * Curated product knowledge for the in-app assistant.
 * Not the Git repo — shipped product only. Retrieve-on-ask; never invent features.
 */

export type KnowledgeLocale = "en" | "zh";

export type AssistantKnowledgeChunk = {
  id: string;
  title: string;
  keywords: string[];
  en: string;
  zh: string;
};

export const ASSISTANT_KNOWLEDGE: AssistantKnowledgeChunk[] = [
  {
    id: "what-is",
    title: "What Alchemy is",
    keywords: [
      "alchemy",
      "what",
      "product",
      "app",
      "studio",
      "ai",
      "lab",
      "是什麼",
      "係咩",
      "是什么",
      "做咩",
      "幹嘛",
      "平台",
    ],
    en: `Alchemy AI Lab is a prompt-free marketing studio. You describe a product or idea (or upload a photo); DeepSeek plans the brief; then you generate social images and short videos. You do not write fal/model prompts. Pay with tokens (signup grant + paid plans).`,
    zh: `Alchemy AI Lab 係免寫 Prompt 嘅行銷工作室。你講產品／概念或上傳相片，DeepSeek 幫手規劃，再出社交圖同短片。唔使自己寫模型 Prompt。用 Tokens 計費（註冊贈送 + 付費方案）。`,
  },
  {
    id: "pages",
    title: "Pages and tools",
    keywords: [
      "page",
      "route",
      "where",
      "menu",
      "nav",
      "邊度",
      "哪里",
      "頁",
      "页面",
      "studio",
      "landing",
      "start",
      "captions",
      "edit",
      "pro",
      "library",
      "brand",
      "ugc",
      "pricing",
    ],
    en: `Main places:
- / landing — marketing site, template cards, pricing teaser. Finishable “video recipe” cards are hidden for now.
- /start — pick physical product vs concept/service, then enter studio.
- /studio — guided wizard (default simple mode). Ask-AI launcher is OFF here.
- /captions — burn subtitles / BGM / voice on any MP4. Ask-AI OFF.
- /edit-image — clean, add text/logo, export. Ask-AI OFF.
- /pro — node canvas (Upload → image → video). Master plan. Pay-per-use fal.
- /brand-kit — save logo & colors.
- /library — past generations.
- /ugc — talking presenter.
- /pricing /account — plans, tokens, Stripe.
Ask-AI is a small logo on the landing page only. It is hidden on every other page.`,
    zh: `主要頁面：
- / 首頁 — 介紹、模板卡、收費預覽。首頁「可完成影片配方」卡而家隱藏。
- /start — 揀實體產品 vs 概念／服務，再入工作室。
- /studio — 引導式 wizard（預設簡單模式）。呢頁冇問 AI 浮掣。
- /captions — 任何 MP4 燒字幕／BGM／配音。冇問 AI。
- /edit-image — 清雜物、加字／Logo、匯出。冇問 AI。
- /pro — 節點畫布（上傳→圖→片）。Master 方案。按次 fal。
- /brand-kit — 儲 Logo 同顏色。
- /library — 作品庫。
- /ugc — 數字人口播。
- /pricing /account — 方案、Tokens、Stripe。
問 AI 只喺首頁以細 Logo 出現；其他頁都冇。`,
  },
  {
    id: "modes-workflows",
    title: "Physical vs concept, image vs video",
    keywords: [
      "physical",
      "concept",
      "service",
      "workflow",
      "image-only",
      "video-only",
      "combined",
      "實體",
      "概念",
      "服務",
      "只出圖",
      "只出片",
      "圖加片",
      "模式",
    ],
    en: `Two promotion modes: physical (you have a real SKU photo) vs concept (service, class, website, idea — no packshot required).
Three workflows in studio: image-only (posts), video-only (clip from upload or text), combined (make stills then animate). Combined storyboard is the usual short TVC path. Studio uses a micro-step wizard (not a dump of every expert field).`,
    zh: `兩種推廣：實體（有真實產品相）vs 概念（服務、課程、網站、想法 — 唔使包裝特寫）。
三種流程：只出圖、只出片、圖→片。圖+片分鏡係常見短 TVC。Studio 用微步驟 wizard，唔會一次攤晒專家欄。`,
  },
  {
    id: "tokens",
    title: "Tokens, free grant, plans",
    keywords: [
      "token",
      "tokens",
      "free",
      "grant",
      "pricing",
      "plan",
      "cost",
      "price",
      "upgrade",
      "topup",
      "額度",
      "额度",
      "免費",
      "免费",
      "收費",
      "價錢",
      "点數",
      "點數",
      "方案",
    ],
    en: `Tokens ≈ pay-per-use. Free signup grant is 500 tokens once (not a monthly refill).
Rough costs: 1 still ≈ 25 tokens; 4 storyboard stills ≈ 104; 8s 480p video ≈ 336; 6s motion (billed 720p H3 table) ≈ 570; 12s MiniMax H3 ≈ 1140; Kling stitch 4×5s ≈ 440.
Free 500 covers about 1 image + 1 short 480p clip — NOT 12s H3 (1140 > 500). Motion poster (~595) and some Kling paths may need a paid plan.
Plans (typical): Free 500 signup / 480p; Standard 3000/mo 720p; Pro 8000/mo 1080p; Master 16000/mo + Pro canvas. Paid can top up 1000 tokens. See /pricing. Estimates only.`,
    zh: `Tokens ≈ 按次計費。免費註冊一次送 500（唔係每月自動再送）。
大約：1 張靜圖 ≈ 25；4 格分鏡 ≈ 104；8 秒 480p ≈ 336；6 秒動態海報（按 720p H3 表）≈ 570；12 秒 MiniMax H3 ≈ 1140；Kling 4×5 秒拼接 ≈ 440。
500 夠大概 1 圖 + 1 條短 480p — 唔夠 12 秒 H3（1140 > 500）。動態海報（約 595）同部分 Kling 路徑可能要付費方案。
方案大約：Free 註冊 500／480p；Standard 每月 3000／720p；Pro 8000／1080p；Master 16000 + Pro 畫布。付費可加購 1000 tokens。詳情 /pricing。數字係估算。`,
  },
  {
    id: "video-engines",
    title: "H3 vs Kling vs Seedance",
    keywords: [
      "h3",
      "minimax",
      "kling",
      "seedance",
      "engine",
      "stitch",
      "one take",
      "fal",
      "引擎",
      "拼接",
      "一鏡",
    ],
    en: `Stills TVC (no reference MP4): MiniMax H3 first (one continuous take, ~12s). If balance < H3 cost but ≥ Kling, studio offers Kling stitch — 4 clips cut together, not one H3 take. Reference-reel jobs use Seedance R2V (reference is the spine); Kling is not used when a reference MP4 is required. Do not promise Lumina subscription pricing. Fast Seedance is not the default quality path.`,
    zh: `冇參考 MP4 嘅分鏡 TVC：先 MiniMax H3（一鏡到底，約 12 秒）。餘額唔夠 H3 但夠 Kling 時，會問你用唔用 Kling 拼接 — 4 段剪埋，唔係一條 H3。有參考 Reel 用 Seedance R2V（參考片係劇本骨架）；要參考片時唔會改走 Kling。唔好承諾 Lumina 訂閱價。Seedance Fast 唔係預設高質路徑。`,
  },
  {
    id: "storyboard",
    title: "Storyboard / TVC stills",
    keywords: [
      "storyboard",
      "tvc",
      "12s",
      "grid",
      "cell",
      "approve",
      "regen",
      "分鏡",
      "分镜",
      "九宮",
      "九宫",
      "格子",
      "批核",
    ],
    en: `Default product/concept TVC is 4 beats (establish → macro/metaphor → orbit → payoff), shown as a 2×2 shot map (九宫格-style review, not always 9 generates). Confirm the grid once, then continue — no tap-every-cell gate. Regen one bad cell — not regen-all. Approval clears if a still changes. Video animates mistakes; fix stills first. Stills-only video is MiniMax H3 first; Kling 5s/10s stitch is silent fallback (no user picker).`,
    zh: `預設產品／概念 TVC 係 4 拍（開場→微距／隱喻→環繞→收束），2×2 分鏡圖（九宮格式檢視，唔等於一定出 9 張）。確認一次就可以繼續，唔使逐格點開先剔。壞格只 regen 嗰一格，唔好全部重出。靜圖一改就要重新批核。片會放大靜圖錯誤，先修好先出片。純靜幀片先 MiniMax H3；Kling 5／10 秒拼接係後備（唔畀用家揀）。`,
  },
  {
    id: "motion-poster",
    title: "Motion poster",
    keywords: [
      "motion",
      "poster",
      "動態海報",
      "动态海报",
      "微運鏡",
      "微运镜",
      "6s",
      "6秒",
    ],
    en: `Motion poster = Jimeng-style 首尾帧: 2 designed poster stills + MiniMax H3 interpolate (~6s). Start = textless designed plate (empty masthead); end = same family with a LARGE headline masthead (product may turn / camera push). H3 morphs Image 1 → Image 2 so product and type move — type pixels come from the end still, never invented letters. Dialects change the beat (3D card / type reveal / parallax / light sweep / liquid / atmosphere). Generate again to try another. Usually 2 images + 1 clip. Audio is MiniMax H3 native.`,
    zh: `動態海報 = 即夢式首尾幀：2 張設計海報靜圖 + MiniMax H3 過渡（約 6 秒）。開頭無字設計版（預留大標題位）；結尾同一場加大標題（產品可以轉面／鏡頭推進）。H3 由 Image 1 過渡到 Image 2，產品同字一齊郁——字係結尾靜圖像素，唔好亂發明新字。動態方言改節奏（3D 卡片／文字揭幕／視差／掃光／液體／氛圍）。再生成會試另一種。通常 2 圖 + 1 短片。聲帶跟 MiniMax H3 原聲。`,
  },
  {
    id: "scene-reel",
    title: "Scene reel (短片製作)",
    keywords: [
      "短片製作",
      "scene reel",
      "creative video",
      "brand video",
      "品牌動態",
      "創意動態",
      "website",
      "instagram",
      "官網",
    ],
    en: `Concept video-only has two cards: 動態海報 vs 短片製作. 短片製作 is a scene reel from the idea. Paste website / IG optionally — Analyze brand feeds mood/colors into the motion prompt (not a separate card). Optional reference MP4 follows camera feel (@Video1); concept can skip a product photo. Physical product + follow-reference still requires the product photo as @Image1.`,
    zh: `概念只要影片得兩張卡：動態海報 vs 短片製作。短片製作係場景短片。官網／IG 選填 — 分析品牌會寫入動態 prompt（唔再獨立一張品牌卡）。參考 MP4 選填跟運鏡（@Video1）；概念可以無產品相。實體產品 + 跟參考短片仍然要產品相當 @Image1。`,
  },
  {
    id: "identity",
    title: "Photo vs name vs reference video",
    keywords: [
      "identity",
      "spine",
      "wardrobe",
      "claim",
      "reference",
      "reel",
      "sku",
      "產品名",
      "参考",
      "參考",
      "對標",
      "对标",
    ],
    en: `If you upload a product photo, that object stays on screen (wardrobe). Product name + headline are the claim (what to sell), not a license to swap the object. A reference MP4 is the spine/screenplay (shot order, places, rhythm). Research/tone notes change voice, not the SKU. If reference prep fails, generation should fail loudly — no silent stills-only fake.`,
    zh: `有產品相就要跟相片物件（wardrobe）。產品名＋標題係賣點（claim），唔可以換成第二樣嘢。參考 MP4 係劇本骨架（鏡頭順序、場地、節奏）。研究／語氣只改口吻，唔改 SKU。參考片準備失敗要大聲報錯，唔可以靜靜改成淨係靜圖。`,
  },
  {
    id: "captions-edit",
    title: "Captions and image editor",
    keywords: [
      "caption",
      "subtitle",
      "burn",
      "bgm",
      "voice",
      "edit-image",
      "inpaint",
      "logo",
      "字幕",
      "燒錄",
      "烧录",
      "配音",
      "修圖",
      "修图",
      "去水印",
    ],
    en: `/captions: import any MP4 → edit timed lines → optional BGM/voice → burn. Does not regenerate the video. /edit-image: upload or library → Clean (inpaint) → Design (text/logo layers) → Export. Ask-AI is hidden on both pages; open them from the nav or tell the landing assistant you want captions / retouch.`,
    zh: `/captions：匯入任何 MP4 → 改時間軸字幕 → 可加 BGM／配音 → 燒錄。唔會重新生成條片。/edit-image：上傳或作品庫 → 清除（inpaint）→ 排版（字／Logo）→ 匯出。兩頁都冇問 AI；用導航打開，或喺首頁問 AI 話你要字幕／修圖。`,
  },
  {
    id: "pro-tools",
    title: "Pro canvas, brand kit, library, UGC",
    keywords: [
      "pro",
      "canvas",
      "node",
      "brand-kit",
      "library",
      "ugc",
      "presenter",
      "畫布",
      "画布",
      "節點",
      "节点",
      "品牌",
      "作品庫",
      "作品库",
      "口播",
    ],
    en: `/pro is a node canvas (upload → Nano Banana image → Seedance video), pay-per-use fal, Master plan — not Lumina subscription pricing. /brand-kit saves logo/colors for stills. /library stores outputs; reopen in editor or captions. /ugc is a talking presenter, separate from storyboard TVC.`,
    zh: `/pro 係節點畫布（上傳→ Nano Banana 圖→ Seedance 片），按次 fal，Master 方案 — 唔係 Lumina 訂閱價。/brand-kit 存 Logo／色。/library 存成品，可再開去修圖或字幕。/ugc 係口播數字人，同分鏡 TVC 分開。`,
  },
  {
    id: "how-to-start",
    title: "How to start making something",
    keywords: [
      "start",
      "begin",
      "open",
      "wizard",
      "template",
      "how to",
      "教我",
      "點開始",
      "怎么开始",
      "入去",
      "開始",
      "开始",
    ],
    en: `Sign in → /start (physical vs concept) or a landing template card → /studio. Fill the micro-steps, generate stills, review, then video. For captions/retouch after export, use /captions or /edit-image. Do not tell users to click homepage “finishable video recipe” cards — they are hidden. Deep-links like /studio?recipe= still work if someone has the URL.`,
    zh: `登入 → /start（實體 vs 概念）或首頁模板卡 → /studio。跟微步驟、出靜圖、檢視、再出片。之後字幕／修圖用 /captions 或 /edit-image。唔好叫用戶撳首頁「可完成影片配方」卡 — 而家隱藏。有人有 /studio?recipe= 深鏈仍然得。`,
  },
  {
    id: "safety-spa",
    title: "Safety filter on stills",
    keywords: [
      "blocked",
      "safety",
      "policy",
      "spa",
      "moderation",
      "filter",
      "封鎖",
      "封锁",
      "審核",
      "审核",
      "敏感",
    ],
    en: `If a storyboard cell is blocked by the safety filter, studio retries the same scene/SKU without faces or brand text. Spa/beauty fallback stills only apply when the brief itself is spa/skincare. A jewelry or gadget ad must not become a spa bed. After a hard block, tap regen on that cell only.`,
    zh: `分鏡其中一格被安全過濾擋住，會用同一場／同一產品再試（唔加人面、唔加品牌字）。Spa／美容後備圖只適用於 brief 本身係 spa／護膚。首飾或零件廣告唔可以變成 SPA 床。徹底擋死就只 regen 嗰一格。`,
  },
];

const CORE_IDS = ["what-is", "pages", "how-to-start"] as const;

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const latin = lower.match(/[a-z0-9]+/g) ?? [];
  const cjk = [...lower.matchAll(/[\u4e00-\u9fff]/g)].map((m) => m[0]!);
  const bigrams: string[] = [];
  for (let i = 0; i < cjk.length - 1; i++) bigrams.push(`${cjk[i]}${cjk[i + 1]}`);
  return [...latin, ...cjk, ...bigrams];
}

export function scoreKnowledgeChunk(query: string, chunk: AssistantKnowledgeChunk): number {
  const q = new Set(tokenize(`${query} ${query}`));
  let score = 0;
  for (const kw of chunk.keywords) {
    const k = kw.toLowerCase();
    if (q.has(k) || query.toLowerCase().includes(k)) score += 4;
    for (const t of tokenize(k)) {
      if (q.has(t)) score += 2;
    }
  }
  for (const t of tokenize(`${chunk.title} ${chunk.en} ${chunk.zh}`)) {
    if (t.length >= 2 && q.has(t)) score += 1;
  }
  return score;
}

export function retrieveAssistantKnowledge(
  query: string,
  opts?: { locale?: KnowledgeLocale; limit?: number; alwaysCore?: boolean },
): AssistantKnowledgeChunk[] {
  const limit = Math.max(2, Math.min(8, opts?.limit ?? 5));
  const ranked = [...ASSISTANT_KNOWLEDGE]
    .map((chunk) => ({ chunk, score: scoreKnowledgeChunk(query, chunk) }))
    .sort((a, b) => b.score - a.score);

  const picked: AssistantKnowledgeChunk[] = [];
  const seen = new Set<string>();

  if (opts?.alwaysCore !== false) {
    for (const id of CORE_IDS) {
      const chunk = ASSISTANT_KNOWLEDGE.find((c) => c.id === id);
      if (chunk && !seen.has(chunk.id)) {
        picked.push(chunk);
        seen.add(chunk.id);
      }
    }
  }

  for (const row of ranked) {
    if (picked.length >= limit) break;
    if (row.score <= 0 && seen.size >= CORE_IDS.length) continue;
    if (seen.has(row.chunk.id)) continue;
    picked.push(row.chunk);
    seen.add(row.chunk.id);
  }

  return picked.slice(0, limit);
}

export function formatKnowledgeForPrompt(
  chunks: AssistantKnowledgeChunk[],
  locale: KnowledgeLocale,
): string {
  if (chunks.length === 0) return "";
  const body = chunks
    .map((c) => `### ${c.title}\n${locale === "zh" ? c.zh : c.en}`)
    .join("\n\n");
  return `【Product knowledge — answer ONLY from this + user context. If missing, say you don't know. Do not invent buttons, prices, engines, or hidden homepage recipe cards.】\n${body}`;
}

export function knowledgeLocaleFromApp(locale: string): KnowledgeLocale {
  return locale === "en" ? "en" : "zh";
}
