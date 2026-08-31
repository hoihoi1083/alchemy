import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  projectDisplayName,
  type ProjectSnapshot,
} from "@/lib/project-snapshot";
import type { WorkflowMode, WorkflowStepKey } from "@/lib/workflow-mode";
import { stepsForMode } from "@/lib/workflow-mode";
import type { MicroStepId } from "@/lib/wizard-micro-steps.types";
import {
  ACTIVE_PROJECT_STORAGE_KEY,
  FROM_LIBRARY_STORAGE_KEY,
  snapshotFromWizard,
  wasOpenedFromLibrary,
} from "@/lib/wizard-project-snapshot";

export const BROWSE_SESSION_KEY = "alchemy-browse-session";
/** Hydrated project id when opened from Library (session fallback). */
export const LIBRARY_SOURCE_PROJECT_KEY = "alchemy-library-source-project";
/** URL query: `/studio?from=library&project=…` — survives refresh and new tabs. */
export const LIBRARY_FROM_PARAM = "from";
export const LIBRARY_FROM_VALUE = "library";
/** One-shot studio banner after regenerate fork. */
export const FORK_SUCCESS_PARAM = "forked";
/** Library card ring after fork — URL or sessionStorage. */
export const HIGHLIGHT_PROJECT_PARAM = "highlight";
export const HIGHLIGHT_PROJECT_STORAGE_KEY = "alchemy-library-highlight-project";

export function isLibraryBrowseQuery(fromParam: string | null | undefined): boolean {
  return fromParam?.trim().toLowerCase() === LIBRARY_FROM_VALUE;
}

export type ProjectPhase = WorkflowStepKey; // setup | image | video | done

export function markBrowseSession(sourceProjectId?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BROWSE_SESSION_KEY, "1");
    window.sessionStorage.setItem(FROM_LIBRARY_STORAGE_KEY, "1");
    const id = sourceProjectId?.trim();
    if (id) {
      window.sessionStorage.setItem(LIBRARY_SOURCE_PROJECT_KEY, id);
    }
  } catch {
    /* ignore */
  }
}

/** Clears browse + from-library flags and the protected source project id. */
export function clearLibraryBrowseSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BROWSE_SESSION_KEY);
    window.sessionStorage.removeItem(FROM_LIBRARY_STORAGE_KEY);
    window.sessionStorage.removeItem(LIBRARY_SOURCE_PROJECT_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated Prefer clearLibraryBrowseSession */
export function clearBrowseSession(): void {
  clearLibraryBrowseSession();
}

export function librarySourceProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(LIBRARY_SOURCE_PROJECT_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function markLibraryHighlightProjectId(projectId: string): void {
  if (typeof window === "undefined") return;
  const id = projectId.trim();
  if (!id) return;
  try {
    window.sessionStorage.setItem(HIGHLIGHT_PROJECT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Read highlight id from URL, else consume one-shot sessionStorage. */
export function resolveLibraryHighlightProjectId(
  highlightParam: string | null | undefined,
): string | null {
  const fromUrl = highlightParam?.trim();
  if (fromUrl) return fromUrl;
  if (typeof window === "undefined") return null;
  try {
    const id = window.sessionStorage.getItem(HIGHLIGHT_PROJECT_STORAGE_KEY)?.trim();
    if (id) window.sessionStorage.removeItem(HIGHLIGHT_PROJECT_STORAGE_KEY);
    return id || null;
  } catch {
    return null;
  }
}

export function isBrowseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const fromUrl = isLibraryBrowseQuery(
      new URLSearchParams(window.location.search).get(LIBRARY_FROM_PARAM),
    );
    return (
      fromUrl ||
      window.sessionStorage.getItem(BROWSE_SESSION_KEY) === "1" ||
      wasOpenedFromLibrary()
    );
  } catch {
    return false;
  }
}

export function phasesForWorkflow(
  mode: WorkflowMode,
  opts?: { storyboardKeyframes?: boolean },
): ProjectPhase[] {
  return stepsForMode(mode, opts);
}

export function phaseForMicroStep(id: MicroStepId | null | undefined): ProjectPhase {
  if (!id) return "setup";
  if (id === "done.export") return "done";
  if (
    id === "setup.pre_video" ||
    id.startsWith("video.") ||
    id === "wait.video_generate"
  ) {
    return "video";
  }
  if (
    id === "setup.pre_generate" ||
    id.startsWith("image.") ||
    id === "wait.image_generate" ||
    id === "wait.storyboard_generate"
  ) {
    return "image";
  }
  return "setup";
}

export function phaseCompleted(
  phase: ProjectPhase,
  wizard: Pick<
    StudioWizardValue,
    | "imageUrl"
    | "videoUrl"
    | "storyboardScenes"
    | "campaignSlides"
    | "product"
    | "headline"
    | "conceptIdea"
  >,
): boolean {
  const hasImage = Boolean(
    wizard.imageUrl ||
      wizard.storyboardScenes.length > 0 ||
      wizard.campaignSlides.length > 0,
  );
  const hasVideo = Boolean(wizard.videoUrl);
  const hasSetup = Boolean(
    wizard.product.trim() ||
      wizard.headline.trim() ||
      wizard.conceptIdea.trim() ||
      hasImage ||
      hasVideo,
  );
  switch (phase) {
    case "setup":
      return hasSetup;
    case "image":
      return hasImage;
    case "video":
      return hasVideo;
    case "done":
      return hasVideo || hasImage;
    default:
      return false;
  }
}

/** Best micro-step to show for a phase in browse mode. */
export function preferredMicroStepForPhase(
  phase: ProjectPhase,
  steps: Array<{ id: string }>,
  wizard: Pick<
    StudioWizardValue,
    "imageUrl" | "videoUrl" | "storyboardScenes" | "campaignSlides"
  >,
): MicroStepId | null {
  const hasScenes = wizard.storyboardScenes.length > 0;
  const hasImage = Boolean(
    wizard.imageUrl || hasScenes || wizard.campaignSlides.length > 0,
  );
  const hasVideo = Boolean(wizard.videoUrl);
  const has = (id: string) => steps.some((s) => s.id === id);

  const pick = (...ids: string[]): MicroStepId | null => {
    for (const id of ids) {
      if (has(id)) return id as MicroStepId;
    }
    return null;
  };

  switch (phase) {
    case "setup":
      return pick(
        "identity.product_name",
        "identity.concept",
        "identity.concept_topic",
        "route.intake",
        "route.concept_source",
        "copy.edit",
        "route.output_goal",
      );
    case "image":
      if (hasScenes || hasImage) {
        return pick("image.review", "setup.pre_generate", "image.generate");
      }
      return pick("setup.pre_generate", "image.generate", "image.review");
    case "video":
      if (hasVideo) {
        return pick("setup.pre_video", "video.generate", "done.export");
      }
      return pick("setup.pre_video", "video.generate");
    case "done":
      return pick("done.export", "image.review");
    default:
      return null;
  }
}

export function shouldShowPhaseStepper(
  wizard: Pick<
    StudioWizardValue,
    "imageUrl" | "videoUrl" | "storyboardScenes" | "campaignSlides"
  >,
): boolean {
  if (isBrowseSession()) return true;
  return Boolean(
    wizard.imageUrl ||
      wizard.videoUrl ||
      wizard.storyboardScenes.length > 0 ||
      wizard.campaignSlides.length > 0,
  );
}

type ForkHandler = () => Promise<void>;
let forkHandler: ForkHandler | null = null;
/** Coalesce concurrent regenerate clicks into a single fork. */
let forkInFlight: Promise<void> | null = null;

export function registerProjectForkHandler(handler: ForkHandler | null): void {
  forkHandler = handler;
}

/**
 * When regenerating existing outputs, fork into a new Mongo project first
 * so the previous library card stays unchanged.
 * Concurrent callers await the same in-flight fork (no double POST).
 */
export async function maybeForkProjectBeforeRegenerate(
  hasExistingOutput: boolean,
): Promise<void> {
  if (!hasExistingOutput || !forkHandler) return;
  if (forkInFlight) {
    await forkInFlight;
    return;
  }
  const run = (async () => {
    await forkHandler!();
  })();
  forkInFlight = run;
  try {
    await run;
  } finally {
    if (forkInFlight === run) forkInFlight = null;
  }
}

/** True when only inputs/settings/prompts changed — media URLs unchanged. */
export function isBrowseInputOnlyChange(
  next: ProjectSnapshot,
  baselineJson: string,
): boolean {
  if (!baselineJson || baselineJson === "__remote_unknown__") return false;
  try {
    const baseline = JSON.parse(baselineJson) as ProjectSnapshot;
    return JSON.stringify(next.media) === JSON.stringify(baseline.media);
  } catch {
    return false;
  }
}

export async function createForkedProject(input: {
  promotionMode: PromotionMode;
  snapshot: ProjectSnapshot;
  baseName?: string;
}): Promise<string | null> {
  const stamp = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const base =
    input.baseName?.trim() ||
    projectDisplayName(input.snapshot.inputs, "Project");
  const name = `${base} · ${stamp}`;
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      promotionMode: input.promotionMode,
      name,
      snapshot: input.snapshot,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  const id = data.id?.trim() || null;
  if (!id) return null;
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

export function buildForkSnapshot(
  wizard: StudioWizardValue,
  promotionMode: PromotionMode,
): ProjectSnapshot {
  return snapshotFromWizard(wizard, promotionMode);
}
