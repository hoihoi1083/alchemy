"use client";

import Link from "next/link";
import { useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import { canUseTemplate, minPlanForTemplate } from "@/lib/billing/plan-gates";
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { startHref } from "@/lib/promotion-mode";
import { templateGalleryOutput } from "@/lib/template-gallery-meta";

const FEATURED: TemplateId[] = [
  "product-reel",
  "shop-promo",
  "crystal-promo",
  "testimonial",
  "pricing-offer",
  "paper-sticker-reel",
];

export function TemplateGallery() {
  const { m } = useLocale();
  const { plan, planReady } = useUserPlanEntitlements();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateTemplate, setGateTemplate] = useState<TemplateId>("product-reel");
  const cards = TEMPLATES.filter((t) => FEATURED.includes(t.id));

  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {m.landing.templatesBadge}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{m.landing.templatesTitle}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">{m.landing.templatesSubtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((tpl) => {
            const copy = m.templates[tpl.id];
            const output = templateGalleryOutput(tpl.id);
            const outputLabel =
              output === "video" ? m.landing.templateOutputVideo : m.landing.templateOutputImage;
            // Until plan loads, treat as allowed so we don't flash lock badges.
            const allowed = !planReady || canUseTemplate(plan, tpl.id);
            const required = minPlanForTemplate(tpl.id);
            const planName =
              required === "custom"
                ? m.pricing.plans.custom.name
                : m.pricing.plans[required].name;

            const inner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-2xl">{tpl.icon}</p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        output === "video"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-cyan-100 text-cyan-900"
                      }`}
                    >
                      {outputLabel}
                    </span>
                    {planReady && !allowed && required !== "free" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        {planName}+
                      </span>
                    ) : null}
                  </div>
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{copy.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{copy.description}</p>
                <p className="mt-4 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  {m.landing.useTemplate} →
                </p>
              </>
            );

            if (allowed) {
              return (
                <Link
                  key={tpl.id}
                  href={startHref(tpl.id)}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-emerald-400 hover:shadow-md"
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  if (!planReady) return;
                  setGateTemplate(tpl.id);
                  setGateOpen(true);
                }}
                className="group w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-left transition hover:border-violet-300 hover:shadow-md"
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan={minPlanForTemplate(gateTemplate)}
        featureLabel={m.templates[gateTemplate].name}
      />
    </section>
  );
}
