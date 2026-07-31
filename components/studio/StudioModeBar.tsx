"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import type { PromotionMode } from "@/lib/promotion-mode";

/** Compact mode chip under LandingNav — not a hero header. */
export function StudioModeBar({ promotionMode }: { promotionMode: PromotionMode }) {
  const { m } = useLocale();
  const isConcept = promotionMode === "concept";

  return (
    <>
      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
        {isConcept ? m.header.promotionConcept : m.header.promotionPhysical}
      </span>
      <Link
        href="/start"
        className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
      >
        {m.header.switchPromotion}
      </Link>
    </>
  );
}
