import type { Metadata } from "next";
import { CreateSocialPackClient } from "@/components/create/CreateSocialPackClient";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Create social content · ${PRODUCT_NAME}`,
  description:
    "Plan platform-ready captions and hashtags, then generate fitting stills for Instagram, Facebook, or RedNote.",
};

export default function CreateSocialPackPage() {
  return <CreateSocialPackClient />;
}
