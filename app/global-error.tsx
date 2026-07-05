"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          The app hit an unexpected error. You can try again or refresh the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-900"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
