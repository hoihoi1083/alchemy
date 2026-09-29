/**
 * Storyboard product analytics (Mixpanel).
 * - Storyboard Used: each successful full scene-image generate
 * - Storyboard Fix: post-generate edits (regen / replace / reorder / stamp / replan)
 * Trial vs paid is a property only — counts always, for every user.
 */
import { trackEvent, incrementPeopleProperty } from "@/components/MixpanelProvider";
import { assistantAttributionAnalyticsProps } from "@/lib/studio-assistant-attribution";

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export type StoryboardFixAction =
  | "regenerate_scene"
  | "replace_image"
  | "reorder"
  | "stamp_logo"
  | "replan";

function withBase(
  props?: AnalyticsProps,
  inProTrial?: boolean | null,
): AnalyticsProps {
  return {
    ...assistantAttributionAnalyticsProps(),
    ...(typeof inProTrial === "boolean" ? { in_pro_trial: inProTrial } : {}),
    ...props,
  };
}

/** Successful full storyboard stills generate (one “use”). */
export function trackStoryboardUsed(opts: {
  sceneCount: number;
  inProTrial?: boolean | null;
  recipeId?: string | null;
  path?: string;
}) {
  trackEvent(
    "Storyboard Used",
    withBase(
      {
        stage: "images",
        scene_count: opts.sceneCount,
        recipe_id: opts.recipeId ?? undefined,
        path: opts.path ?? "/api/generate-storyboard-images",
      },
      opts.inProTrial,
    ),
  );
  incrementPeopleProperty("storyboard_uses", 1);
}

/** One fix after images exist — include running count since last generate. */
export function trackStoryboardFix(opts: {
  action: StoryboardFixAction;
  fixesSinceGenerate: number;
  inProTrial?: boolean | null;
  sceneIndex?: number;
  sceneCount?: number;
}) {
  trackEvent(
    "Storyboard Fix",
    withBase(
      {
        action: opts.action,
        fixes_since_generate: opts.fixesSinceGenerate,
        scene_index:
          typeof opts.sceneIndex === "number" ? opts.sceneIndex + 1 : undefined,
        scene_count: opts.sceneCount,
      },
      opts.inProTrial,
    ),
  );
  incrementPeopleProperty("storyboard_fixes", 1);
}
