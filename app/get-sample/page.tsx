import type { Metadata } from "next";
import { Suspense } from "react";
import { GetSamplePackForm } from "@/components/landing/GetSamplePackForm";
import { GetSamplePackShell } from "@/components/landing/GetSamplePackShell";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Get sample pack · ${PRODUCT_NAME}`,
  description:
    "Leave your name and email to unlock Alchemy AI Lab sample creatives (watermarked).",
  robots: { index: true, follow: true },
};

export default function GetSamplePage() {
  return (
    <GetSamplePackShell variant="form">
      <Suspense
        fallback={
          <div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-2xl bg-white/5" />
        }
      >
        <GetSamplePackForm />
      </Suspense>
    </GetSamplePackShell>
  );
}
