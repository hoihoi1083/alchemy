"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

export function GetSamplePackForm() {
  const { m, locale } = useLocale();
  const S = m.landing.samplePack;
  const router = useRouter();
  const search = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utm = useMemo(
    () => ({
      utmSource: search.get("utm_source") ?? undefined,
      utmCampaign: search.get("utm_campaign") ?? undefined,
    }),
    [search],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sample-pack-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company,
          locale,
          ...utm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        if (data.error === "email_invalid") setError(S.errorEmail);
        else if (data.error === "name_required") setError(S.errorName);
        else setError(S.errorGeneric);
        return;
      }
      router.push("/get-sample/thanks");
    } catch {
      setError(S.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative mx-auto w-full max-w-md space-y-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur-md"
    >
      <div>
        <label
          htmlFor="sample-name"
          className="block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          {S.nameLabel}
        </label>
        <input
          id="sample-name"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-400/60"
          placeholder={S.namePlaceholder}
        />
      </div>
      <div>
        <label
          htmlFor="sample-email"
          className="block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          {S.emailLabel}
        </label>
        <input
          id="sample-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-400/60"
          placeholder={S.emailPlaceholder}
        />
      </div>
      {/* Bot honeypot — clipped off-screen; do not use visible label text. */}
      <div
        className="pointer-events-none absolute -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <label htmlFor="sample-company">
          <span className="sr-only">Company</span>
        </label>
        <input
          id="sample-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-400 disabled:opacity-60"
      >
        {busy ? S.submitting : S.submit}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        {S.privacyNote}{" "}
        <Link href="/privacy" className="underline hover:text-slate-300">
          Privacy
        </Link>
      </p>
    </form>
  );
}
