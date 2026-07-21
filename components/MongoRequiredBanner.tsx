"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

export function MongoRequiredBanner() {
  const { m } = useLocale();
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    void (async () => {
      try {
        const res = await fetch("/api/db-health");
        const data = (await res.json()) as {
          ok?: boolean;
          configured?: boolean;
          error?: string;
          code?: string;
        };
        if (data.ok) return;
        setShow(true);
        if (data.code === "MONGODB_URI_MISSING" || data.configured === false) {
          setDetail(null);
        } else if (data.error) {
          setDetail(data.error);
        } else {
          setDetail(null);
        }
      } catch {
        setShow(true);
        setDetail(null);
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
      <p className="mt-1 text-amber-900/90">
        {detail ? (
          <>
            {m.studio.mongoRequiredBodyConnected}{" "}
            <span className="break-all font-mono text-xs">{detail}</span>
          </>
        ) : (
          m.studio.mongoRequiredBody
        )}
      </p>
    </div>
  );
}
