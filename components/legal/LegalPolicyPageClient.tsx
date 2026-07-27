"use client";

import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";
import { getLegalDocument, type LegalKind } from "@/lib/legal";

export function LegalPolicyPageClient({ kind }: { kind: LegalKind }) {
  const { m, locale } = useLocale();
  const doc = getLegalDocument(kind, locale);
  const f = m.footer;

  const siblings: { kind: LegalKind; label: string; href: string }[] = [
    { kind: "privacy", label: f.privacy, href: "/privacy" },
    { kind: "terms", label: f.terms, href: "/terms" },
    { kind: "refund", label: f.refund, href: "/refund" },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
      <div className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90">
              <img
                src={PRODUCT_LOGO_SRC}
                alt={PRODUCT_LOGO_ALT}
                className="h-10 w-10 rounded-xl object-contain"
              />
              <p className="text-lg font-semibold tracking-tight">{PRODUCT_NAME}</p>
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <LanguageToggle variant="light" />
              <AuthNav />
            </div>
          </div>

          <nav className="mb-8 flex flex-wrap gap-2 text-xs">
            {siblings.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`rounded-full border px-3 py-1.5 font-medium ${
                  s.kind === kind
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {doc.lastUpdatedLabel}: {doc.lastUpdated}
          </p>

          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-slate-700">
            {doc.intro.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>

          <div className="mt-10 space-y-8">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">
                  {section.paragraphs.map((p) => (
                    <p key={`${section.heading}-${p.slice(0, 40)}`}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 text-sm text-slate-500">
            <Link href="/" className="underline hover:text-slate-800">
              {m.header.homeLink}
            </Link>
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
