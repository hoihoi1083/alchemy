import { BrandKitPageClient } from "@/components/BrandKitPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand kit — Alchemy AI Lab",
  description:
    "Upload your logo and brand colors once. Opt in to stamp the logo on video storyboard stills — or leave it off so stills stay logo-free.",
};

export default function BrandKitPage() {
  return <BrandKitPageClient />;
}
