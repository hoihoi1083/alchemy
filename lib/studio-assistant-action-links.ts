import type { Locale } from "@/lib/i18n";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import {
  actionLinkForTask,
  getNextStudioCoachTask,
  stripInvalidActionLinks,
  type CoachTaskKind,
} from "@/lib/studio-assistant-coach";
import type { StudioAssistantActionId } from "@/lib/studio-assistant-types";

export const STUDIO_ACTION_IDS: StudioAssistantActionId[] = [
  "apply-8s-recipe",
  "apply-cinematic-stitch",
  "concept-cinematic",
  "website-launch-image",
  "open-captions",
  "open-edit-image",
  "open-ultra-canvas",
  "open-pro",
  "open-brand-kit",
  "open-library",
  "open-ugc",
  "open-pricing",
  "setup-website-reel",
  "analyze-brand",
  "open-concept-studio",
  "open-physical-studio",
  "open-reference-ad-studio",
  "open-storyboard-studio",
];

const VALID_SET = new Set<string>(STUDIO_ACTION_IDS);

const LANDING_TASKS = new Set<CoachTaskKind>([
  "route-website-reel",
  "route-website-image",
  "route-cinematic-stitch",
  "route-physical-product",
  "route-physical-image-post",
  "route-reference-ad",
  "route-storyboard",
  "route-concept-studio",
  "route-captions",
  "route-edit-image",
  "route-ultra-canvas",
]);

const STUDIO_LINK_TASKS = new Set<CoachTaskKind>(["analyze-brand", "analyze-brand-before-image"]);

function mapUnknownSlug(slug: string): StudioAssistantActionId {
  const s = slug.toLowerCase().replace(/_/g, "-");
  if (VALID_SET.has(s)) return s as StudioAssistantActionId;
  if (/edit.?image|inpaint|修圖|修图|改圖|改图/.test(s)) return "open-edit-image";
  if (/caption|字幕/.test(s)) return "open-captions";
  if (/^ultra$|ultra-canvas|ultra canvas|^pro$|pro-canvas|node/.test(s)) return "open-ultra-canvas";
  if (/brand.?kit|品牌套件|brand kit/.test(s)) return "open-brand-kit";
  if (/library|作品庫|作品库/.test(s)) return "open-library";
  if (/ugc/.test(s)) return "open-ugc";
  if (/analyze|brand|品牌/.test(s)) return "analyze-brand";
  if (/stitch|拼接|longer|24/.test(s)) return "apply-8s-recipe";
  if (/static|launch|上線|上线|mockup|poster/.test(s)) return "website-launch-image";
  if (/storyboard|分鏡|分镜/.test(s)) return "open-storyboard-studio";
  if (/reference|參考|参考|对标|對標|xhs|小紅|小红|layout/.test(s)) return "open-reference-ad-studio";
  if (/physical|product|實體|实体/.test(s)) return "open-physical-studio";
  if (/concept|studio|open|設定|设置|campaign|world|cup|reel|setup|website|8s|8秒/.test(s)) {
    return "setup-website-reel";
  }
  return "setup-website-reel";
}

export function normalizeAssistantActionLinks(text: string): string {
  return text.replace(
    /\[([^\]]+)\]\(studio-action:([^)]+)\)/gi,
    (full, label: string, slug: string) => {
      const trimmed = slug.trim();
      const id = VALID_SET.has(trimmed)
        ? (trimmed as StudioAssistantActionId)
        : mapUnknownSlug(trimmed);
      return `[${label}](studio-action:${id})`;
    },
  );
}

export function replyHasValidActionLink(text: string): boolean {
  return /\[([^\]]+)\]\(studio-action:(setup-website-reel|analyze-brand|open-concept-studio|open-physical-studio|open-reference-ad-studio|open-storyboard-studio|apply-cinematic-stitch|website-launch-image|open-captions|open-edit-image|open-ultra-canvas|open-pro|open-brand-kit|open-library|open-ugc|open-pricing|apply-8s-recipe|concept-cinematic)\)/i.test(
    text,
  );
}

export function appendPrimaryActionIfMissing(
  text: string,
  opts: {
    snapshot: StudioAssistantSnapshot;
    locale: Locale;
    userWritesEnglish: boolean;
    hasWebsiteUrl: boolean;
    campaignHint?: string;
    detectedUrl?: string;
    userText?: string;
    intent?: import("@/lib/studio-assistant-intent").StudioAssistantIntent;
  },
): string {
  const out = stripInvalidActionLinks(text, opts.snapshot);
  if (replyHasValidActionLink(out)) return out;

  const task = getNextStudioCoachTask(opts.snapshot, {
    detectedUrl: opts.detectedUrl,
    userText: opts.userText,
    intent: opts.intent,
  });

  const needsLink =
    LANDING_TASKS.has(task) ||
    STUDIO_LINK_TASKS.has(task) ||
    (opts.snapshot.surface !== "studio" && task === "route-website-reel");

  if (!needsLink) return out;

  const en = opts.userWritesEnglish;
  const link = actionLinkForTask(task, en);
  if (!link) return out;

  const preamble = en ? "\n\nStep 1 — action button:" : "\n\n第一步 — 操作掣：";
  return out + preamble + "\n" + link;
}

export function userWritesEnglish(text: string): boolean {
  return (
    /^[\x00-\x7F\s]+$/.test(text.trim()) ||
    /\b(i want|my website|help me|generate|promote|world cup|feature|teach me|how to|storyboard|product)\b/i.test(
      text,
    )
  );
}
