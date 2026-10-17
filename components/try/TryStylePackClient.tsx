"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { Messages } from "@/lib/i18n";
import {
  estimateStylePackTokens,
  type StylePack,
  type StylePackShot,
} from "@/lib/style-packs";

type TryStyleCopy = Messages["landing"]["tryStyle"];

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function shotName(copy: TryStyleCopy, shot: StylePackShot): string {
  const id = shot.id as keyof TryStyleCopy["shots"];
  return id in copy.shots ? copy.shots[id] : shot.label;
}

type ShotResult = {
  shotId: string;
  label: string;
  url: string | null;
  error: string | null;
};

type ApiOk = {
  packId: string;
  results: ShotResult[];
  tokensCharged: number;
  tokensRefunded?: number;
  creditBalance?: number | null;
  error?: string;
};

function aspectClass(ratio: StylePackShot["aspectRatio"]): string {
  if (ratio === "4:5") return "aspect-[4/5]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "16:9") return "aspect-video";
  return "aspect-[4/3]";
}

export function TryStylePackClient({ pack }: { pack: StylePack }) {
  const { m } = useLocale();
  const t = m.landing.tryStyle;
  const [productName, setProductName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ShotResult[] | null>(null);
  const [tokensCharged, setTokensCharged] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const tokenEstimate = useMemo(() => estimateStylePackTokens(pack, "1K"), [pack]);
  const cover = pack.shots.find((s) => s.role === "cover") ?? pack.shots[0];
  const lifestyle = pack.shots.filter((s) => s !== cover);

  const resultById = useMemo(() => {
    const map = new Map<string, ShotResult>();
    for (const r of results ?? []) map.set(r.shotId, r);
    return map;
  }, [results]);

  const lightboxShots = pack.shots.filter((s) => resultById.get(s.id)?.url);

  useEffect(() => {
    if (!results || !resultsRef.current) return;
    resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [results]);

  useEffect(() => {
    if (lightbox == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        setLightbox((i) => (i == null ? i : (i + 1) % lightboxShots.length));
      }
      if (e.key === "ArrowLeft") {
        setLightbox((i) =>
          i == null ? i : (i - 1 + lightboxShots.length) % lightboxShots.length,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, lightboxShots.length]);

  function takeFile(next: File | null) {
    if (next && !next.type.startsWith("image/")) {
      setError(t.errorImage);
      return;
    }
    setFile(next);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  async function onGenerate() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResults(null);
    setTokensCharged(null);
    setLightbox(null);

    const body = new FormData();
    body.set("packId", pack.id);
    body.set("productName", productName.trim());
    body.set("product", file);

    try {
      const res = await fetch("/api/try-style-pack", { method: "POST", body });
      const data = (await res.json()) as ApiOk & { error?: string };
      if (!res.ok) {
        setError(data.error ?? t.errorGeneric);
        if (Array.isArray(data.results)) setResults(data.results);
        return;
      }
      setResults(data.results ?? []);
      setTokensCharged(typeof data.tokensCharged === "number" ? data.tokensCharged : null);
    } catch {
      setError(t.errorNetwork);
    } finally {
      setBusy(false);
    }
  }

  function openLightbox(shotId: string) {
    const idx = lightboxShots.findIndex((s) => s.id === shotId);
    if (idx >= 0) setLightbox(idx);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
          {t.subtitle}
        </p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.85fr)] lg:items-stretch">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              takeFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`group relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-dashed px-3 py-5 text-left transition sm:min-h-[220px] sm:px-4 sm:py-6 ${
              dragOver
                ? "border-violet-300 bg-violet-500/15"
                : "border-white/20 bg-black/25 hover:border-violet-300/60 hover:bg-white/[0.04]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => takeFile(e.target.files?.[0] ?? null)}
            />
            {previewUrl ? (
              <div className="flex w-full flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={t.yourProduct}
                  className="h-32 w-32 shrink-0 rounded-xl bg-black/40 object-contain sm:h-48 sm:w-48"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                    {t.yourProduct}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white">{file?.name}</p>
                  <p className="mt-2 text-xs text-slate-400">{t.replaceHint}</p>
                </div>
              </div>
            ) : (
              <div className="px-2 text-center">
                <p className="text-sm font-semibold text-white">{t.dropTitle}</p>
                <p className="mt-1 text-xs text-slate-400">{t.dropHint}</p>
                <span className="mt-4 inline-flex min-h-9 items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-violet-500">
                  {t.chooseFile}
                </span>
              </div>
            )}
          </button>

          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-black/20 p-4 sm:p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                {t.packTitle}
              </p>
              <label className="mt-3 block text-sm font-medium text-slate-200">
                {t.productName}
                <span className="ml-1 font-normal text-slate-500">{t.optional}</span>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  maxLength={80}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-base text-white placeholder:text-slate-500 outline-none focus:border-violet-400/70 sm:text-sm"
                />
              </label>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">{t.styleNote}</p>
            </div>
            <div>
              <button
                type="button"
                disabled={!file || busy}
                onClick={() => void onGenerate()}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t.generating : t.generate}
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
                {fill(t.costLine, { count: pack.shots.length, tokens: tokenEstimate })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#f6f1ea] p-3 text-slate-800 sm:p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t.lockedLooks}
          </p>
          <ul className="grid grid-cols-5 gap-1.5 sm:gap-3">
            {pack.shots.map((shot) => (
              <li key={shot.id} className="min-w-0">
                <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/10 sm:rounded-xl">
                  <Image
                    src={shot.refPath}
                    alt=""
                    width={320}
                    height={400}
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <p className="mt-1.5 line-clamp-2 text-center text-[10px] font-medium leading-tight text-slate-600 sm:text-[11px]">
                  {shotName(t, shot)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </section>

      <section ref={resultsRef} className="scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {results ? t.yourPack : t.whatYouGet}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {results
                ? tokensCharged != null
                  ? fill(t.chargedHint, { tokens: tokensCharged })
                  : t.enlargeHint
                : t.layoutHint}
            </p>
          </div>
          <Link href="/studio" className="text-xs font-medium text-violet-300 hover:underline">
            {t.openStudio}
          </Link>
        </div>

        {busy ? (
          <p className="mb-3 text-sm text-violet-200">
            {fill(t.busyLine, { count: pack.shots.length })}
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
          {cover ? (
            <ShotCard
              copy={t}
              shot={cover}
              result={resultById.get(cover.id)}
              busy={busy}
              featured
              onOpen={() => openLightbox(cover.id)}
              downloadName={`${pack.id}-${cover.id}.jpg`}
            />
          ) : null}
          <ul className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
            {lifestyle.map((shot) => (
              <li key={shot.id}>
                <ShotCard
                  copy={t}
                  shot={shot}
                  result={resultById.get(shot.id)}
                  busy={busy}
                  onOpen={() => openLightbox(shot.id)}
                  downloadName={`${pack.id}-${shot.id}.jpg`}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {lightbox != null && lightboxShots[lightbox] ? (
        <Lightbox
          copy={t}
          label={shotName(t, lightboxShots[lightbox])}
          shot={lightboxShots[lightbox]}
          url={resultById.get(lightboxShots[lightbox].id)?.url ?? ""}
          index={lightbox}
          total={lightboxShots.length}
          onClose={() => setLightbox(null)}
          onPrev={() =>
            setLightbox((i) =>
              i == null ? i : (i - 1 + lightboxShots.length) % lightboxShots.length,
            )
          }
          onNext={() => setLightbox((i) => (i == null ? i : (i + 1) % lightboxShots.length))}
        />
      ) : null}
    </div>
  );
}

function ShotCard({
  copy,
  shot,
  result,
  busy,
  featured,
  onOpen,
  downloadName,
}: {
  copy: TryStyleCopy;
  shot: StylePackShot;
  result?: ShotResult;
  busy: boolean;
  featured?: boolean;
  onOpen: () => void;
  downloadName: string;
}) {
  const url = result?.url ?? null;
  const failed = Boolean(result && !result.url);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-black/30 ${
        featured ? "border-violet-400/30" : "border-white/10"
      }`}
    >
      <div
        className={`relative w-full bg-black/40 ${aspectClass(shot.aspectRatio)} ${
          featured ? "max-sm:max-h-[68vh]" : ""
        }`}
      >
        {url ? (
          <button type="button" onClick={onOpen} className="absolute inset-0 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={shotName(copy, shot)} className="h-full w-full object-cover" />
          </button>
        ) : failed ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-red-200">
            {result?.error ?? copy.failedStill}
          </div>
        ) : busy ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-500/20 via-white/5 to-transparent" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.18),transparent_55%)]" />
        )}
        {!url && !failed ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center">
            <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-sm">
              {busy
                ? copy.generatingShot
                : shot.role === "cover"
                  ? copy.coverPlaceholder
                  : copy.stillPlaceholder}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3 sm:py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {shot.role === "cover" ? copy.cover : shotName(copy, shot)}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {shot.role === "cover" ? copy.coverRole : copy.lifestyleRole}
          </p>
        </div>
        {url ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onOpen}
              className="min-h-8 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10"
            >
              {copy.view}
            </button>
            <a
              href={url}
              download={downloadName}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-400"
            >
              {copy.save}
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Lightbox({
  copy,
  label,
  shot,
  url,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  copy: TryStyleCopy;
  label: string;
  shot: StylePackShot;
  url: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label || shot.label}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label || shot.label}
          className="max-h-[68vh] w-full rounded-2xl object-contain sm:max-h-[80vh]"
        />
        <div className="mt-3 flex flex-col gap-3 text-sm text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate">
            {label}{" "}
            <span className="text-slate-400">
              {index + 1} / {total}
            </span>
          </p>
          <div className="grid grid-cols-4 gap-2 sm:flex">
            <button
              type="button"
              onClick={onPrev}
              className="min-h-10 rounded-full border border-white/20 px-2 py-2 text-xs hover:bg-white/10 sm:px-3 sm:text-sm"
            >
              {copy.prev}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="min-h-10 rounded-full border border-white/20 px-2 py-2 text-xs hover:bg-white/10 sm:px-3 sm:text-sm"
            >
              {copy.next}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-violet-500 px-2 py-2 text-xs font-semibold hover:bg-violet-400 sm:px-3 sm:text-sm"
            >
              {copy.save}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-full border border-white/20 px-2 py-2 text-xs hover:bg-white/10 sm:px-3 sm:text-sm"
            >
              {copy.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
