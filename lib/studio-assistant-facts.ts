import type { Locale } from "@/lib/i18n";
import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { formatCoachChecklistForPrompt } from "@/lib/studio-assistant-coach";
import type { AssistantSurface, StudioAssistantSnapshot } from "@/lib/studio-assistant-types";

function langLine(_locale: Locale): string {
  return "Reply in the SAME language as the user's latest message (English → English; 中文 → 繁體 or 简体 per locale setting if user wrote Chinese).";
}

function replyFormatRule(locale: Locale): string {
  const captions =
    locale === "en"
      ? "[Caption studio](/captions)"
      : "[字幕工具](/captions)";
  return [
    "【Reply style — CRITICAL】",
    "1. User's LATEST message defines the campaign (e.g. World Cup new feature). That topic wins — never substitute crystals, fortune reports, or default homepage products unless THEY asked.",
    "2. Homepage excerpt = background facts only.",
    "3. Match reply language to the user's latest message.",
    "4. STEP-BY-STEP: ONLY Step 1 — must match 【Coach】 block (path + task id).",
    "   - physical product / storyboard / brand-fit / website-launch / image-only / video-only / captions / pro — each has different required fields",
    "   - URL field empty → paste in 品牌網站 first; never analyze brand before that",
    "   - storyboard (physical): product name + storyboard brief + photo + scene images",
    "   - storyboard (concept / content research reel): concept or headline + reference reel → scene stills → video; no product photo required",
    "   - brand-fit: analyze brand BEFORE generate image",
    "   - In studio: no landing-only links (setup-website-reel, open-*-studio)",
    "5. Max ONE action link. Copy EXACTLY — never invent IDs:",
    "   English landing: [Set up & open studio](studio-action:setup-website-reel)",
    "   中文 landing: [一鍵設定並進入工作室](studio-action:setup-website-reel)",
    "   In studio + URL filled: [Analyze brand](studio-action:analyze-brand) / [分析品牌](studio-action:analyze-brand)",
    "6. If you mention a button, use exact markdown from above.",
    `- Captions: ${captions}`,
    "7. Mood scene must match THEIR campaign (World Cup → sports/fans/match night, NOT generic crystal b-roll).",
    "8. Plain text; no **.",
  ].join("\n");
}

export function getStudioAssistantFacts(locale: Locale): string {
  const isCn = locale === "zh-cn";
  const isZh = locale === "zh" || isCn;

  if (isZh) {
    return `
【Alchemy Studio 工作室說明 — 請優先依此回答，勿捏造功能】

一、兩種推廣模式（/start 選擇）
- physical（實體產品）：有真實商品可拍／上傳。
- concept（服務／網站／概念）：無實體 SKU — 品牌、網站、課程、會員等。

二、三種工作流（Setup 可選）
- image-only：只出圖（社交帖、海報）。
- video-only：只出片（需上傳參考圖或文字成片）。
- combined：圖 → 片（最常見 Reel 流程）。

三、步驟
- setup →（image）→（video）→ done。依工作流跳過 image 或 video。
- 進階：/pro 節點畫布；/captions 獨立字幕燒錄（任何 MP4 都可用）。

四、常見視覺風格（擇要）
- product / model-wear：實體商品圖。
- storyboard-video：多場景故事板 → 拼接影片。實體：產品名 + 相 + 簡述；概念／內容研究 Reel：概念或 headline + 參考片節奏 → 場景圖（唔使產品相）。
- concept-cinematic：概念電影感 Reel（關鍵幀 → Seedance 8 秒）；單場景或 3 場景拼接（非內容研究 Reel 預設）。
- creative-video / brand-video：概念或品牌文字成片。
- website-launch：網站／App 上線 **靜態** mockup 圖（image-only，非影片 UI 克隆）。
- brand-fit / brand-campaign：需先「分析品牌」網站或社交。

五、網站推廣（重要限制）
- 貼網址不會自動抓圖進影片。請用 Setup「分析品牌」按鈕（/api/analyze-brand）填寫品牌欄位。
- concept-cinematic 的畫面是 **電影感場景**，刻意 **不含** 真實網站 UI、logo、海報文字；賣點放 **字幕＋配音**（ad pack）。
- 若要在片裡列出多個功能：用 3 場景拼接，或螢幕錄製網站後到 /captions 加字幕。
- 8 秒快速測試：concept + combined + concept-cinematic 單場景 + 480p fast + 字幕配音 BGM。

六、實體產品
- 上傳 product photo；可選 storyboard 或 AI video assistant（多圖參考成片）。
- 參考廣告可分析風格（analyze reference），注意市場繁簡與 HK 繁體設定。

七、Setup 實用按鈕
- 「分析概念」：DeepSeek 規劃概念欄位；有上傳圖時會做 vision 筆記（文字進 prompt，非像素貼圖）。
- 「分析品牌」：抓網站文字 → brand profile → 填 headline 等（cinematic 規劃本身不讀 brandProfile，但 ad pack 會用）。
- 選 cinematic 後再分析品牌，避免先選 brand 風格再切換導致 profile 被清掉。

八、費用提示
- 出圖約 USD 0.04–0.08；8 秒 Seedance fast 480p 約 USD 1.5 左右。按次計費。

九、錯誤時
- 若使用者貼錯誤訊息，用白話解釋並給下一步（補欄位、重試、檢查登入與 API key）。
`.trim();
  }

  return `
【Alchemy Studio facts — follow these; do not invent features】

1) Promotion modes (/start): physical (real product photo) vs concept (service, website, offer).

2) Workflows: image-only | video-only | combined (image → video Reel).

3) Steps: setup → image? → video? → done. Also /pro canvas and /captions for burn-in subtitles on any MP4.

4) Key visual styles: product, storyboard-video (physical product OR concept/content-research reel → scene stills → video), concept-cinematic (cinematic keyframe → 8s Seedance), creative-video, brand-video, website-launch (static launch mockup image only), brand-fit (needs analyze brand).

5) Website promos: pasting a URL does nothing until user clicks Analyze brand. concept-cinematic shows a mood scene — NOT real site UI; put features in captions/voiceover. Multi-scene stitch or screen record + /captions for feature tours.

6) Physical: upload product photo; storyboard or AI video assistant paths. Concept storyboard from content research uses reference reel analysis — not direct R2V.

7) Analyze concept / Analyze brand buttons in Setup — vision note is text-only for cinematic keyframes.

8) Pay-per-use fal pricing; 8s fast ~$1.5 ballpark.

9) Explain errors plainly with next steps.
`.trim();
}

export function formatSnapshotForPrompt(
  snapshot: StudioAssistantSnapshot,
  locale: Locale,
): string {
  const stepLabels =
    locale === "zh-cn"
      ? { setup: "设置", image: "出图", video: "出片", done: "完成" }
      : locale === "zh"
        ? { setup: "設定", image: "出圖", video: "出片", done: "完成" }
        : { setup: "setup", image: "image", video: "video", done: "done" };

  return [
    "【User's current context】",
    `surface: ${snapshot.surface} (landing=start page, studio=in wizard)`,
    snapshot.promotionMode
      ? `promotionMode: ${snapshot.promotionMode}`
      : "promotionMode: not chosen yet",
    `workflowMode: ${snapshot.workflowMode}`,
    `step: ${stepLabels[snapshot.stepKey]} (${snapshot.stepKey})`,
    `visualStyleId: ${snapshot.visualStyleId}`,
    `market: ${snapshot.promptMarket}`,
    snapshot.product ? `product: ${snapshot.product}` : "",
    snapshot.business ? `business: ${snapshot.business}` : "",
    snapshot.headline ? `headline: ${snapshot.headline}` : "",
    snapshot.subline ? `subline: ${snapshot.subline.slice(0, 200)}` : "",
    snapshot.offer ? `offer: ${snapshot.offer}` : "",
    snapshot.conceptIdea ? `conceptIdea: ${snapshot.conceptIdea.slice(0, 300)}` : "",
    snapshot.creativeVideoBrief
      ? `creativeVideoBrief: ${snapshot.creativeVideoBrief.slice(0, 400)}`
      : "",
    snapshot.brandWebsiteUrl ? `brandWebsiteUrl: ${snapshot.brandWebsiteUrl}` : "",
    `hasBrandProfile: ${snapshot.hasBrandProfile}`,
    `hasProductPhoto: ${snapshot.hasProductPhoto}`,
    snapshot.hasStyleReference !== undefined
      ? `hasStyleReference: ${snapshot.hasStyleReference}`
      : "",
    snapshot.imageCreativeMode ? `imageCreativeMode: ${snapshot.imageCreativeMode}` : "",
    snapshot.imageOutputMode ? `imageOutputMode: ${snapshot.imageOutputMode}` : "",
    snapshot.coachAck?.length ? `coachAck: ${snapshot.coachAck.join(", ")}` : "",
    `hasKeyframe: ${snapshot.hasKeyframe}`,
    `hasVideo: ${snapshot.hasVideo}`,
    `cinematicSceneCount: ${snapshot.cinematicSceneCount}`,
    `voiceoverEnabled: ${snapshot.voiceoverEnabled}`,
    `captionBurnEnabled: ${snapshot.captionBurnEnabled}`,
    snapshot.error ? `lastError: ${snapshot.error.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStudioAssistantSystemPrompt(
  locale: Locale,
  snapshot: StudioAssistantSnapshot,
  extras?: {
    detectedUrl?: string;
    sitePreview?: string;
    intent?: StudioAssistantIntent;
  },
): string {
  const name = locale === "zh-cn" ? "小炼" : locale === "zh" ? "小煉" : "Alchemy guide";
  const facts = getStudioAssistantFacts(locale);
  const stateBlock = formatSnapshotForPrompt(snapshot, locale);
  const siteBlock =
    extras?.detectedUrl && extras.sitePreview
      ? [
          "【Website the user mentioned】",
          `URL: ${extras.detectedUrl}`,
          `Homepage text excerpt (for context only):`,
          extras.sitePreview.slice(0, 1500),
        ].join("\n")
      : extras?.detectedUrl
        ? `【Website URL from user】: ${extras.detectedUrl}`
        : "";

  return [
    `You are "${name}", the friendly Alchemy Studio assistant — warm, specific, practical.`,
    "You are a step-by-step coach. Never dump menus. Never ignore what the user said they want to promote.",
    langLine(locale),
    replyFormatRule(locale),
    facts,
    siteBlock,
    stateBlock,
    formatCoachChecklistForPrompt(snapshot, locale),
    extras?.intent ? `Detected intent (weak hint only): ${extras.intent}` : "",
    snapshot.surface !== "studio"
      ? [
          "User is NOT in studio yet. Step 1 button MUST match what they asked for:",
          "- Real product / product photo / image post → [Open product image studio](studio-action:open-physical-studio) — NOT setup-website-reel.",
          "- Website / service / concept video → setup-website-reel or open-concept-studio.",
          "- Static website launch image → website-launch-image.",
          "Never route a physical product image post to concept 8s Reel.",
        ].join("\n")
      : "User is IN studio — Step 1 should be a field to fill or a button on the current step.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
