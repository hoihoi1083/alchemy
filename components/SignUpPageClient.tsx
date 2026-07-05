"use client";

import { SignUp } from "@clerk/nextjs";
import { LanguageToggle } from "@/components/LanguageToggle";

export function SignUpPageClient() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="mb-6">
        <LanguageToggle variant="light" />
      </div>
      <SignUp />
    </main>
  );
}
