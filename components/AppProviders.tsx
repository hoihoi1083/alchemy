"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { GlobalStudioAssistant } from "@/components/assistant/GlobalStudioAssistant";
import { LocaleProvider, useLocale } from "@/components/LocaleProvider";
import { MixpanelProvider } from "@/components/MixpanelProvider";
import { SyncUserOnAuth } from "@/components/SyncUserOnAuth";
import { UserPlanProvider } from "@/components/UserPlanProvider";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { clerkLocalizationFor } from "@/lib/clerk-localization";

function ClerkWithLocale({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      localization={clerkLocalizationFor(locale)}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      key={locale}
    >
      <UserPlanProvider>
        <SyncUserOnAuth />
        <MixpanelProvider />
        <AuthModalProvider>
          {children}
          <GlobalStudioAssistant />
        </AuthModalProvider>
      </UserPlanProvider>
    </ClerkProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ClerkWithLocale>{children}</ClerkWithLocale>
    </LocaleProvider>
  );
}
