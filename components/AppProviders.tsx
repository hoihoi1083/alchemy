"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { GlobalStudioAssistant } from "@/components/assistant/GlobalStudioAssistant";
import { LocaleProvider, useLocale } from "@/components/LocaleProvider";
import { MixpanelProvider } from "@/components/MixpanelProvider";
import { SyncUserOnAuth } from "@/components/SyncUserOnAuth";
import { clerkLocalizationFor } from "@/lib/clerk-localization";

function ClerkWithLocale({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  return (
    <ClerkProvider localization={clerkLocalizationFor(locale)} key={locale}>
      <SyncUserOnAuth />
      <MixpanelProvider />
      {children}
      <GlobalStudioAssistant />
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
