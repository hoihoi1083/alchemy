"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { m } = useLocale();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">{m.studio.errorTitle}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">{m.studio.errorBody}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
        >
          {m.studio.errorRetry}
        </button>
        <Link
          href="/start"
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700"
        >
          {m.studio.errorBackStart}
        </Link>
      </div>
    </main>
  );
}
