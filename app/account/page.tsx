import { AccountPageClient } from "@/components/AccountPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account — alchemy.ai",
  description: "Your plan, token balance, and billing history.",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
