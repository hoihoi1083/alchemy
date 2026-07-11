"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center">
      <p className="text-sm font-medium text-slate-700">{m.studio.loadingTitle}</p>
      <p className="max-w-sm text-xs text-slate-500">{m.studio.loadingHint}</p>
    </main>
  );
}

function StudioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [promotionMode, setPromotionMode] = useState<PromotionMode | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("studio-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("studio-theme", theme);
  }, [theme]);

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
    <main
      className={`min-h-screen transition-colors ${
        theme === "dark"
          ? "bg-[radial-gradient(circle_at_top,#0f172a_0%,#111827_45%,#020617_100%)] text-slate-100"
          : "bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef2ff_20%,#f8fafc_45%,#f1f5f9_100%)] text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6">
        <AppHeader
          theme={theme}
          promotionMode={promotionMode}
          onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        />
        <StudioWizard promotionMode={promotionMode} theme={theme} />
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
