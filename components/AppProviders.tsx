"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { LocaleProvider, useLocale } from "@/components/LocaleProvider";
import { SyncUserOnAuth } from "@/components/SyncUserOnAuth";
import { clerkLocalizationFor } from "@/lib/clerk-localization";

function ClerkWithLocale({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  return (
    <ClerkProvider localization={clerkLocalizationFor(locale)} key={locale}>
      <SyncUserOnAuth />
      {children}
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
