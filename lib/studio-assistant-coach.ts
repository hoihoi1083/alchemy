import type { Locale } from "@/lib/i18n";
import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { inferPhysicalProductName, inferProductCalled } from "@/lib/studio-assistant-product-intent";
import {
  coachRepeatPreamble,
  isCoachRepeatTurn,
} from "@/lib/studio-assistant-coach-completion";
import { detectStudioCoachMode, coachStepPrefix } from "@/lib/studio-assistant-coach-modes";
import type { StudioAssistantMessage, StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import {
  type CoachTaskKind,
  getNextStudioCoachTask,
  pathLabel,
} from "@/lib/studio-assistant-coach-profile";
import {
  coachContinueOnSetup,
  coachContinueSetupShort,
  coachModeLine,
  coachPathLine,
  coachUsesEnglish,
  coachZh,
} from "@/lib/studio-assistant-coach-copy";
import { isCoachContinueReply } from "@/lib/studio-assistant-continue";
import { isStoryboardVideoStyle } from "@/lib/visual-styles";

export type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
export { getNextStudioCoachTask, pathLabel } from "@/lib/studio-assistant-coach-profile";

export function extractCampaignHint(messages: StudioAssistantMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const t = m.content.trim();
    if (t.length < 8) continue;
    if (/^(下一步|next|continue|繼續|继续|好|好了|ok|done|教我|how)/i.test(t)) continue;
    return t.slice(0, 500);
  }
  return "";
}

function siteLabel(url?: string): string {
  if (!url?.trim()) return "your site";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`)
      .hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? "your site";
  }
}

function suggestConceptPaste(hint: string, url?: string): string {
  const site = siteLabel(url);
  if (/world cup|世界盃|世界杯|wc\b/i.test(hint)) {
    return [
      `推廣 ${site} 網站內的「世界盃專區」新功能。`,
      "目標：香港球迷，賽前想快速睇當日運勢同支持球隊嘅啟示。",
      "專區賣點：1) 每日世界盃運勢預測；2) 開運水晶推薦；3) 賽前即時互動。",
      "畫面：熱血球迷氣氛；賣點放字幕同配音，唔係網站 UI 截圖。",
    ].join(" ");
  }
  if (hint.trim()) {
    return `推廣重點：${hint.replace(/\s+/g, " ").trim()}。具體功能名寫喺字幕／配音；畫面用電影感或品牌場景。`;
  }
  return "Describe feature name, audience, and 2–3 selling points for captions/voiceover.";
}

export { coachUsesEnglish } from "@/lib/studio-assistant-coach-copy";

export function actionLinkForTask(task: CoachTaskKind, en: boolean): string | null {
  switch (task) {
    case "route-concept-studio":
      return en
        ? "[Open concept studio](studio-action:open-concept-studio)"
        : "[開啟概念工作室](studio-action:open-concept-studio)";
    case "route-website-reel":
      return en
        ? "[Set up & open studio](studio-action:setup-website-reel)"
        : "[一鍵設定並進入工作室](studio-action:setup-website-reel)";
    case "route-website-image":
      return en
        ? "[Website launch image](studio-action:website-launch-image)"
        : "[網站上線靜態圖](studio-action:website-launch-image)";
    case "route-cinematic-stitch":
      // Stitch deferred — same CTA as single 8s cinematic.
      return en
        ? "[8s cinematic reel](studio-action:apply-8s-recipe)"
        : "[8秒電影感短片](studio-action:apply-8s-recipe)";
    case "route-physical-product":
      return en
        ? "[Open physical studio](studio-action:open-physical-studio)"
        : "[開啟實體工作室](studio-action:open-physical-studio)";
    case "route-physical-image-post":
      return en
        ? "[Open product image studio](studio-action:open-physical-studio)"
        : "[開啟產品出圖工作室](studio-action:open-physical-studio)";
    case "route-reference-ad":
      return en
        ? "[Open reference layout studio](studio-action:open-reference-ad-studio)"
        : "[開啟參考排版工作室](studio-action:open-reference-ad-studio)";
    case "route-storyboard":
      return en
        ? "[Product storyboard](studio-action:open-storyboard-studio)"
        : "[產品分鏡工作室](studio-action:open-storyboard-studio)";
    case "route-captions":
      return en
        ? "[Caption studio](studio-action:open-captions)"
        : "[字幕工具](studio-action:open-captions)";
    case "route-edit-image":
      return en
        ? "[Open image editor](studio-action:open-edit-image)"
        : "[開啟修圖工作室](studio-action:open-edit-image)";
    case "route-ultra-canvas":
      return en
        ? "[Open Ultra canvas](studio-action:open-ultra-canvas)"
        : "[開啟 Ultra 畫布](studio-action:open-ultra-canvas)";
    case "route-brand-kit":
      return en
        ? "[Open brand kit](studio-action:open-brand-kit)"
        : "[開啟品牌套件](studio-action:open-brand-kit)";
    case "route-pricing":
      return en
        ? "[View pricing](studio-action:open-pricing)"
        : "[查看方案價格](studio-action:open-pricing)";
    case "route-library":
      return en
        ? "[Open library](studio-action:open-library)"
        : "[開啟作品庫](studio-action:open-library)";
    case "route-ugc":
      return en
        ? "[Open UGC studio](studio-action:open-ugc)"
        : "[開啟 UGC 工作室](studio-action:open-ugc)";
    case "analyze-brand":
    case "analyze-brand-before-image":
      return en
        ? "[Analyze brand](studio-action:analyze-brand)"
        : "[分析品牌](studio-action:analyze-brand)";
    default:
      return null;
  }
}

export function buildCoachReply(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
  locale: Locale,
  opts?: {
    campaignHint?: string;
    detectedUrl?: string;
    userText?: string;
    intent?: StudioAssistantIntent;
    previousCoachTask?: CoachTaskKind | null;
  },
): string {
  const en = coachUsesEnglish(locale);
  const url = snapshot.brandWebsiteUrl.trim() || opts?.detectedUrl?.trim() || "";
  const hint = opts?.campaignHint ?? "";
  const link = actionLinkForTask(task, en);
  const isZh = locale === "zh" || locale === "zh-cn" || locale === "zh-tw";
  const path = pathLabel(snapshot, isZh && !en ? true : isZh);
  const mode = detectStudioCoachMode(snapshot);

  const step = (body: string) => {
    const repeat = isCoachRepeatTurn(
      task,
      snapshot,
      opts?.userText,
      opts?.previousCoachTask ?? null,
    );
    const header = [coachPathLine(locale, path), coachModeLine(locale, mode)].join("\n");
    const preamble = repeat ? coachRepeatPreamble(task, snapshot, locale) : "";
    const prefix = coachStepPrefix(task, snapshot, en);
    const numberedBody = body.replace(
      /^(Step —|Step \d+ —|Step \d+|第一步[：: —]|第\d+步[：: —]|呢步 —)/,
      `${prefix} —`,
    );
    return en
      ? `${header}\n\n${preamble}${numberedBody}`
      : `${header}\n\n${preamble}${numberedBody}`;
  };

  switch (task) {
    case "route-website-reel":
      return en
        ? [
            "Step 1: Website / concept video — 8s cinematic Reel + captions.",
            link ?? "",
            "Reply next once you are on Setup.",
          ].join("\n")
        : [
            "第一步：網站／概念影片 — 8 秒電影感 Reel + 字幕。",
            link ?? "",
            coachContinueOnSetup(locale),
          ].join("\n");

    case "route-website-image":
      return en
        ? [
            "Step 1: Static website launch mockup (image-only, no video UI clone).",
            link ?? "",
            "Reply next on Setup.",
          ].join("\n")
        : ["第一步：網站上線靜態 mockup 圖（只出圖）。", link ?? "", coachContinueSetupShort(locale)].join("\n");

    case "route-cinematic-stitch":
      return en
        ? [
            "Step 1: Multi-scene cinematic stitch (~24s) for feature tours.",
            link ?? "",
            "Reply next on Setup.",
          ].join("\n")
        : ["第一步：多場景電影感拼接（約 24 秒）講多個賣點。", link ?? "", coachContinueSetupShort(locale)].join("\n");

    case "route-physical-image-post":
      return en
        ? [
            "Step 1: Product image post (physical · image-only). Upload product photo → generate images. Not concept / not 8s Reel.",
            link ?? "",
            "Reply next once you are on Setup.",
          ].join("\n")
        : [
            coachZh(
              locale,
              "第一步：實體產品圖文帖（只出圖）。上傳產品相 → 出圖。唔係概念片／8 秒 Reel。",
              "第一步：实体产品图文帖（只出图）。上传产品图 → 出图。不是概念片／8 秒 Reel。",
              "第一步：實體產品圖文帖（只出圖）。上傳產品圖 → 出圖。不是概念片／8 秒 Reel。",
            ),
            link ?? "",
            coachContinueSetupShort(locale),
          ].join("\n");

    case "route-reference-ad":
      return en
        ? [
            "Step 1: Copy a reference ad layout (XHS / IG style) — upload style reference + your product photo on the Image step, then generate.",
            link ?? "",
            "Reply next on Setup.",
          ].join("\n")
        : [
            coachZh(
              locale,
              "第一步：跟參考廣告排版出圖（小紅書／IG 風格）— Image 步上傳參考圖 + 產品相，再生成。",
              "第一步：跟参考广告排版出图（小红书／IG 风格）— Image 步上传参考图 + 产品图，再生成。",
              "第一步：跟參考廣告排版出圖（小紅書／IG 風格）— Image 步上傳參考圖 + 產品圖，再生成。",
            ),
            link ?? "",
            coachContinueSetupShort(locale),
          ].join("\n");

    case "route-physical-product":
      return en
        ? [
            "Step 1: Physical product — upload photo → image → video Reel.",
            link ?? "",
            "Reply next on Setup.",
          ].join("\n")
        : coachZh(
            locale,
            "第一步：實體產品 — 上傳產品相 → 出圖 → 出片。",
            "第一步：实体产品 — 上传产品图 → 出图 → 出片。",
            "第一步：實體產品 — 上傳產品圖 → 出圖 → 出片。",
          ) +
          "\n" +
          (link ?? "") +
          "\n" +
          coachContinueSetupShort(locale);

    case "route-storyboard":
      return en
        ? [
            "Step 1: Product storyboard — multi-scene stills → stitched fallback video (textless frames; captions via /captions).",
            link ?? "",
            "Reply next on Setup.",
          ].join("\n")
        : [
            coachZh(
              locale,
              "第一步：產品分鏡 — 多場景圖 → stitched fallback 影片（畫面無字；字幕用 /captions）。",
              "第一步：产品分镜 — 多场景图 → stitched fallback 视频（画面无字；字幕用 /captions）。",
              "第一步：產品分鏡 — 多場景圖 → stitched fallback 影片（畫面無字；字幕用 /captions）。",
            ),
            link ?? "",
            coachContinueSetupShort(locale),
          ].join("\n");

    case "route-concept-studio":
      return en
        ? [
            "Step 1: Concept / service promo — open concept studio to pick mode and fill your brief.",
            link ?? "[Open concept studio](studio-action:open-concept-studio)",
          ].join("\n")
        : [
            "第一步：概念／服務推廣 — 開概念工作室揀模式同填簡介。",
            link ?? "[開啟概念工作室](studio-action:open-concept-studio)",
          ].join("\n");

    case "route-captions":
      return en
        ? ["Step 1: Burn captions on any MP4 — no regeneration needed.", link ?? ""].join("\n")
        : ["第一步：任何 MP4 燒錄字幕 — 唔使重新出片。", link ?? ""].join("\n");

    case "route-edit-image":
      return en
        ? [
            "Step 1: Image editor — upload or pick from library → clean (inpaint) → design layers → export.",
            link ?? "",
          ].join("\n")
        : ["第一步：修圖 — 上傳或從作品庫揀圖 → 清雜物 → 排版 → 匯出。", link ?? ""].join("\n");

    case "route-ultra-canvas":
      return en
        ? [
            "Step 1: Ultra canvas (Master plan) — templates or upload → AI image → video. Pay-per-use tokens.",
            link ?? "",
          ].join("\n")
        : ["第一步：Ultra 畫布（Master 方案）— 模板或上傳 → 出圖 → 出片。按次 token。", link ?? ""].join("\n");

    case "route-brand-kit":
      return en
        ? ["Step 1: Upload logo + brand colors once for storyboard stills.", link ?? ""].join("\n")
        : ["第一步：上傳 logo 同品牌色，分鏡靜圖可選蓋 logo。", link ?? ""].join("\n");

    case "route-pricing":
      return en
        ? ["Plans and token costs — see pricing for USD/month and feature gates.", link ?? ""].join("\n")
        : ["方案同 token 價格 — 去 pricing 睇月費同功能門檻。", link ?? ""].join("\n");

    case "route-library":
      return en
        ? ["Step 1: Your saved outputs — reopen in editor, captions, or download.", link ?? ""].join("\n")
        : ["第一步：已存成品 — 可再開修圖／字幕或下載。", link ?? ""].join("\n");

    case "route-ugc":
      return en
        ? ["Step 1: UGC talking presenter — product + vibe (unboxing, review).", link ?? ""].join("\n")
        : ["第一步：UGC 口播 — 話我知產品同感覺（開箱、評價）。", link ?? ""].join("\n");

    case "guide-edit-image":
      return en
        ? snapshot.hasEditImageSource
          ? "You already have an image loaded. Step 1 — Clean: brush to remove objects/text, then Design to add logo/copy, then Export. Ask me what to change."
          : "Step 1 — upload a photo or pick one from Library. Then Clean (inpaint) → Design (layers/text/logo) → Export. I stay on this page."
        : snapshot.hasEditImageSource
          ? "你已有圖喺畫布。第一步 — 清雜物：用筆刷清走唔要嘅物件／字，再去排版加 logo／文案，最後匯出。想改咩直接問我。"
          : "第一步 — 上傳相片或從作品庫揀圖。然後清雜物 → 排版（圖層／文字／logo）→ 匯出。我會喺呢頁教你，唔使返 studio。";

    case "guide-captions":
      return en
        ? snapshot.hasCaptionSource
          ? "Video is loaded. Step 1 — edit timed caption lines, then Audio (BGM / voice) if you want, then Burn onto the video. Ask me about style, timing, or voice."
          : "Step 1 — import an MP4 (library or upload). Then edit script/captions → optional BGM/voice → Burn. No need to regenerate the video."
        : snapshot.hasCaptionSource
          ? "片已載入。第一步 — 改時間軸字幕，然後可加 BGM／配音，最後燒錄。風格、時間、口播直接問我。"
          : "第一步 — 匯入 MP4（作品庫或上傳）。然後改字幕文案 → 可選 BGM／配音 → 燒錄。唔使重新出片。";

    case "guide-ultra-canvas":
      return en
        ? "You are on Ultra canvas. Step 1 — pick a template (Product hero / Script to film) or add Upload → Image → Video. Wire modifier nodes (lighting, background) upstream. Use @aliases for refs. Save boards with ⌘S. Pay-per-use tokens — check badges before Run."
        : coachZh(
            locale,
            "你喺 Ultra 畫布。第一步 — 揀模板（產品主圖／劇本成片）或加 Upload→Image→Video。修飾節點（燈光、背景）接上游。用 @ 引用素材。⌘S 儲存畫布。按次 token — Run 之前睇徽章。",
            "你在 Ultra 画布。第一步 — 选模板（产品主图／剧本成片）或加 Upload→Image→Video。修饰节点（灯光、背景）接上游。用 @ 引用素材。⌘S 保存画布。按次 token — Run 之前看徽章。",
            "你在 Ultra 畫布。第一步 — 選模板（產品主圖／劇本成片）或加 Upload→Image→Video。修飾節點（燈光、背景）接上游。用 @ 引用素材。⌘S 儲存畫布。按次 token — Run 之前看徽章。",
          );

    case "guide-brand-kit":
      return en
        ? "Step 1 — upload logo + brand colors here. Opt in if you want the logo stamped on storyboard stills; leave off for textless frames."
        : "第一步 — 喺呢頁上傳 logo 同品牌色。分鏡靜幀要蓋 logo 先開；想畫面無 logo 就關。";

    case "guide-library":
      return en
        ? "This is your library. Download past images/videos, or open one in Image editor / Caption studio. Ask if you cannot find a file."
        : "呢度係作品庫。下載舊圖／片，或開去修圖／字幕工作室。搵唔到檔可以問我。";

    case "guide-ugc":
      return en
        ? "UGC studio — generate creator-style clips. Tell me the product and the vibe you want (unboxing, review, street). For ads with storyboard, use /studio instead."
        : "UGC 工作室 — 出創作者風格短片。話我知產品同感覺（開箱、評價、街拍）。要分鏡廣告就去 /studio。";

    case "fix-error":
      return en
        ? `Step 1: Fix wizard error first:\n${snapshot.error}\nFill missing fields shown above, then retry. Reply next.`
        : `第一步：先修正工作室錯誤：\n${snapshot.error}\n補返缺少欄位再試。搞掂後回覆 下一步。`;

    case "enter-brand-url":
      return step(
        en
          ? [
              "Step 1 — paste URL in Setup field Brand website (品牌網站).",
              url ? `Use: ${url}` : "Full https://… required.",
              "Analyze brand only works after URL is in that box.",
              "Reply next when pasted.",
            ].join("\n")
          : [
              "第一步 — 喺 Setup **「品牌網站（建議）」** 貼網址。",
              url ? `請貼：${url}` : "要完整 https://…",
              "貼入欄位後先可以「分析品牌」。",
              "貼好回覆 下一步。",
            ].join("\n"),
      );

    case "fill-product-name": {
      const inferred = inferPhysicalProductName(hint) ?? inferProductCalled(hint);
      return step(
        en
          ? [
              "Step — Product name (產品名稱 field in Setup).",
              inferred ? `From your message, try: 「${inferred}」` : "e.g. wind-chime bracelet / 風鈴手串",
              "This names the campaign in headlines and captions.",
              "Reply next when filled (or after you paste the name).",
            ].join("\n")
          : [
              "呢步 — 填 **產品名稱**（Setup 欄位）。",
              inferred ? `根據你啱啱講嘅，可試：「${inferred}」` : "例如：風鈴手串、洗鼻器",
              "之後 headline／字幕會用呢個名。",
              "填好回覆 下一步。",
            ].join("\n"),
      );
    }

    case "choose-visual-style":
      return step(
        en
          ? [
              "Step — Pick a visual style (3 primary paths at top of Setup):",
              "• Quick Ad — clean product shot on studio/lifestyle background (most SKUs)",
              "• Model Wear/Use — someone wearing or demoing the product",
              "• Storyboard Reel — multi-scene stills → stitched fallback video (captions later)",
              "More styles (brand-fit, poster…) are under Advanced.",
              "Tap your choice, then reply next.",
            ].join("\n")
          : [
              "呢步 — 揀 **視覺風格**（Setup 頂部三條主路徑）：",
              "• 快速廣告 — 產品特寫／生活場景（最多人用）",
              "• 模特兒穿戴／使用 — 有人示範產品",
              "• 分鏡 Reel — 多場景圖 → stitched fallback 影片（字幕之後加）",
              "進階區有更多風格。",
              "揀好回覆 下一步。",
            ].join("\n"),
      );

    case "choose-image-output":
      return step(
        en
          ? [
              snapshot.stepKey === "setup"
                ? "Step — What kind of image post? (you'll pick again on Image step — same options):"
                : "Step — How many images? (Image step · How many images?):",
              "• Single image — one promo still (default, cheapest)",
              "• A / B versions — two variations to compare",
              "• Campaign set — 3 linked posts (hero → selling points → offer; ~3× cost)",
              "• Teaching carousel — 4 educational slides (concept mode; physical uses single/A/B/campaign)",
              snapshot.workflowMode === "image-only"
                ? "Image-only path: no video step after this."
                : "Combined path: after images you can continue to a Reel.",
              "Pick a card, then reply next.",
            ].join("\n")
          : [
              snapshot.stepKey === "setup"
                ? "呢步 — 你想出咩圖？（出圖步會再揀一次，選項一樣）："
                : "呢步 — **出幾多張圖？**（出圖步 · How many images?）",
              "• 單張 — 一張宣傳圖（預設、最平）",
              "• A/B — 兩個版本俾你揀",
              "• Campaign 套圖 — 3 張串連帖（主圖→賣點→優惠；約 3× 成本）",
              "• 教學輪播 — 4 張教學圖（概念模式較常用）",
              snapshot.workflowMode === "image-only"
                ? "只出圖路線：唔會再出片。"
                : "圖→片路線：出完圖可以繼續做 Reel。",
              "揀好卡片，回覆 下一步。",
            ].join("\n"),
      );

    case "fill-business":
      return step(
        en
          ? "Step 1 — fill Business / brand name in Setup. Reply next."
          : "第一步 — 填 **商號／品牌名**。回覆 下一步。",
      );

    case "fill-headline":
      return step(
        en
          ? "Step 1 — fill Headline with THIS campaign hook (not generic site tagline). Reply next."
          : "第一步 — 填 **主標題 headline**（今次 campaign，唔好寫通用口號）。回覆 下一步。",
      );

    case "fill-subline":
      return step(
        en ? "Step 1 — fill Subline / supporting line. Reply next." : "第一步 — 填 **副標 subline**。回覆 下一步。",
      );

    case "fill-offer":
      return step(
        en ? "Step 1 — fill Offer / CTA (price, promo, code). Reply next." : "第一步 — 填 **優惠 offer**。回覆 下一步。",
      );

    case "fill-concept": {
      const paste = suggestConceptPaste(hint, url);
      return step(
        en
          ? [
              "Step — Concept description (indigo Concept helper box).",
              "Write what you promote: feature name, audience, 2–3 selling points for captions/voiceover.",
              "Not a website screenshot — cinematic mood scene.",
              "Paste (edit freely):",
              paste,
              "Reply next when filled.",
            ].join("\n\n")
          : [
              "呢步 — **概念描述**（紫色概念助手區）。",
              "寫清推廣咩：功能名、受眾、2–3 個賣點（字幕／配音用）。",
              "唔係網站截圖 — 係電影感場景。",
              "可貼：",
              paste,
              "填好回覆 下一步。",
            ].join("\n\n"),
      );
    }

    case "fill-storyboard-brief":
      return step(
        snapshot.promotionMode === "concept"
          ? en
            ? "Step 1 — optional: fill Storyboard brief in Setup (scene beats, mood). Research reels can skip this. Reply next."
            : "第一步 — 可選：填 **分鏡簡述**（場景節奏、氛圍）。內容研究 Reel 可跳過。回覆 下一步。"
          : en
            ? "Step 1 — fill Storyboard brief in Setup (scene beats, mood, product angles). Reply next."
            : "第一步 — 填 **分鏡簡述**（場景節奏、產品角度）。回覆 下一步。",
      );

    case "fill-creative-video-brief":
      return step(
        en
          ? [
              "Step 1 — fill Creative video brief (what happens in the clip, pacing, mood).",
              hint ? `Hint: ${hint.slice(0, 200)}` : "",
              "Reply next.",
            ]
              .filter(Boolean)
              .join("\n")
          : [
              "第一步 — 填 **影片創意簡述**（片內發生咩、節奏、氣氛）。",
              hint ? `參考：${hint.slice(0, 200)}` : "",
              "回覆 下一步。",
            ]
              .filter(Boolean)
              .join("\n"),
      );

    case "upload-style-reference":
      return step(
        en
          ? [
              "Step — Upload style reference (Image step · reference layout zone at top).",
              "Use a competitor post, XHS cover, or ad screenshot — we copy layout, not their product.",
              "Then upload your product photo below. Reply next after both uploads.",
            ].join("\n")
          : [
              "呢步 — **上傳參考排版圖**（出圖步頂部參考區）。",
              "用小紅書封面、競品帖或廣告截圖 — 跟排版，唔係抄佢哋產品。",
              "再喺下面上傳你嘅產品相。兩張都上傳後回覆 下一步。",
            ].join("\n"),
      );

    case "upload-product-photo":
      return step(
        en
          ? [
              "Step — Upload product photo (Setup upload zone or Image step).",
              "Tips: plain background, good light, show label/packaging; 1 clear hero shot is enough.",
              "Required before generate. Reply next after upload.",
            ].join("\n")
          : [
              "呢步 — **上傳產品相**（Setup 上傳區或出圖步）。",
              "貼士：背景簡潔、光線足、見到包裝／標籤；一張清晰主圖就得。",
              "上傳後回覆 下一步。",
            ].join("\n"),
      );

    case "upload-concept-reference-photo":
      return step(
        en
          ? "Step 1 — optional: upload a reference image in Concept helper, or skip for text-only video. Reply next."
          : "第一步 — 可選：概念區 **上傳參考圖**，純文字成片可跳過。回覆 下一步。",
      );

    case "analyze-brand":
      return step(
        en
          ? ["Step 1 — click Analyze brand (URL is in the field).", link ?? "", "Reply next."].join("\n")
          : ["第一步 — 按 **「分析品牌」**（網址已在欄位）。", link ?? "", "回覆 下一步。"].join("\n"),
      );

    case "analyze-concept-ai":
      return step(
        en
          ? "Step 1 — optional: click Analyze concept (AI plans fields from your text). Reply next."
          : "第一步 — 可選：按 **「分析概念」** 讓 AI 幫你規劃欄位。回覆 下一步。",
      );

    case "continue-setup":
      return step(
        snapshot.promotionMode === "concept" && isStoryboardVideoStyle(snapshot.visualStyleId)
          ? en
            ? "Step 1 — Setup looks ready. Click Continue (analyzes reference reel if attached, then scene stills). Reply next on Image."
            : "第一步 — Setup 齊，按底部 **「繼續」**（有參考 Reel 會先分析，再出場景圖）。到出圖步回覆 下一步。"
          : en
            ? "Step 1 — Setup fields look ready. Click Continue at the bottom. Reply next on the next step."
            : "第一步 — Setup 欄位齊，按底部 **「繼續」**。到下一步回覆 下一步。",
      );

    case "analyze-brand-before-image":
      return step(
        en
          ? [
              "Step 1 — brand-fit / brand-campaign needs Analyze brand BEFORE generate image.",
              link ?? "",
              "Reply next.",
            ].join("\n")
          : ["第一步 — brand 風格要先 **「分析品牌」** 先可以出圖。", link ?? "", "回覆 下一步。"].join("\n"),
      );

    case "generate-cinematic-keyframe":
      return step(
        en
          ? "Step 1 — click Generate cinematic keyframe (mood scene, no site UI). Reply next."
          : "第一步 — 按 **「生成電影感關鍵幀」**（氛圍場景，唔係網站 UI）。回覆 下一步。",
      );

    case "generate-cinematic-scenes":
      return step(
        en
          ? `Step 1 — generate all ${snapshot.cinematicSceneCount} cinematic scene keyframes (${snapshot.cinematicScenesCount}/${snapshot.cinematicSceneCount} done). Reply next.`
          : `第一步 — 生成全部 ${snapshot.cinematicSceneCount} 個電影場景關鍵幀（已完成 ${snapshot.cinematicScenesCount}/${snapshot.cinematicSceneCount}）。回覆 下一步。`,
      );

    case "generate-storyboard-scenes":
      return step(
        snapshot.promotionMode === "concept"
          ? en
            ? "Step 1 — click Generate storyboard scene images (from concept/headline + reference reel beats). No product photo required. Reply next."
            : "第一步 — 按 **「生成分鏡場景圖」**（概念／headline + 參考 Reel 節奏；唔使產品相）。回覆 下一步。"
          : en
            ? "Step 1 — click Generate storyboard scene images (AI plans beats from product + brief). Reply next."
            : "第一步 — 按 **「生成分鏡場景圖」**。回覆 下一步。",
      );

    case "generate-image":
      return step(
        en
          ? snapshot.usesCompositor
            ? "Step 1 — fill compositor headline/text, upload product photo, click Generate composite image. Reply next."
            : "Step 1 — click Generate image / Regenerate. Reply next when happy."
          : snapshot.usesCompositor
            ? "第一步 — 填好拼版文字、上傳產品圖，按 **「生成合成圖」**。回覆 下一步。"
            : "第一步 — 按 **「生成相片」**／重新生成。滿意後回覆 下一步。",
      );

    case "continue-image":
      return step(
        en
          ? snapshot.workflowMode === "image-only"
            ? "Step 1 — image ready. Download or go to Done. Reply next."
            : "Step 1 — click Continue to video step. Reply next there."
          : snapshot.workflowMode === "image-only"
            ? "第一步 — 圖片完成，可下載或去完成步。回覆 下一步。"
            : "第一步 — 按 **「繼續」** 去出片步。到出片步回覆 下一步。",
      );

    case "plan-ad-pack":
      return step(
        en
          ? "Step 1 — open Ad pack: edit timed captions + voiceover (feature bullets here). Enable BGM if needed. Then Generate video. Reply next."
          : "第一步 — 開 **Ad pack**：改定時字幕同配音（功能賣點寫喺度）。需要就開 BGM，然後 **「生成影片」**。回覆 下一步。",
      );

    case "generate-storyboard-video":
      return step(
        en
          ? "Step 1 — generate storyboard video (scene animation per scene still, then stitch). Captions later via /captions. Reply next."
          : "第一步 — **生成分鏡影片**（逐場靜幀 scene animation，再拼接；字幕之後去 /captions）。回覆 下一步。",
      );

    case "generate-cinematic-video":
      return step(
        en
          ? "Step 1 — generate 8s reference-reel video clip from cinematic keyframe(s). Check ad pack first if captions/voice on. Reply next."
          : "第一步 — 由電影關鍵幀 **生成 8 秒 reference-reel video 片**。有開字幕配音就先檢查 Ad pack。回覆 下一步。",
      );

    case "generate-creative-video":
      return step(
        en
          ? "Step 1 — plan/review AI video prompt, then Generate video (creative / brand-video path). Reply next."
          : "第一步 — 檢查 AI 影片 prompt，再 **「生成影片」**（creative／brand-video 路線）。回覆 下一步。",
      );

    case "generate-video":
      return step(
        en
          ? "Step 1 — click Generate video on the video step. Reply next."
          : "第一步 — 喺出片步按 **「生成影片」**。回覆 下一步。",
      );

    case "done-download":
      return step(
        en
          ? "Done — download from Done step, or [Caption studio](/captions) for burn-in edits, or [/ultra](/ultra) for Ultra canvas workflows."
          : "完成 — 喺完成步下載，或去 [字幕工具](/captions) 改燒錄字幕，進階用 [/ultra](/ultra) Ultra 畫布。",
      );

    default:
      return en
        ? "Reply next when this step is done."
        : coachZh(locale, "搞掂呢步後回覆 下一步。", "完成这一步后回复 下一步。", "完成這一步後回覆 下一步。");
  }
}

export function stripInvalidActionLinks(
  text: string,
  snapshot: StudioAssistantSnapshot,
): string {
  let out = text;
  if (snapshot.surface === "studio") {
    out = out.replace(/\[([^\]]+)\]\(studio-action:setup-website-reel\)/gi, "");
    out = out.replace(/\[([^\]]+)\]\(studio-action:open-concept-studio\)/gi, "");
    out = out.replace(/\[([^\]]+)\]\(studio-action:open-physical-studio\)/gi, "");
    out = out.replace(/\[([^\]]+)\]\(studio-action:open-storyboard-studio\)/gi, "");
    out = out.replace(/\[([^\]]+)\]\(studio-action:website-launch-image\)/gi, "");
    out = out.replace(/\[([^\]]+)\]\(studio-action:apply-cinematic-stitch\)/gi, "");
  }
  if (snapshot.surface === "studio" && !snapshot.brandWebsiteUrl.trim()) {
    out = out.replace(/\[([^\]]+)\]\(studio-action:analyze-brand\)/gi, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function formatCoachChecklistForPrompt(
  snapshot: StudioAssistantSnapshot,
  locale: Locale,
): string {
  const task = getNextStudioCoachTask(snapshot);
  const isZh = locale === "zh" || locale === "zh-cn" || locale === "zh-tw";
  const lines: string[] = [
    isZh ? "【嚮導 — 必須跟 wizard 狀態同路線】" : "【Coach — follow wizard state and path】",
    isZh
      ? `- 路線：${pathLabel(snapshot, true)}`
      : `- Path: ${pathLabel(snapshot, false)}`,
    isZh ? `- 今步 task：${task}` : `- Next task: ${task}`,
    isZh
      ? "- studio 內禁止 landing 掣（setup-website-reel 等）"
      : "- In studio: no landing-only action links",
    isZh
      ? "- 未填品牌網站欄 → 只教貼 URL，唔好叫分析品牌"
      : "- Brand URL field empty → paste URL only, not analyze brand",
    isZh
      ? "- brand-fit／brand-campaign 出圖前必須已分析品牌"
      : "- brand-fit/campaign: analyze brand before image generate",
    isZh
      ? snapshot.promotionMode === "concept" && isStoryboardVideoStyle(snapshot.visualStyleId)
        ? "- concept storyboard：概念／headline + 參考 Reel → 場景圖 → stitched fallback 分鏡片（唔使產品相；字幕 /captions）"
        : "- storyboard：產品名 + 分鏡簡述 + 產品相 + 場景圖 → stitched fallback（畫面無字）"
      : snapshot.promotionMode === "concept" && isStoryboardVideoStyle(snapshot.visualStyleId)
        ? "- concept storyboard: concept/headline + reference reel → scene stills → stitched fallback video (no product photo; captions via /captions)"
        : "- storyboard: product name + brief + photo + scene stills → stitched fallback (textless frames)",
    isZh
      ? "- image-only 完成於出圖；video-only 跳過出圖步"
      : "- image-only finishes at image; video-only skips image step",
  ];
  if (snapshot.surface === "studio") {
    lines.push(
      isZh
        ? `欄位：網址=${snapshot.brandWebsiteUrl ? "✓" : "—"} 概念=${snapshot.conceptIdea ? "✓" : "—"} 產品=${snapshot.product ? "✓" : "—"} 分鏡=${snapshot.storyboardBrief ? "✓" : "—"} headline=${snapshot.headline ? "✓" : "—"} 相=${snapshot.hasProductPhoto ? "✓" : "—"} 圖=${snapshot.hasKeyframe ? "✓" : "—"} 片=${snapshot.hasVideo ? "✓" : "—"} 步=${snapshot.stepKey}`
        : `Fields: url=${snapshot.brandWebsiteUrl ? "y" : "n"} concept=${snapshot.conceptIdea ? "y" : "n"} product=${snapshot.product ? "y" : "n"} storyboard=${snapshot.storyboardBrief ? "y" : "n"} headline=${snapshot.headline ? "y" : "n"} photo=${snapshot.hasProductPhoto ? "y" : "n"} image=${snapshot.hasKeyframe ? "y" : "n"} video=${snapshot.hasVideo ? "y" : "n"} step=${snapshot.stepKey}`,
    );
  }
  return lines.join("\n");
}

export function shouldUseCoachFastPath(userText: string): boolean {
  const t = userText.trim();
  if (isCoachContinueReply(t)) {
    return true;
  }
  return /教我|填寫|填写|概念|分鏡|分镜|storyboard|headline|產品|产品|how to fill|teach me|what.?next|下一步做|接下来|接下來/i.test(
    t,
  );
}
