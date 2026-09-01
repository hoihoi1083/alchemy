import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamInviteAcceptPageClient } from "@/components/TeamInviteAcceptPageClient";

export const metadata: Metadata = {
  title: "Team Invite — Alchemy AI Lab",
  description: "Accept an enterprise team seat invite.",
};

export default function TeamInvitePage() {
  return (
    <Suspense fallback={null}>
      <TeamInviteAcceptPageClient />
    </Suspense>
  );
}

