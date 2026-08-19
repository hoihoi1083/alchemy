import type { Metadata } from "next";
import { TeamInviteAcceptPageClient } from "@/components/TeamInviteAcceptPageClient";

export const metadata: Metadata = {
  title: "Team Invite — Alchemy AI Lab",
  description: "Accept an enterprise team seat invite.",
};

export default function TeamInvitePage() {
  return <TeamInviteAcceptPageClient />;
}

