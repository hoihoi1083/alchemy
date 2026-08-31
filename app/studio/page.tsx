"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { StudioNav } from "@/components/studio/StudioNav";
import { StudioModeBar } from "@/components/studio/StudioModeBar";
import { StudioWizard } from "@/components/StudioWizard";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
  canUseTemplate,
  minPlanForTemplate,
} from "@/lib/billing/plan-gates";
import {
  isPromotionMode,
  readStoredPromotionMode,
  storePromotionMode,
  type PromotionMode,
} from "@/lib/promotion-mode";
import { isTemplateId, TEMPLATE_PREF_KEY } from "@/lib/template-pref";
import type { TemplateId } from "@/lib/templates";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
  storeLandingRecipe,
} from "@/lib/landing-recipes";

function StudioLoading() {
  const { m } = useLocale();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white px-6 text-center">
      <p className="text-sm font-medium text-slate-700">{m.studio.loadingTitle}</p>
      <p className="max-w-sm text-xs text-slate-500">{m.studio.loadingHint}</p>
    </main>
  );
}

function StudioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { m } = useLocale();
  const { plan, planReady } = useUserPlanEntitlements();
  const [promotionMode, setPromotionMode] = useState<PromotionMode | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateTemplate, setGateTemplate] = useState<TemplateId | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("mode");
    const template = searchParams.get("template");
    const recipe = searchParams.get("recipe");
    const project = searchParams.get("project")?.trim();
    if (project) {
      try {
        window.localStorage.setItem("alchemy-active-project-id", project);
      } catch {
        /* ignore */
      }
    }

    if (template && isTemplateId(template)) {
      // Wait for /api/me so Master users aren't falsely gated as Free.
      if (!planReady) return;
      if (!canUseTemplate(plan, template)) {
        window.sessionStorage.removeItem(TEMPLATE_PREF_KEY);
        setGateTemplate(template);
        setGateOpen(true);
      } else {
        window.sessionStorage.setItem(TEMPLATE_PREF_KEY, template);
      }
    }

    if (isLandingRecipeId(recipe)) {
      storeLandingRecipe(recipe);
      const mode = LANDING_RECIPES[recipe].promotionMode;
      storePromotionMode(mode);
      setPromotionMode(mode);
      return;
    }
    if (isPromotionMode(fromUrl)) {
      storePromotionMode(fromUrl);
      setPromotionMode(fromUrl);
      return;
    }
    const stored = readStoredPromotionMode();
    if (stored) {
      setPromotionMode(stored);
      return;
    }
    // Template-only deep link still needs a promotion mode.
    if (template && isTemplateId(template)) {
      storePromotionMode("physical");
      setPromotionMode("physical");
      return;
    }
    router.replace("/start");
  }, [searchParams, router, plan, planReady]);

  if (!promotionMode) {
    return (
      <>
        <StudioLoading />
        {gateTemplate ? (
          <PlanGateDialog
            open={gateOpen}
            onClose={() => {
              setGateOpen(false);
              router.replace("/start");
            }}
            requiredPlan={minPlanForTemplate(gateTemplate)}
            featureLabel={m.templates[gateTemplate].name}
          />
        ) : null}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <StudioNav trailing={<StudioModeBar promotionMode={promotionMode} />} />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:pb-8">
        <StudioWizard promotionMode={promotionMode} theme="light" />
      </div>
      {gateTemplate ? (
        <PlanGateDialog
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          requiredPlan={minPlanForTemplate(gateTemplate)}
          featureLabel={m.templates[gateTemplate].name}
        />
      ) : null}
    </main>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioPageContent />
    </Suspense>
  );
}
