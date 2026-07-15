"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { CREDITS_EVENT } from "@/lib/credits-client";

function AccountMenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path
        fillRule="evenodd"
        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AuthNavBody() {
  const { isSignedIn, isLoaded } = useAuth();
  const { m } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState<number | null>(null);

  const redirectUrl = useMemo(() => {
    const query = searchParams.toString();
    const path = pathname || "/start";
    return query ? `${path}?${query}` : path;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isSignedIn) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    void fetch("/api/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          user?: { creditBalance?: number | null } | null;
        };
        if (cancelled) return;
        const bal = data.user?.creditBalance;
        setBalance(typeof bal === "number" ? bal : 0);
      })
      .catch(() => {
        /* ignore — balance is optional chrome */
      });

    const onCredits = (event: Event) => {
      const bal = (event as CustomEvent<{ balance?: number }>).detail?.balance;
      if (typeof bal === "number") setBalance(bal);
    };
    window.addEventListener(CREDITS_EVENT, onCredits);
    return () => {
      cancelled = true;
      window.removeEventListener(CREDITS_EVENT, onCredits);
    };
  }, [isSignedIn]);

  if (!isLoaded) {
    return <div className="h-9 w-20" aria-hidden />;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2.5">
        {typeof balance === "number" && (
          <Link
            href="/account"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            title={m.auth.tokensBalanceTitle}
          >
            {m.auth.tokensBalance.replace("{n}", balance.toLocaleString())}
          </Link>
        )}
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link
              label={m.auth.accountMenu}
              labelIcon={<AccountMenuIcon />}
              href="/account"
            />
          </UserButton.MenuItems>
        </UserButton>
      </div>
    );
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
