import { PricingPageClient } from "@/components/PricingPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — alchemy.ai",
  description:
    "Token-based plans for AI marketing images and video. Free, Standard, Pro, and Master — plus token top-ups.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
