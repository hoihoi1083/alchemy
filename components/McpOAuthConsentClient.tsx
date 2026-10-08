"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

export type McpOAuthConsentParams = {
  clientId: string;
  clientName: string | null;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  scope: string;
  resource: string;
  error: string | null;
};

export function McpOAuthConsentClient({ params }: { params: McpOAuthConsentParams }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.error);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mcp/oauth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: params.clientId,
          redirect_uri: params.redirectUri,
          code_challenge: params.codeChallenge,
          code_challenge_method: params.codeChallengeMethod,
          state: params.state,
          scope: params.scope,
          resource: params.resource,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirect_to?: string;
        error?: string;
        error_description?: string;
      };
      if (!res.ok || !data.redirect_to) {
        throw new Error(data.error_description || data.error || "Could not approve");
      }
      window.location.href = data.redirect_to;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve");
      setBusy(false);
    }
  }

  function deny() {
    try {
      const redirect = new URL(params.redirectUri);
      redirect.searchParams.set("error", "access_denied");
      if (params.state) redirect.searchParams.set("state", params.state);
      window.location.href = redirect.toString();
    } catch {
      router.push("/account");
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Redirecting to sign in…</p>
      </main>
    );
  }

  const appLabel = params.clientName?.trim() || "Grok / MCP client";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <img
            src={PRODUCT_LOGO_SRC}
            alt={PRODUCT_LOGO_ALT}
            className="h-10 w-10 rounded-xl object-contain"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sign in with Alchemy
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {PRODUCT_NAME}
            </h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-900">{appLabel}</span> wants to use your
          Alchemy wallet to generate marketing stills and video via MCP.
        </p>

        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>See your plan and token balance</li>
          <li>Generate and edit images / video (charged to your tokens)</li>
          <li>Read library assets and brand kit when you ask</li>
        </ul>

        <p className="mt-4 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500">
          {params.redirectUri}
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            disabled={busy || Boolean(params.error)}
            onClick={() => void approve()}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Allow"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={deny}
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Deny
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/account" className="underline underline-offset-2 hover:text-slate-700">
            Account & MCP keys
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-700">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-700">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
