"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  STORYBOARD_RECIPE_IDS,
  isLuxuryBirthRecipe,
  storyboardRecipePreviewSrc,
  type StoryboardRecipeId,
} from "@/lib/storyboard-recipes";
import { StoryboardLuxuryStoryDrivers } from "@/components/studio/StoryboardLuxuryStoryDrivers";

export function StoryboardRecipePicker({
  value,
  onChange,
  variant = "light",
  fieldLabels,
  showLuxuryBirth = true,
}: {
  value: StoryboardRecipeId;
  onChange: (id: StoryboardRecipeId) => void;
  variant?: "light" | "dark";
  fieldLabels?: Parameters<typeof StoryboardLuxuryStoryDrivers>[0]["fieldLabels"];
  /** Luxury birth is product-first; hide for concept workflows. */
  showLuxuryBirth?: boolean;
}) {
  const { m } = useLocale();
  const labels = m.wizard.storyboardRecipes;
  const dark = variant === "dark";
  const recipeIds = showLuxuryBirth
    ? STORYBOARD_RECIPE_IDS
    : STORYBOARD_RECIPE_IDS.filter((id) => id !== "luxury-birth");

  return (
    <div className="space-y-2">
      <p
        className={`text-[11px] leading-snug ${dark ? "text-teal-200/80" : "text-slate-500"}`}
      >
        {m.wizard.storyboardRecipeHint}
      </p>
      <div
        className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
        role="listbox"
        aria-label={m.wizard.storyboardRecipeTitle}
      >
        {recipeIds.map((id) => {
          const selected = value === id;
          const copy = labels[id];
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(id)}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                dark
                  ? selected
                    ? "border-amber-300 bg-amber-950/40 text-amber-50"
                    : "border-teal-800/60 bg-slate-950/40 text-teal-50 hover:border-teal-600"
                  : selected
                    ? "border-violet-500 bg-violet-50 text-violet-950 ring-1 ring-violet-300"
                    : "border-slate-200 bg-white text-slate-800 hover:border-violet-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storyboardRecipePreviewSrc(id)}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{copy.title}</span>
                <span
                  className={`mt-0.5 block text-[11px] leading-snug ${
                    dark ? "text-teal-200/75" : "text-slate-500"
                  }`}
                >
                  {copy.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {isLuxuryBirthRecipe(value) && showLuxuryBirth ? (
        <div className="space-y-2">
          <StoryboardLuxuryStoryDrivers variant={variant} fieldLabels={fieldLabels} />
          <p
            className={`text-[11px] leading-snug ${dark ? "text-amber-100/85" : "text-violet-700"}`}
          >
            {m.wizard.storyboardRecipeLuxuryNoRefHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
