"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioNav } from "@/components/studio/StudioNav";
import { StudioModeBar } from "@/components/studio/StudioModeBar";
import { StudioWizard } from "@/components/StudioWizard";
import { useLocale } from "@/components/LocaleProvider";
import {
  isPromotionMode,
  readStoredPromotionMode,
  storePromotionMode,
  type PromotionMode,
} from "@/lib/promotion-mode";
import { isTemplateId, TEMPLATE_PREF_KEY } from "@/lib/template-pref";

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
  const [promotionMode, setPromotionMode] = useState<PromotionMode | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("mode");
    const template = searchParams.get("template");
    if (template && isTemplateId(template)) {
      window.sessionStorage.setItem(TEMPLATE_PREF_KEY, template);
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
    router.replace("/start");
  }, [searchParams, router]);

  if (!promotionMode) {
    return <StudioLoading />;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <StudioNav trailing={<StudioModeBar promotionMode={promotionMode} />} />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:pb-8">
        <StudioWizard promotionMode={promotionMode} theme="light" />
      </div>
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
