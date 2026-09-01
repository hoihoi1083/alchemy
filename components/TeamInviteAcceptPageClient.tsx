"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

type AcceptErrorBody = {
  error?: string;
  invitedEmail?: string | null;
  ownerSignedIn?: boolean;
};

export function TeamInviteAcceptPageClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { m } = useLocale();
  const t = m.account.team;
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [wrongAccount, setWrongAccount] = useState(false);
  const token = searchParams.get("token")?.trim() ?? "";

  useEffect(() => {
    if (!isLoaded) return;
    if (!token) {
      setStatus("error");
      setMessage(t.inviteMissingToken);
      return;
    }
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    setStatus("loading");
    setWrongAccount(false);
    void fetch("/api/team/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as AcceptErrorBody;
        if (!res.ok) {
          const invited = data.invitedEmail?.trim() || "";
          if (invited) {
            setWrongAccount(true);
            throw new Error(
              data.ownerSignedIn
                ? t.inviteWrongEmailOwner.replace("{email}", invited)
                : t.inviteWrongEmailFor.replace("{email}", invited),
            );
          }
          throw new Error(data.error ?? t.inviteFailedAccept);
        }
        setStatus("ok");
        setMessage(t.inviteOk);
      })
      .catch((err: unknown) => {
        setStatus("error");
        const raw = err instanceof Error ? err.message : t.inviteFailedAccept;
        setMessage(/different email address/i.test(raw) ? t.inviteWrongEmail : raw);
      });
  }, [
    isLoaded,
    isSignedIn,
    token,
    t.inviteFailedAccept,
    t.inviteMissingToken,
    t.inviteOk,
    t.inviteWrongEmail,
    t.inviteWrongEmailFor,
    t.inviteWrongEmailOwner,
  ]);

  const waitingForAuth = !isLoaded || (!isSignedIn && Boolean(token) && status === "idle");

  function switchAccount() {
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`,
    );
    void signOut({ redirectUrl: `/sign-in?redirect_url=${next}` });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-16 text-slate-900">
      <h1 className="text-2xl font-semibold tracking-tight">{t.inviteAcceptTitle}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.inviteAcceptSubtitle}</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        {waitingForAuth ? (
          <p className="text-sm text-slate-700">{t.inviteSignIn}</p>
        ) : status === "loading" ? (
          <p className="text-sm text-slate-700">{t.inviteAccepting}</p>
        ) : status === "ok" ? (
          <>
            <p className="text-sm text-emerald-700">{message}</p>
            <Link
              href="/account"
              className="mt-4 inline-block rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              {t.inviteGoAccount}
            </Link>
          </>
        ) : status === "error" ? (
          <>
            <p className="text-sm text-red-700">{message}</p>
            {wrongAccount ? (
              <button
                type="button"
                onClick={switchAccount}
                className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {t.inviteSwitchAccount}
              </button>
            ) : (
              <Link
                href="/account"
                className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {t.inviteBack}
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-700">{t.inviteSignIn}</p>
        )}
      </div>
    </main>
  );
}
