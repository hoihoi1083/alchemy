"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useLocale } from "@/components/LocaleProvider";

function AuthNavBody() {
  const { isSignedIn, isLoaded } = useAuth();
  const { m } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectUrl = useMemo(() => {
    const query = searchParams.toString();
    const path = pathname || "/start";
    return query ? `${path}?${query}` : path;
  }, [pathname, searchParams]);

  if (!isLoaded) {
    return <div className="h-9 w-20" aria-hidden />;
  }

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
      <button
        type="button"
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {m.auth.signIn}
      </button>
    </SignInButton>
  );
}

export function AuthNav() {
  return (
    <Suspense fallback={<div className="h-9 w-20" aria-hidden />}>
      <AuthNavBody />
    </Suspense>
  );
}
