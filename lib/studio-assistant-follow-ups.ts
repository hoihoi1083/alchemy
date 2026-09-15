import type { Locale } from "@/lib/i18n";
import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";

/** Suggested next chips shown under the latest assistant reply. */
export function buildAssistantFollowUps(opts: {
  locale: Locale;
  turnMode: "ask" | "guide";
  intent: StudioAssistantIntent;
  coachTask?: CoachTaskKind | null;
  signedIn: boolean;
}): Array<{ id: string; label: string }> {
  const en = opts.locale === "en";
  const cn = opts.locale === "zh-cn";
  const chips: Array<{ id: string; label: string }> = [];

  const L = {
    askTokens: en
      ? "How many tokens for an 8s reel?"
      : cn
        ? "8 秒短片要多少 tokens？"
        : "8 秒短片要幾多 tokens？",
    askUltra: en
      ? "Wizard vs Ultra canvas?"
      : cn
        ? "Wizard 和 Ultra 画布有什么分别？"
        : "Wizard 同 Ultra 有咩分別？",
    goSignin: en ? "Sign in to create" : cn ? "登录开始创作" : "登入開始創作",
    makeProduct: en
      ? "Help me make a product post"
      : cn
        ? "帮我出产品图文帖"
        : "幫我出產品圖文帖",
    openUltra: en ? "Open Ultra canvas" : cn ? "开启 Ultra 画布" : "開啟 Ultra 畫布",
    openPhysical: en
      ? "Open product image studio"
      : cn
        ? "开启产品出图工作室"
        : "開啟產品出圖工作室",
    openStudio: en ? "Open studio" : cn ? "进入工作室" : "進入工作室",
    openConcept: en
      ? "Open concept studio"
      : cn
        ? "开启概念工作室"
        : "開啟概念工作室",
    askCost: en
      ? "What will this cost?"
      : cn
        ? "这次大概用多少 token？"
        : "呢次大概用幾多 token？",
    goSigninShort: en ? "Sign in" : cn ? "登录" : "登入",
  };

  if (opts.turnMode === "ask") {
    chips.push({ id: "ask-tokens", label: L.askTokens });
    chips.push({ id: "ask-ultra", label: L.askUltra });
    if (!opts.signedIn) {
      chips.push({ id: "go-signin", label: L.goSignin });
    } else {
      chips.push({ id: "make-product", label: L.makeProduct });
    }
    return chips.slice(0, 3);
  }

  if (opts.intent === "pro_canvas" || opts.coachTask === "route-ultra-canvas") {
    chips.push({ id: "open-ultra", label: L.openUltra });
  } else if (
    opts.intent === "physical_image_post" ||
    opts.intent === "physical_product" ||
    opts.coachTask === "route-physical-image-post"
  ) {
    chips.push({ id: "open-physical", label: L.openPhysical });
  } else if (
    opts.intent === "website_video" ||
    opts.intent === "website_image" ||
    opts.coachTask === "route-website-reel" ||
    opts.coachTask === "route-website-image"
  ) {
    chips.push({ id: "open-studio", label: L.openStudio });
  } else {
    chips.push({ id: "open-concept", label: L.openConcept });
  }

  chips.push({ id: "ask-cost", label: L.askCost });
  if (!opts.signedIn) {
    chips.push({ id: "go-signin", label: L.goSigninShort });
  }
  return chips.slice(0, 3);
}

export function followUpPromptForChip(id: string, locale: Locale): string | null {
  const en = locale === "en";
  const cn = locale === "zh-cn";
  switch (id) {
    case "ask-tokens":
      return en
        ? "How many tokens for an 8s reel at 480p vs 720p?"
        : cn
          ? "8 秒短片 480p 和 720p 分别用多少 tokens？"
          : "8 秒短片 480p 同 720p 分別用幾多 tokens？";
    case "ask-ultra":
      return en
        ? "What's the difference between the guided wizard and Ultra canvas?"
        : cn
          ? "引导式 wizard 和 Ultra 画布有什么分别？"
          : "引導式 wizard 同 Ultra 畫布有咩分別？";
    case "ask-cost":
      return en
        ? "Roughly how many tokens will my next generate cost?"
        : cn
          ? "我下一步生成大概用多少 tokens？"
          : "我下一步生成大概用幾多 tokens？";
    case "make-product":
      return en
        ? "I want a post with images about my product"
        : cn
          ? "我想出一张产品图文帖"
          : "我想出一張產品圖文帖";
    default:
      return null;
  }
}

/** Chips that should fire a send immediately (not only fill the input). */
export function followUpAutoSends(id: string): boolean {
  return (
    id === "ask-tokens" ||
    id === "ask-ultra" ||
    id === "ask-cost" ||
    id === "make-product"
  );
}
