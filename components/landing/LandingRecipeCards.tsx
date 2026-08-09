"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import {
  isTvcLandingRecipe,
  LANDING_RECIPES,
  landingRecipesForPromotion,
  studioRecipeHref,
} from "@/lib/landing-recipes";
import type { PromotionMode } from "@/lib/promotion-mode";

/**
 * 1-tap finishable recipes (deep-link into /studio?recipe=…).
 * Product + concept parity — same two walks after /start mode pick.
 */
export function LandingRecipeCards() {
  const { m } = useLocale();
  const copy = m.landing.recipes;

  const groups: Array<{ mode: PromotionMode; label: string }> = [
    { mode: "physical", label: copy.physicalGroup },
    { mode: "concept", label: copy.conceptGroup },
  ];

  return (
    <section className="w-full border-t border-slate-200/80 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          {copy.badge}
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {copy.title}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-slate-600">
          {copy.subtitle}
        </p>
        <div className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.mode}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {landingRecipesForPromotion(group.mode).map((id) => {
                  const item = copy.items[id];
                  return (
                    <Link
                      key={id}
                      href={studioRecipeHref(id)}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-emerald-500/70 hover:shadow-[0_10px_30px_-18px_rgba(16,185,129,0.55)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={LANDING_RECIPES[id].previewSrc}
                        alt=""
                        className="aspect-[16/10] w-full object-cover"
                      />
                      <span className="flex flex-1 flex-col p-5">
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          {item.costHint}
                        </p>
                        {isTvcLandingRecipe(id) ? (
                          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-amber-800">
                            {copy.tvcPaidHint}
                          </p>
                        ) : null}
                        <p className="mt-4 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                          {copy.cta} →
                        </p>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
