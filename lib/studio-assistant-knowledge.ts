/**
 * Curated product knowledge for the in-app assistant.
 * Not the Git repo — shipped product only. Retrieve-on-ask; never invent features.
 */

export type KnowledgeLocale = "en" | "zh" | "zh-cn" | "zh-tw";

export type AssistantKnowledgeChunk = {
  id: string;
  title: string;
  keywords: string[];
  en: string;
  zh: string;
  zhCn?: string;
  zhTw?: string;
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
    en: `Alchemy AI Lab is a prompt-free marketing studio. You describe a product or idea (or upload a photo); AI plans the brief; then you generate social images and short videos. You do not write model prompts. Pay with tokens (signup grant + paid plans).`,
    zh: `Alchemy AI Lab 係免寫 Prompt 嘅行銷工作室。你講產品／概念或上傳相片，AI 幫手規劃，再出社交圖同短片。唔使自己寫模型 Prompt。用 Tokens 計費（註冊贈送 + 付費方案）。`,
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
      "ultra",
      "library",
      "brand",
      "ugc",
      "pricing",
    ],
    en: `Main places:
- / landing — marketing site, template cards, pricing teaser. Finishable “video recipe” cards are hidden for now.
- /start — pick physical product vs concept/service, then enter studio.
- /studio — guided wizard (default simple mode). Studio coach assistant panel is ON here (step-by-step help).
- /captions — burn subtitles / BGM / voice on any MP4. No assistant panel.
- /edit-image — clean, add text/logo, export. No assistant panel.
- /ultra — Ultra canvas (Upload → image → video). Master plan. Pay-per-use tokens. No assistant panel.
- /brand-kit — save logo & colors.
- /library — past generations.
- /ugc — talking presenter.
- /pricing /account — plans, tokens, Stripe.
Ask-AI launcher (small logo) is on the landing page. The same coach also opens inside /studio. It is hidden on captions, edit-image, ultra, brand-kit, pricing, and other tool pages.`,
    zh: `主要頁面：
- / 首頁 — 介紹、模板卡、收費預覽。首頁「可完成影片配方」卡而家隱藏。
- /start — 揀實體產品 vs 概念／服務，再入工作室。
- /studio — 引導式 wizard（預設簡單模式）。呢頁有工作室導覽助理面板。
- /captions — 任何 MP4 燒字幕／BGM／配音。冇助理面板。
- /edit-image — 清雜物、加字／Logo、匯出。冇助理面板。
- /ultra — Ultra 畫布（上傳→圖→片）。Master 方案。按次 token。冇助理面板。
- /brand-kit — 儲 Logo 同顏色。
- /library — 作品庫。
- /ugc — 數字人口播。
- /pricing /account — 方案、Tokens、Stripe。
問 AI 細 Logo 喺首頁；/studio 入面都有同款導覽助理。/captions、/edit-image、/ultra 等工具頁冇。`,
    zhCn: `主要页面：
- / 首页 — 介绍、模板卡、收费预览。首页「可完成影片配方」卡已隐藏。
- /start — 选实体产品 vs 概念／服务，再进工作室。
- /studio — 引导式 wizard（默认简单模式）。此页有工作室导览助理面板。
- /captions — 任何 MP4 烧字幕／BGM／配音。无助理面板。
- /edit-image — 清杂物、加字／Logo、导出。无助理面板。
- /ultra — Ultra 画布（上传→图→片）。Master 方案。按次 token。无助理面板。
- /brand-kit — 存 Logo 与颜色。
- /library — 作品库。
- /ugc — 数字人口播。
- /pricing /account — 方案、Tokens、Stripe。
问 AI 小 Logo 在首页；/studio 内也有同款导览助理。/captions、/edit-image、/ultra 等工具页没有。`,
    zhTw: `主要頁面：
- / 首頁 — 介紹、模板卡、收費預覽。首頁「可完成影片配方」卡已隱藏。
- /start — 選實體產品 vs 概念／服務，再進工作室。
- /studio — 引導式 wizard（預設簡單模式）。此頁有工作室導覽助理面板。
- /captions — 任何 MP4 燒字幕／BGM／配音。無助理面板。
- /edit-image — 清雜物、加字／Logo、匯出。無助理面板。
- /ultra — Ultra 畫布（上傳→圖→片）。Master 方案。按次 token。無助理面板。
- /brand-kit — 儲 Logo 與顏色。
- /library — 作品庫。
- /ugc — 數位人口播。
- /pricing /account — 方案、Tokens、Stripe。
問 AI 小 Logo 在首頁；/studio 內也有同款導覽助理。/captions、/edit-image、/ultra 等工具頁沒有。`,
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
    en: `Tokens ≈ pay-per-use. Free signup grant is 300 tokens once (not a monthly refill). When balance is low, Free users can start a 7-day monthly Pro trial (card required) for +700 tokens + Pro features; after 7 days Pro is charged unless canceled in Account. All tokens expire 6 months after grant (oldest first).
Rough costs: 1 still ≈ 65 tokens; 4 storyboard stills ≈ 260; 8s video ≈ 328 at 480p (Free) or ≈ 520 at 720p; 6s motion poster ≈ 390; 12s at 480p ≈ 492; stitched fallback 4×5s ≈ 1136.
300 is for trying the workflow; bigger video jobs need the Pro trial or a paid plan.
Plans (typical): Free 300 signup / 480p; Light 3000/mo 480p; Standard 8000/mo 720p; Pro 16000/mo 1080p; Master 28000/mo + Ultra canvas; Enterprise 40000 + 3 seats. Paid can top up 1000 tokens. See /pricing. Estimates only.`,
    zh: `Tokens ≈ 按次計費。免費註冊一次送 300（唔係每月自動再送）。餘額不足可開 7 日 Pro 試用（要綁卡）多送 700 + Pro 功能；7 日後扣月費 Pro，可喺帳戶取消。所有 Token 由發放日起 6 個月有效（先用舊嘅）。
大約：1 張靜圖 ≈ 65；4 格分鏡 ≈ 260；8 秒影片 Free 480p ≈ 328，Standard 720p ≈ 520；6 秒動態海報 ≈ 390（720p）；12 秒 480p ≈ 492；拼接後備 4×5 秒 ≈ 1136。
300 用來試流程；大片要試用或付費方案。
方案大約：Free 註冊 300／480p；Light 每月 3000／480p；Standard 8000／720p；Pro 16000／1080p；Master 28000 + Ultra 畫布；Enterprise 40000 + 3 席。付費可加購 1000 tokens。詳情 /pricing。數字係估算。`,
    zhCn: `Tokens ≈ 按次计费。免费注册一次送 300（不是每月自动再送）。余额不足可开 7 日 Pro 试用（要绑卡）多送 700 + Pro 功能；7 日后扣月费 Pro，可在账户取消。所有 Token 自发放日起 6 个月有效（先用旧的）。
大约：1 张静图 ≈ 65；4 格分镜 ≈ 260；8 秒视频 Free 480p ≈ 328，Standard 720p ≈ 520；6 秒动态海报 ≈ 390（720p）；12 秒 480p ≈ 492；拼接后备 4×5 秒 ≈ 1136。
300 用来试流程；大片要试用或付费方案。
方案大约：Free 注册 300／480p；Light 每月 3000／480p；Standard 8000／720p；Pro 16000／1080p；Master 28000 + Ultra 画布；Enterprise 40000 + 3 席。付费可加购 1000 tokens。详情 /pricing。数字是估算。`,
  },
  {
    id: "plan-gates",
    title: "Plan feature gates",
    keywords: [
      "gate",
      "minimum plan",
      "master",
      "standard",
      "pro plan",
      "upgrade",
      "storyboard",
      "research",
      "carousel",
      "門檻",
      "门槛",
      "方案限制",
      "需要什麼方案",
    ],
    en: `Feature gates (minimum plan): Ultra canvas /pro_canvas → Master; storyboard multi-scene TVC → Pro; platform content research & teaching carousel → Standard; 720p video → Standard; 1080p → Pro. Free tier: 480p, 300 signup tokens. Always mention the gate when routing to a locked feature.`,
    zh: `功能門檻（最低方案）：Ultra 畫布 → Master；分鏡 storyboard TVC → Pro；平台內容研究同教學輪播 → Standard；720p 影片 → Standard；1080p → Pro。Free：480p、註冊 300 tokens。帶去鎖定功能時要講明門檻。`,
    zhCn: `功能门槛（最低方案）：Ultra 画布 → Master；分镜 storyboard TVC → Pro；平台内容研究和教学轮播 → Standard；720p 视频 → Standard；1080p → Pro。Free：480p、注册 300 tokens。带去锁定功能时要说明门槛。`,
  },
  {
    id: "video-engines",
    title: "Single clip vs stitch vs reference reel",
    keywords: [
      "h3",
      "kling",
      "minimax",
      "seedance",
      "stitched fallback",
      "reference-reel",
      "engine",
      "stitch",
      "one take",
      "引擎",
      "拼接",
      "一鏡",
    ],
    en: `Stills TVC (no reference MP4): single-clip video first (one continuous take, ~12s). If balance < single-clip cost but ≥ stitch cost, studio offers stitched fallback — 4 clips cut together, not one continuous take. Reference-reel jobs use your uploaded clip as the spine; stitch is not used when a reference MP4 is required. Do not promise Lumina subscription pricing.`,
    zh: `冇參考 MP4 嘅分鏡 TVC：先單鏡出片（一鏡到底，約 12 秒）。餘額唔夠單鏡但夠拼接時，會問你用唔用拼接後備 — 4 段剪埋，唔係一鏡到底。有參考 Reel 用參考片模式（參考片係劇本骨架）；要參考片時唔會改走拼接。唔好承諾 Lumina 訂閱價。`,
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
    en: `Default product/concept TVC is 4 beats (establish → macro/metaphor → orbit → payoff), shown as a 2×2 shot map (九宫格-style review, not always 9 generates). Confirm the grid once, then continue — no tap-every-cell gate. Regen one bad cell — not regen-all. Approval clears if a still changes. Video animates mistakes; fix stills first. Stills-only video is single-clip first; 5s/10s stitch is silent fallback (no user picker).`,
    zh: `預設產品／概念 TVC 係 4 拍（開場→微距／隱喻→環繞→收束），2×2 分鏡圖（九宮格式檢視，唔等於一定出 9 張）。確認一次就可以繼續，唔使逐格點開先剔。壞格只 regen 嗰一格，唔好全部重出。靜圖一改就要重新批核。片會放大靜圖錯誤，先修好先出片。純靜幀片先單鏡出片；5／10 秒拼接係後備（唔畀用家揀）。`,
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
    en: `Motion poster = start→end morph: 2 designed poster stills + one short video (~6s). Start = textless designed plate (empty masthead); end = same family with a LARGE headline masthead (product may turn / camera push). Video morphs Image 1 → Image 2 so product and type move — type pixels come from the end still, never invented letters. Dialects change the beat (3D card / type reveal / parallax / light sweep / liquid / atmosphere). Generate again to try another. Usually 2 images + 1 clip.`,
    zh: `動態海報 = 首尾幀：2 張設計海報靜圖 + 單鏡過渡（約 6 秒）。開頭無字設計版（預留大標題位）；結尾同一場加大標題（產品可以轉面／鏡頭推進）。影片由 Image 1 過渡到 Image 2，產品同字一齊郁——字係結尾靜圖像素，唔好亂發明新字。動態方言改節奏（3D 卡片／文字揭幕／視差／掃光／液體／氛圍）。再生成會試另一種。通常 2 圖 + 1 短片。聲帶跟影片原聲。`,
  },
  {
    id: "blockbuster",
    title: "Blockbuster entrance",
    keywords: [
      "blockbuster",
      "大片",
      "出場",
      "出场",
      "truck",
      "overpass",
      "packaging",
      "9s",
      "9秒",
    ],
    en: `Blockbuster entrance is a 9s ONE-TAKE video (not 九宫格 stitch). Upload product + packaging box + optional scene first frame (truck/overpass). Timed beats: truck → box hits overpass → floating boxes → product rises. Concept mode uses logo/mascot instead of a SKU. Single-clip video.`,
    zh: `大片級出場係 9 秒單鏡（唔係九宮格拼接）。上傳產品 + 包裝盒 + 可選場景首幀（貨車／天橋）。節奏：貨車→紙箱撞天橋→漂浮紙箱→產品升起。概念模式用 Logo／吉祥物代替產品。單鏡引擎出片。`,
  },
  {
    id: "h3-shot-recipes",
    title: "One-take shot recipes",
    keywords: [
      "ecom orbit",
      "電商環繞",
      "电商环绕",
      "object lock",
      "物體鎖定",
      "物体锁定",
      "macro snap",
      "微距",
      "luxury tabletop",
      "奢侈品",
      "beauty mv",
      "美妝",
      "美妆",
      "imitate",
      "仿拍",
      "c4d",
      "C4D",
      "动态视觉",
      "動態視覺",
    ],
    en: `Nine one-take recipes: e-com orbit, object-locked camera, macro food physics, luxury tabletop+hand, beauty/MV, imitate-this-ad (product still + reference MP4), neon-on-real (real footage + glowing neon drawings), food bullet-time (lifestyle food still with dramatic frozen burst → camera orbit), and C4D motion (black-void brand MG → abstract materials → product reveal). Recipe owns the prompt — not a 九宫格 stitch.`,
    zh: `九條單鏡配方：電商環繞、物體鎖定運鏡、微距物理、奢侈品桌面+手、美妝/MV 一鏡、仿拍廣告（產品圖+參考 MP4）、霓虹疊實景（真實影片+發光霓虹線稿）、美食子彈時間（打卡圖飛濺定格→鏡頭環繞）、C4D 動態視覺（黑場品牌開場→抽象材質→產品揭幕）。配方自己寫 prompt，唔係九宮格拼接。`,
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
    id: "ultra-tools",
    title: "Ultra canvas, brand kit, library, UGC",
    keywords: [
      "ultra",
      "ultra-canvas",
      "ultra canvas",
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
    en: `/ultra is the Ultra canvas — a node workflow for power users: upload/library → AI image (pro controls: aspect, lighting, background) → video or text-to-video nodes, optional lighting/background/grade modifier nodes, brand kit @brand refs, script→scene pipelines, audio BGM, splice, save/load boards, templates, undo/redo. Pay-per-use tokens on Master plan — not Lumina subscription pricing. Export outputs to /library; open finished clips in /captions. /brand-kit saves logo/colors. /ugc is talking presenter, separate from storyboard TVC.`,
    zh: `/ultra 係 Ultra 畫布 — 節點工作流俾進階用戶：上傳／作品庫→ AI 圖（專業控制：比例、燈光、背景）→ 片或文字生片節點，可加燈光／背景／風格修飾節點、品牌 @brand 引用、劇本→分鏡流水線、音訊 BGM、拼接、儲存／載入畫布、模板、撤銷／重做。Master 方案按次 token — 唔係 Lumina 訂閱價。成品可存 /library，再去 /captions。/brand-kit 存 Logo／色。/ugc 係口播，同分鏡 TVC 分開。`,
    zhCn: `/ultra 是 Ultra 画布 — 节点工作流给进阶用户：上传／作品库→ AI 图（专业控制：比例、灯光、背景）→ 视频或文字生视频节点，可加灯光／背景／风格修饰节点、品牌 @brand 引用、剧本→分镜流水线、音频 BGM、拼接、保存／加载画布、模板、撤销／重做。Master 方案按次 token — 不是 Lumina 订阅价。成品可存 /library，再去 /captions。/brand-kit 存 Logo／色。/ugc 是口播，与分镜 TVC 分开。`,
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
    en: `Sign in → /start (physical vs concept) or a landing showcase card → /studio. Fill the micro-steps, generate stills, review, then video. For captions/retouch after export, use /captions or /edit-image. Homepage showcase cards link to /start (not direct /studio). Hidden finishable recipe cards are not on the homepage. Deep-links like /studio?recipe= still work if someone has the URL.`,
    zh: `登入 → /start（實體 vs 概念）或首頁展示卡 → /studio。跟微步驟、出靜圖、檢視、再出片。之後字幕／修圖用 /captions 或 /edit-image。首頁展示卡去 /start（唔係直接 /studio）。隱藏嘅 finishable recipe 卡唔喺首頁。有人有 /studio?recipe= 深鏈仍然得。`,
    zhCn: `登录 → /start（实体 vs 概念）或首页展示卡 → /studio。跟微步骤、出静图、检视、再出片。之后字幕／修图用 /captions 或 /edit-image。首页展示卡去 /start（不是直接 /studio）。隐藏的 finishable recipe 卡不在首页。有人有 /studio?recipe= 深链仍然可用。`,
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
    .map((c) => {
      const text =
        locale === "en"
          ? c.en
          : locale === "zh-cn"
            ? (c.zhCn ?? c.zh)
            : locale === "zh-tw"
              ? (c.zhTw ?? c.zhCn ?? c.zh)
              : c.zh;
      return `### ${c.title}\n${text}`;
    })
    .join("\n\n");
  return `【Product knowledge — answer ONLY from this + user context. If missing, say you don't know. Do not invent buttons, prices, engines, or hidden homepage recipe cards.】\n${body}`;
}

export function knowledgeLocaleFromApp(locale: string): KnowledgeLocale {
  if (locale === "en") return "en";
  if (locale === "zh-cn") return "zh-cn";
  if (locale === "zh-tw") return "zh-tw";
  return "zh";
}
