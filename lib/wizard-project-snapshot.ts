import type { CampaignSlide } from "@/hooks/useWizardState";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import { EMPTY_PROJECT_SNAPSHOT } from "@/lib/project-snapshot";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";
import type {
  MicroStepId,
  MicroWizardContext,
} from "@/lib/wizard-micro-steps.types";

export const ACTIVE_PROJECT_STORAGE_KEY = "alchemy-active-project-id";
export const PROJECT_RESUME_STORAGE_KEY = "alchemy-project-resume";

export type ProjectResumeHint = {
  targetMicroStep?: MicroStepId;
  microContext: Partial<MicroWizardContext>;
};

/**
 * Keep URLs that survive a page reload. Drop blob:/data: and ephemeral
 * /api/pipeline-files/ (Vercel /tmp). Keep absolute http(s) and durable
 * /api/library/download/:id (relative — what persistAndDurablize returns).
 */
export function persistableMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("blob:") || u.startsWith("data:")) return null;
  if (u.startsWith("/api/pipeline-files/")) return null;
  if (isLibraryAssetUrl(u) || u.startsWith("/api/library/download/")) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return null;
}

/** Build a Mongo-safe snapshot from live wizard state (skips blob: URLs). */
export function snapshotFromWizard(
  wizard: StudioWizardValue,
  promotionMode: PromotionMode,
): ProjectSnapshot {
  const base = EMPTY_PROJECT_SNAPSHOT(promotionMode);
  return {
    version: 1,
    inputs: {
      ...base.inputs,
      product: wizard.product,
      headline: wizard.headline,
      subline: wizard.subline,
      business: wizard.business,
      offer: wizard.offer,
      conceptIdea: wizard.conceptIdea,
      promptExtra: wizard.promptExtra,
      promptMarket: wizard.promptMarket,
      subjectFraming: wizard.subjectFraming,
      campaignTheme: wizard.campaignTheme,
      brandWebsiteUrl: wizard.brandWebsiteUrl,
      brandSocialHint: wizard.brandSocialHint,
      creativeVideoBrief: wizard.creativeVideoBrief,
      storyboardBrief: wizard.storyboardBrief,
    },
    settings: {
      workflowMode: wizard.workflowMode,
      visualStyleId: wizard.visualStyleId,
      artStyleId: wizard.artStyleId,
      templateId: wizard.templateId,
      promotionMode,
      imageCreativeMode: wizard.imageCreativeMode,
      videoCreativeMode: wizard.videoCreativeMode,
      imageOutputMode: wizard.imageOutputMode,
      imageAspectRatio: wizard.imageAspectRatio,
      imageInputMode: wizard.imageInputMode,
      stepKey: wizard.stepKey,
    },
    prompts: {
      imagePrompt: wizard.imagePrompt,
      videoPrompt: wizard.videoPrompt,
      negativePrompt: wizard.negativePrompt,
    },
    plans: {
      brandProfile: wizard.brandProfile,
      userReferenceBrief: wizard.userReferenceBrief,
      campaignPlan: wizard.campaignPlan,
      teachingCarouselPlan: null,
      storyboardPlan: wizard.storyboardPlan,
      adPackPlan: wizard.adPackPlan,
      contentResearchPlan: null,
      selectedResearchAngleId: null,
    },
    media: {
      imageUrl: persistableMediaUrl(wizard.imageUrl),
      imageVariantUrls: wizard.imageVariantUrls
        .map((u) => persistableMediaUrl(u))
        .filter((u): u is string => Boolean(u)),
      videoUrl: persistableMediaUrl(wizard.videoUrl),
      uploadPreviewUrl: persistableMediaUrl(wizard.uploadPreviewUrl),
      imageRefPreviewUrl: persistableMediaUrl(wizard.imageRefPreviewUrl),
      campaignSlideUrls: (wizard.campaignSlides ?? [])
        .map((s) => persistableMediaUrl(s.imageUrl))
        .filter((u): u is string => Boolean(u)),
      storyboardSceneUrls: (wizard.storyboardScenes ?? [])
        .map((s) => persistableMediaUrl(s.imageUrl))
        .filter((u): u is string => Boolean(u)),
      carouselSlideUrls: [],
    },
    outputs: {
      captionLines: wizard.captionLines,
    },
  };
}

/** Rebuild storyboard stills from durable URLs + optional plan metadata. */
export function storyboardScenesFromSnapshot(
  snapshot: ProjectSnapshot,
): StoryboardSceneResult[] {
  const planScenes = snapshot.plans.storyboardPlan?.scenes ?? [];
  const urls = snapshot.media.storyboardSceneUrls
    .map((u) => persistableMediaUrl(u))
    .filter((u): u is string => Boolean(u));
  return urls.map((imageUrl, i) => {
    const plan = planScenes[i];
    const imageIndex = plan?.imageIndex ?? i + 1;
    return {
      imageIndex,
      role: plan?.role ?? `scene-${imageIndex}`,
      startSec: plan?.startSec ?? i * 2,
      endSec: plan?.endSec ?? (i + 1) * 2,
      sceneDescriptionZh: plan?.sceneDescriptionZh ?? "",
      onImageCopyZh: plan?.onImageCopyZh,
      imageUrl,
      imagePrompt: plan?.imagePrompt,
    };
  });
}

/** Rebuild campaign slides from durable URLs + optional plan metadata. */
export function campaignSlidesFromSnapshot(snapshot: ProjectSnapshot): CampaignSlide[] {
  const planSlides = snapshot.plans.campaignPlan?.slides ?? [];
  const urls = snapshot.media.campaignSlideUrls
    .map((u) => persistableMediaUrl(u))
    .filter((u): u is string => Boolean(u));
  return urls.map((imageUrl, i) => {
    const plan = planSlides[i];
    return {
      role: plan?.role ?? "hero",
      title: plan?.title ?? `Slide ${i + 1}`,
      headline: plan?.headline ?? "",
      subline: plan?.subline ?? "",
      imageUrl,
    };
  });
}

/** True when a snapshot has nothing worth keeping (fresh empty project). */
export function snapshotLooksEmpty(snapshot: ProjectSnapshot): boolean {
  const { inputs, media, plans, prompts } = snapshot;
  const hasCopy = Boolean(
    inputs.product.trim() ||
      inputs.headline.trim() ||
      inputs.conceptIdea.trim() ||
      inputs.storyboardBrief.trim() ||
      inputs.creativeVideoBrief.trim() ||
      inputs.business.trim() ||
      inputs.offer.trim(),
  );
  const hasMedia = Boolean(
    media.imageUrl ||
      media.videoUrl ||
      media.uploadPreviewUrl ||
      media.imageRefPreviewUrl ||
      media.storyboardSceneUrls.length ||
      media.campaignSlideUrls.length ||
      media.imageVariantUrls.length,
  );
  const hasPlans = Boolean(
    plans.storyboardPlan || plans.campaignPlan || plans.adPackPlan || plans.brandProfile,
  );
  const hasPrompts = Boolean(
    prompts.imagePrompt.trim() || prompts.videoPrompt.trim(),
  );
  return !hasCopy && !hasMedia && !hasPlans && !hasPrompts;
}

/**
 * Block silent data loss: never PATCH an empty draft over a project that
 * already had media / plans / copy.
 */
export function shouldBlockEmptyOverwrite(
  incoming: ProjectSnapshot,
  previousJson: string,
): boolean {
  if (!previousJson.trim()) return false;
  // Loaded project id but GET failed — never wipe remote with an empty boot.
  if (previousJson === "__remote_unknown__") {
    return snapshotLooksEmpty(incoming);
  }
  if (!snapshotLooksEmpty(incoming)) return false;
  try {
    const previous = JSON.parse(previousJson) as ProjectSnapshot;
    return !snapshotLooksEmpty(previous);
  } catch {
    return false;
  }
}

/** Micro-wizard routing + landing step after Open Studio hydrate. */
export function buildProjectResumeHint(snapshot: ProjectSnapshot): ProjectResumeHint {
  const { settings, media } = snapshot;
  const microContext: Partial<MicroWizardContext> = {
    promotionMode: settings.promotionMode,
    workflowMode: settings.workflowMode,
    intakePath: "direct",
  };

  if (settings.workflowMode === "combined") {
    if (settings.visualStyleId === "concept-cinematic") {
      microContext.combinedStyle = "cinematic";
    } else {
      microContext.combinedStyle = "storyboard";
    }
  }

  if (media.storyboardSceneUrls.length > 0) {
    return { targetMicroStep: "image.review", microContext };
  }
  if (media.videoUrl) {
    return { targetMicroStep: "done.export", microContext };
  }
  if (media.imageUrl || media.campaignSlideUrls.length > 0) {
    return { targetMicroStep: "setup.pre_video", microContext };
  }
  return { microContext };
}

/** Fetch a durable library/CDN still into a File so generate APIs can re-attach it after reopen. */
export async function fileFromPersistableUrl(
  url: string | null | undefined,
  basename: string,
): Promise<File | null> {
  const persistable = persistableMediaUrl(url);
  if (!persistable || typeof fetch === "undefined") return null;
  try {
    const res = await fetch(persistable, {
      credentials: persistable.startsWith("/") ? "include" : "omit",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (type.includes("text/html") || type.includes("application/json")) return null;
    const blob = await res.blob();
    if (blob.size < 32) return null;
    const mime = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/png";
    const ext = mime.includes("jpeg")
      ? "jpg"
      : mime.includes("webp")
        ? "webp"
        : mime.includes("png")
          ? "png"
          : "jpg";
    return new File([blob], `${basename}.${ext}`, { type: mime });
  } catch {
    return null;
  }
}

export function writeProjectResumeHint(hint: ProjectResumeHint): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PROJECT_RESUME_STORAGE_KEY, JSON.stringify(hint));
  } catch {
    /* ignore quota */
  }
}

export function clearProjectResumeHint(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PROJECT_RESUME_STORAGE_KEY);
  } catch {
    /* ignore quota */
  }
}

export function peekProjectResumeHint(): ProjectResumeHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PROJECT_RESUME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectResumeHint;
  } catch {
    return null;
  }
}

export function consumeProjectResumeHint(): ProjectResumeHint | null {
  const hint = peekProjectResumeHint();
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(PROJECT_RESUME_STORAGE_KEY);
  }
  return hint;
}
