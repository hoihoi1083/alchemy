"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { startHref } from "@/lib/promotion-mode";

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
            return (
              <Link
                key={tpl.id}
                href={startHref(tpl.id)}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-emerald-400 hover:shadow-md"
              >
                <p className="text-2xl">{tpl.icon}</p>
                <h3 className="mt-3 font-semibold text-slate-900">{copy.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{copy.description}</p>
                <p className="mt-4 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  {m.landing.useTemplate} →
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
