/**
 * Billing facts for the Ask-AI assistant — derived from plan/token constants
 * so knowledge copy cannot drift from live pricing.
 */
import { PLAN_DEFINITIONS, FREE_SIGNUP_GRANT_TOKENS } from "@/lib/billing/plans";
import { H3_TOKENS_PER_SEC, TOKEN_COST } from "@/lib/billing/token-costs";
import type { UserPlan } from "@/lib/billing/plans";
import type { KnowledgeLocale } from "@/lib/studio-assistant-knowledge";

const IMAGE = TOKEN_COST.image;
const STORYBOARD_4 = IMAGE * 4;
const VIDEO_8S_480 = H3_TOKENS_PER_SEC["480P"] * 8;
const VIDEO_8S_720 = H3_TOKENS_PER_SEC["768P"] * 8;
const VIDEO_12S_480 = H3_TOKENS_PER_SEC["480P"] * 12;
const MOTION_POSTER_6S = H3_TOKENS_PER_SEC["768P"] * 6;
/** 4 storyboard stills + 4×5s @480p video */
export const STITCH_FALLBACK_TOKENS = STORYBOARD_4 + H3_TOKENS_PER_SEC["480P"] * 5 * 4;

export function assistantTokenCostFacts(locale: KnowledgeLocale): string {
  if (locale === "zh-cn") {
    return `Tokens ≈ 按次计费。免费注册一次送 ${FREE_SIGNUP_GRANT_TOKENS}（不是每月自动再送）。
大约：1 张静图 ≈ ${IMAGE}；4 格分镜 ≈ ${STORYBOARD_4}；8 秒影片 Free 480p ≈ ${VIDEO_8S_480}，Standard 720p ≈ ${VIDEO_8S_720}；6 秒动态海报 ≈ ${MOTION_POSTER_6S}（720p）；12 秒 480p ≈ ${VIDEO_12S_480}；拼接后备 4×5 秒 ≈ ${STITCH_FALLBACK_TOKENS}（${STORYBOARD_4} 静图 + ${H3_TOKENS_PER_SEC["480P"] * 5 * 4} 片）。
方案大约：Free 注册 ${FREE_SIGNUP_GRANT_TOKENS}／480p；Light ${PLAN_DEFINITIONS.light.monthlyTokens}/月 480p；Standard ${PLAN_DEFINITIONS.standard.monthlyTokens}/月 720p；Pro ${PLAN_DEFINITIONS.pro.monthlyTokens}/月 1080p；Master ${PLAN_DEFINITIONS.master.monthlyTokens}/月 + Ultra 画布；Enterprise ${PLAN_DEFINITIONS.custom.monthlyTokens} + 3 席。付费可加购 1000 tokens。详情 /pricing。数字是估算。`;
  }
  if (locale === "zh-tw") {
    return `Tokens ≈ 按次計費。免費註冊一次送 ${FREE_SIGNUP_GRANT_TOKENS}（不是每月自動再送）。
大約：1 張靜圖 ≈ ${IMAGE}；4 格分鏡 ≈ ${STORYBOARD_4}；8 秒影片 Free 480p ≈ ${VIDEO_8S_480}，Standard 720p ≈ ${VIDEO_8S_720}；6 秒動態海報 ≈ ${MOTION_POSTER_6S}（720p）；12 秒 480p ≈ ${VIDEO_12S_480}；拼接後備 4×5 秒 ≈ ${STITCH_FALLBACK_TOKENS}（${STORYBOARD_4} 靜圖 + ${H3_TOKENS_PER_SEC["480P"] * 5 * 4} 片）。
方案大約：Free 註冊 ${FREE_SIGNUP_GRANT_TOKENS}／480p；Light ${PLAN_DEFINITIONS.light.monthlyTokens}/月 480p；Standard ${PLAN_DEFINITIONS.standard.monthlyTokens}/月 720p；Pro ${PLAN_DEFINITIONS.pro.monthlyTokens}/月 1080p；Master ${PLAN_DEFINITIONS.master.monthlyTokens}/月 + Ultra 畫布；Enterprise ${PLAN_DEFINITIONS.custom.monthlyTokens} + 3 席。付費可加購 1000 tokens。詳情 /pricing。數字是估算。`;
  }
  if (locale === "zh") {
    return `Tokens ≈ 按次計費。免費註冊一次送 ${FREE_SIGNUP_GRANT_TOKENS}（唔係每月自動再送）。
大約：1 張靜圖 ≈ ${IMAGE}；4 格分鏡 ≈ ${STORYBOARD_4}；8 秒影片 Free 480p ≈ ${VIDEO_8S_480}，Standard 720p ≈ ${VIDEO_8S_720}；6 秒動態海報 ≈ ${MOTION_POSTER_6S}（720p）；12 秒 480p ≈ ${VIDEO_12S_480}；拼接後備 4×5 秒 ≈ ${STITCH_FALLBACK_TOKENS}（${STORYBOARD_4} 靜圖 + ${H3_TOKENS_PER_SEC["480P"] * 5 * 4} 片）。
方案大約：Free 註冊 ${FREE_SIGNUP_GRANT_TOKENS}／480p；Light ${PLAN_DEFINITIONS.light.monthlyTokens}/月 480p；Standard ${PLAN_DEFINITIONS.standard.monthlyTokens}/月 720p；Pro ${PLAN_DEFINITIONS.pro.monthlyTokens}/月 1080p；Master ${PLAN_DEFINITIONS.master.monthlyTokens}/月 + Ultra 畫布；Enterprise ${PLAN_DEFINITIONS.custom.monthlyTokens} + 3 席。付費可加購 1000 tokens。詳情 /pricing。數字係估算。`;
  }
  return `Tokens ≈ pay-per-use. Free signup grant is ${FREE_SIGNUP_GRANT_TOKENS} tokens once (not a monthly refill).
Rough costs: 1 still ≈ ${IMAGE} tokens; 4 storyboard stills ≈ ${STORYBOARD_4}; 8s video ≈ ${VIDEO_8S_480} at 480p (Free) or ≈ ${VIDEO_8S_720} at 720p; 6s motion poster ≈ ${MOTION_POSTER_6S}; 12s at 480p ≈ ${VIDEO_12S_480}; stitched fallback 4×5s ≈ ${STITCH_FALLBACK_TOKENS} (${STORYBOARD_4} stills + ${H3_TOKENS_PER_SEC["480P"] * 5 * 4} video).
Plans (typical): Free ${FREE_SIGNUP_GRANT_TOKENS} signup / 480p; Light ${PLAN_DEFINITIONS.light.monthlyTokens}/mo 480p; Standard ${PLAN_DEFINITIONS.standard.monthlyTokens}/mo 720p; Pro ${PLAN_DEFINITIONS.pro.monthlyTokens}/mo 1080p; Master ${PLAN_DEFINITIONS.master.monthlyTokens}/mo + Ultra canvas; Enterprise ${PLAN_DEFINITIONS.custom.monthlyTokens} + 3 seats. Paid can top up 1000 tokens. See /pricing. Estimates only.`;
}

export function assistantPlanGateFacts(locale: KnowledgeLocale): string {
  if (locale === "zh-cn") {
    return `功能门槛（最低方案）：Ultra 画布（/ultra）→ Master；分镜 storyboard TVC → Pro；平台内容研究和教学轮播 → Standard；720p 视频 → Standard；1080p → Pro。Free：480p、注册 ${FREE_SIGNUP_GRANT_TOKENS} tokens。带去锁定功能时要说明门槛。`;
  }
  if (locale === "zh-tw" || locale === "zh") {
    return `功能門檻（最低方案）：Ultra 畫布（/ultra）→ Master；分鏡 storyboard TVC → Pro；平台內容研究同教學輪播 → Standard；720p 影片 → Standard；1080p → Pro。Free：480p、註冊 ${FREE_SIGNUP_GRANT_TOKENS} tokens。帶去鎖定功能時要講明門檻。`;
  }
  return `Feature gates (minimum plan): Ultra canvas (/ultra) → Master; storyboard multi-scene TVC → Pro; platform content research & teaching carousel → Standard; 720p video → Standard; 1080p → Pro. Free tier: 480p, ${FREE_SIGNUP_GRANT_TOKENS} signup tokens. Always mention the gate when routing to a locked feature.`;
}

export function formatUserBillingForPrompt(opts: {
  locale: KnowledgeLocale;
  signedIn: boolean;
  plan?: UserPlan | null;
  tokenBalance?: number | null;
}): string {
  if (!opts.signedIn) {
    if (opts.locale === "en") {
      return "User is signed out. They can chat freely. Research / generate / Ultra need sign-in (and plan gates). Suggest [Sign in](/sign-in) when relevant.";
    }
    if (opts.locale === "zh-cn") {
      return "用户未登录。可自由聊天。研究／生成／Ultra 需登录（及方案门槛）。相关时建议 [登录](/sign-in)。";
    }
    return "用戶未登入。可自由傾偈。研究／生成／Ultra 要登入（及方案門檻）。相關時建議 [登入](/sign-in)。";
  }
  const plan = opts.plan ?? "free";
  const bal =
    typeof opts.tokenBalance === "number" && Number.isFinite(opts.tokenBalance)
      ? Math.max(0, Math.floor(opts.tokenBalance))
      : null;
  const res = PLAN_DEFINITIONS[plan]?.maxVideoResolution ?? "480p";
  const ultra = PLAN_DEFINITIONS[plan]?.proCanvas ? "yes" : "no";
  if (opts.locale === "en") {
    return `Signed-in user: plan=${plan}, videoCap=${res}, Ultra=${ultra}${bal !== null ? `, tokenBalance≈${bal}` : ""}. Use this for “can I afford X?” and mention Master for Ultra / Standard for research when gated.`;
  }
  if (opts.locale === "zh-cn") {
    return `已登录用户：方案=${plan}，视频上限=${res}，Ultra=${ultra}${bal !== null ? `，余额≈${bal}` : ""}。回答够不够做某功能时用这些数字；Ultra 提 Master，平台研究提 Standard。`;
  }
  return `已登入用戶：方案=${plan}，影片上限=${res}，Ultra=${ultra}${bal !== null ? `，餘額≈${bal}` : ""}。回答夠唔夠做某功能時用呢啲數字；Ultra 提 Master，平台研究提 Standard。`;
}
