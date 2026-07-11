"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

export function MongoRequiredBanner() {
  const { m } = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    void (async () => {
      try {
        const res = await fetch("/api/db-health");
        const data = (await res.json()) as { ok?: boolean };
        if (!data.ok) setShow(true);
      } catch {
        setShow(true);
      }
    })();
  }, []);

  if (!show) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">{m.studio.mongoRequiredTitle}</p>
      <p className="mt-1 text-amber-900/90">{m.studio.mongoRequiredBody}</p>
    </div>
  );
}
