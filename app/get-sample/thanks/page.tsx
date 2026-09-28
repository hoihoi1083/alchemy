import type { Metadata } from "next";
import { SamplePackGallery } from "@/components/landing/SamplePackGallery";
import { GetSamplePackShell } from "@/components/landing/GetSamplePackShell";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Your sample pack · ${PRODUCT_NAME}`,
  robots: { index: false, follow: false },
};

export default function GetSampleThanksPage() {
  return (
    <GetSamplePackShell variant="thanks">
      <SamplePackGallery />
    </GetSamplePackShell>
  );
}
