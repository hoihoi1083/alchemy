import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";

/** Ask = product Q&A from knowledge. Guide = coach a make-something path. */
export type AssistantTurnMode = "ask" | "guide";

const GUIDE_START =
  /教我|幫我出|帮我出|幫我做|帮我做|幫我整|帮我整|我想(做|出|拍|推|整|生成)|I want to (make|create|generate|promote|build|shoot)|help me (make|create|build|generate|promote)|make me (a |an )?(ad|reel|video|post)|create (a |an )?(ad|reel|video|carousel|post)|open studio|開始做|开始做|出一條|出一条|出一張|出一张/i;

const ASK_STRONG =
  /^(what|why|where|which|how (many|much|does|do|is|are|come)|can i|does|is there|do you)\b/i;

const ASK_TOPIC =
  /token|tokens|pricing|price|plan|upgrade|free grant|額度|额度|免費|免费|收費|價錢|价钱|方案|點數|点数|minimax|\bh3\b|kling|seedance|fal|分別|区别|係咩|是什么|是什麼|點解|为什么|為什麼|邊度|哪里|哪裡|how does|what is|explain|解釋|解释|夠唔夠|够不够|hidden|配方|assistant|問 ai|问ai/i;

export function detectAssistantTurnMode(
  text: string,
  intent?: StudioAssistantIntent,
): AssistantTurnMode {
  const t = text.trim();
  if (!t) return "ask";
  if (
    /^(下一步|next(?: step)?|continue|繼續|继续|然後|然后|好|好了|ok|done)[\s!.?。]*$/i.test(t)
  ) {
    return "guide";
  }

  const wantsGuide =
    GUIDE_START.test(t) ||
    /how (do i|to) (make|create|start|open|use|generate)/i.test(t) ||
    /點(樣|樣可以)?(出|做|開始|開)/.test(t);
  const wantsAsk = ASK_STRONG.test(t) || ASK_TOPIC.test(t) || /[?？]/.test(t);

  if (
    (intent === "edit_image" || intent === "captions_only" || intent === "pro_canvas") &&
    !ASK_TOPIC.test(t)
  ) {
    return "guide";
  }

  if (wantsAsk && wantsGuide && ASK_TOPIC.test(t)) return "ask";
  if (wantsAsk && !wantsGuide) return "ask";
  if (wantsGuide) return "guide";

  if (
    intent &&
    intent !== "general" &&
    (intent === "physical_product" ||
      intent === "physical_image_post" ||
      intent === "website_video" ||
      intent === "website_image" ||
      intent === "reference_ad" ||
      intent === "captions_only" ||
      intent === "edit_image" ||
      intent === "pro_canvas")
  ) {
    return "guide";
  }

  return "ask";
}
