import type { CampaignSlide } from "@/hooks/useWizardState";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { ProjectResumeCursor, ProjectSnapshot } from "@/lib/project-snapshot";
import { EMPTY_PROJECT_SNAPSHOT } from "@/lib/project-snapshot";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";
import type {
  MicroStepId,
  MicroWizardContext,
} from "@/lib/wizard-micro-steps.types";

export const ACTIVE_PROJECT_STORAGE_KEY = "alchemy-active-project-id";
export const PROJECT_RESUME_STORAGE_KEY = "alchemy-project-resume";
export const FROM_LIBRARY_STORAGE_KEY = "alchemy-from-library";
export const LAST_MICRO_STEP_KEY = "alchemy-last-micro-step";
export const WIZARD_V2_CONTEXT_KEY = "wizardV2Context";

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

function readSessionMicroContext(): Partial<MicroWizardContext> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(WIZARD_V2_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as Partial<MicroWizardContext>) : {};
  } catch {
    return {};
  }
}

function readLastMicroStepId(): MicroStepId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_MICRO_STEP_KEY);
    return (raw as MicroStepId) || null;
  } catch {
    return null;
  }
}

/** Persist current micro step so the next autosave snapshot can reopen here. */
export function rememberLastMicroStep(stepId: MicroStepId | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (!stepId) {
      window.sessionStorage.removeItem(LAST_MICRO_STEP_KEY);
      return;
    }
    window.sessionStorage.setItem(LAST_MICRO_STEP_KEY, stepId);
  } catch {
    /* ignore quota */
  }
}

export function markOpenedFromLibrary(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FROM_LIBRARY_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearOpenedFromLibrary(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FROM_LIBRARY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function wasOpenedFromLibrary(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const fromUrl =
      new URLSearchParams(window.location.search).get("from")?.trim().toLowerCase() ===
      "library";
    return fromUrl || window.sessionStorage.getItem(FROM_LIBRARY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function resumeCursorFromSession(): ProjectResumeCursor {
  const ctx = readSessionMicroContext();
  return {
    microStepId: readLastMicroStepId(),
    intakePath: ctx.intakePath ?? null,
    intakeTemplateMode: ctx.intakeTemplateMode ?? null,
    conceptSource: ctx.conceptSource ?? null,
    videoSubpath: ctx.videoSubpath ?? null,
    combinedStyle: ctx.combinedStyle ?? null,
  };
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
      carouselIntent: wizard.carouselIntent,
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
      selectedResearchAngleId: wizard.contentResearchApplyRef?.angle?.id ?? null,
      // Text + CDN URLs only — never image/video bytes (user can re-fetch from post).
      contentResearchApplyRef: wizard.contentResearchApplyRef
        ? {
            angle: wizard.contentResearchApplyRef.angle,
            plan: wizard.contentResearchApplyRef.plan,
          }
        : null,
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
    resume: resumeCursorFromSession(),
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
 * already had media / plans / copy. Never PATCH after a failed hydrate.
 */
export function shouldBlockEmptyOverwrite(
  incoming: ProjectSnapshot,
  previousJson: string,
): boolean {
  if (!previousJson.trim()) return false;
  // Loaded project id but GET failed — never wipe remote.
  if (previousJson === "__remote_unknown__") {
    return true;
  }
  if (!snapshotLooksEmpty(incoming)) return false;
  try {
    const previous = JSON.parse(previousJson) as ProjectSnapshot;
    return !snapshotLooksEmpty(previous);
  } catch {
    return false;
  }
}

/** Library card chip: where Continue will reopen. */
export function projectResumeSurfaceLabel(row: {
  videoUrl?: string | null;
  imageUrl?: string | null;
  hasScenes?: boolean;
}): "export" | "scenes" | "image" | "setup" {
  if (row.videoUrl) return "export";
  if (row.hasScenes) return "scenes";
  if (row.imageUrl) return "image";
  return "setup";
}

function microContextFromSnapshot(snapshot: ProjectSnapshot): Partial<MicroWizardContext> {
  const { settings, plans, resume } = snapshot;
  const hasResearch = Boolean(plans.contentResearchApplyRef);
  const microContext: Partial<MicroWizardContext> = {
    promotionMode: settings.promotionMode,
    workflowMode: settings.workflowMode,
    intakePath: resume?.intakePath ?? (hasResearch ? "research" : "direct"),
  };
  if (resume?.intakeTemplateMode) {
    microContext.intakeTemplateMode = resume.intakeTemplateMode;
  } else if (!hasResearch) {
    microContext.intakeTemplateMode = "direct";
  }
  if (resume?.conceptSource) microContext.conceptSource = resume.conceptSource;
  else if (hasResearch && settings.promotionMode === "concept") {
    microContext.conceptSource = "research";
  }
  if (resume?.videoSubpath) microContext.videoSubpath = resume.videoSubpath;
  if (resume?.combinedStyle) {
    microContext.combinedStyle = resume.combinedStyle;
  } else if (settings.workflowMode === "combined") {
    microContext.combinedStyle =
      settings.visualStyleId === "concept-cinematic" ? "cinematic" : "storyboard";
  }
  return microContext;
}

/**
 * Infer landing micro-step from media when no saved cursor, or when the
 * saved cursor is a wait/route step that should not be restored blindly.
 */
export function inferResumeTargetFromMedia(snapshot: ProjectSnapshot): MicroStepId | undefined {
  const { settings, media } = snapshot;
  const hasScenes = media.storyboardSceneUrls.length > 0;
  const hasVideo = Boolean(media.videoUrl);
  const hasImage = Boolean(media.imageUrl || media.campaignSlideUrls.length > 0);
  const imageOnly = settings.workflowMode === "image-only";

  // Finished video wins — even if scenes still exist.
  if (hasVideo) return "done.export";
  if (hasScenes) return "image.review";
  if (hasImage) {
    // Image-only graphs have image.review → done.export (no setup.pre_video).
    if (imageOnly) return "image.review";
    return "setup.pre_video";
  }
  return undefined;
}

function isRestorableMicroStep(id: MicroStepId | null | undefined): id is MicroStepId {
  if (!id) return false;
  // Don't reopen on wait/entry routing — prefer media-based landing.
  if (id.startsWith("wait.")) return false;
  if (id === "entry.start" || id === "route.output_goal") return false;
  return true;
}

/** Micro-wizard routing + landing step after Open Studio hydrate. */
export function buildProjectResumeHint(snapshot: ProjectSnapshot): ProjectResumeHint {
  const microContext = microContextFromSnapshot(snapshot);
  const saved = snapshot.resume?.microStepId;
  const target =
    (isRestorableMicroStep(saved) ? saved : undefined) ??
    inferResumeTargetFromMedia(snapshot);
  if (target) return { targetMicroStep: target, microContext };
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

/** Whether media is ready to land on a resume target step. */
export function resumeTargetReady(
  target: MicroStepId | undefined,
  state: {
    hasScenes: boolean;
    hasVideo: boolean;
    hasImage: boolean;
  },
): boolean {
  if (!target) return true;
  if (target === "image.review") return state.hasScenes || state.hasImage;
  if (target === "done.export") return state.hasVideo || state.hasImage;
  if (target === "setup.pre_video") return state.hasImage || state.hasScenes;
  if (target === "setup.pre_generate" || target === "image.generate") {
    return true;
  }
  // Other saved steps (identity, setup, copy…) — no media gate.
  return true;
}

/** Resolve a target that exists in the current step list, with media fallbacks. */
export function resolveResumeStepIndex(
  steps: Array<{ id: string }>,
  target: MicroStepId | undefined,
  state: { hasScenes: boolean; hasVideo: boolean; hasImage: boolean },
): number {
  if (target) {
    const exact = steps.findIndex((s) => s.id === target);
    if (exact >= 0) return exact;
  }
  if (state.hasVideo) {
    const exportIdx = steps.findIndex((s) => s.id === "done.export");
    if (exportIdx >= 0) return exportIdx;
  }
  if (state.hasScenes || state.hasImage) {
    const review = steps.findIndex((s) => s.id === "image.review");
    if (review >= 0) return review;
  }
  if (state.hasImage) {
    const preVideo = steps.findIndex((s) => s.id === "setup.pre_video");
    if (preVideo >= 0) return preVideo;
    const exportIdx = steps.findIndex((s) => s.id === "done.export");
    if (exportIdx >= 0) return exportIdx;
  }
  return 0;
}
