import { LibraryPageClient } from "@/components/LibraryPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My library — Alchemy AI Lab",
  description: "Browse and download your studio projects, images, and videos.",
};

export default function LibraryPage() {
  return <LibraryPageClient />;
}
