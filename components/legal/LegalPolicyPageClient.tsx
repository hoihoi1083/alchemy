"use client";

import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useLocale } from "@/components/LocaleProvider";
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
    <main className="flex min-h-screen flex-col overflow-x-clip bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
      <LandingNav />

      <div className="flex-1 bg-white">
        <article className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14 md:px-8 md:py-16">
          <nav className="mb-8 flex flex-wrap gap-2" aria-label="Legal">
            {siblings.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  s.kind === kind
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <header className="border-b border-slate-100 pb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600">
              {f.legalTitle}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {doc.title}
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {doc.lastUpdatedLabel}: {doc.lastUpdated}
            </p>
          </header>

          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-slate-600">
            {doc.intro.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>

          <div className="mt-10 space-y-8">
            {doc.sections.map((section) => (
              <section key={section.heading} className="scroll-mt-24">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  {section.paragraphs.map((p) => (
                    <p key={`${section.heading}-${p.slice(0, 40)}`}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-slate-100 pt-8 text-sm text-slate-500">
            <Link href="/" className="font-medium text-violet-700 hover:text-violet-500">
              ← {m.header.homeLink}
            </Link>
          </p>
        </article>
      </div>

      <LandingFooter />
    </main>
  );
}
