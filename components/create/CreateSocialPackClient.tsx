"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useId, useState } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLocale } from "@/components/LocaleProvider";
import { uploadFileViaLibraryPresign } from "@/lib/library-presign-upload-client";
import { defaultEditEndpoint } from "@/lib/image-endpoints";
import { dualProductIdentityHint } from "@/lib/fal-dual-reference-urls";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  SOCIAL_PACK_PLATFORMS,
  sanitizeSocialPackAspectRatio,
  type SocialPackPlan,
  type SocialPackPlatform,
} from "@/lib/social-pack-plan";

type Step = "brief" | "plan" | "generate" | "done";

const ASPECT_OPTIONS = ["4:5", "3:4", "1:1", "9:16"] as const;

function withCount(template: string, n: number) {
  return template.replace(/\{n\}/g, String(n));
}

type ShotResult = {
  role: string;
  prompt: string;
  imageUrl: string | null;
  error: string | null;
};

type LocalImage = {
  file: File | null;
  preview: string | null;
  url: string | null;
};

function emptyImage(): LocalImage {
  return { file: null, preview: null, url: null };
}

function ImageUploadCard({
  title,
  hint,
  image,
  onChange,
  uploadLabel,
  changeLabel,
  removeLabel,
}: {
  title: string;
  hint: string;
  image: LocalImage;
  onChange: (file: File | null) => void;
  uploadLabel: string;
  changeLabel: string;
  removeLabel: string;
}) {
  const inputId = useId();
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="text-sm font-medium text-slate-800">{title}</span>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <label
        htmlFor={inputId}
        className="mt-3 inline-flex cursor-pointer rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
      >
        {image.file ? changeLabel : uploadLabel}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {image.file ? (
        <p className="mt-2 truncate text-xs text-slate-500">{image.file.name}</p>
      ) : null}
      {image.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.preview}
          alt={title}
          className="mt-3 h-28 w-full rounded-lg object-cover"
        />
      ) : null}
      {image.file || image.preview ? (
        <button
          type="button"
          className="mt-2 text-xs text-slate-500 underline hover:text-slate-800"
          onClick={() => onChange(null)}
        >
          {removeLabel}
        </button>
      ) : null}
    </div>
  );
}

export function CreateSocialPackClient() {
  const { isSignedIn } = useAuth();
  const { m } = useLocale();
  const S = m.landing.socialPack;
  const [step, setStep] = useState<Step>("brief");
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState<SocialPackPlatform>("instagram");
  const [imageCount, setImageCount] = useState(3);
  const [product, setProduct] = useState<LocalImage>(emptyImage);
  const [styleRef, setStyleRef] = useState<LocalImage>(emptyImage);

  const [plan, setPlan] = useState<SocialPackPlan | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");
  const [aspectRatio, setAspectRatio] = useState("4:5");
  const [busy, setBusy] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shots, setShots] = useState<ShotResult[]>([]);
  const [copied, setCopied] = useState(false);

  const setLocalImage = useCallback((setter: typeof setProduct, prev: LocalImage, file: File | null) => {
    if (prev.preview) URL.revokeObjectURL(prev.preview);
    setter({
      file,
      preview: file ? URL.createObjectURL(file) : null,
      url: null,
    });
  }, []);

  const postText = [caption.trim(), hashtagsText.trim()]
    .filter(Boolean)
    .join("\n\n");

  async function ensureUploaded(img: LocalImage): Promise<string | null> {
    if (img.url) return img.url;
    if (!img.file) return null;
    return uploadFileViaLibraryPresign(img.file, { kind: "image" });
  }

  async function resolveRefUrls(): Promise<{
    productUrl: string | null;
    styleUrl: string | null;
    imageUrls: string[];
  }> {
    let productUrl = product.url;
    if (product.file && !productUrl) {
      productUrl = await ensureUploaded(product);
      if (productUrl) setProduct((p) => ({ ...p, url: productUrl }));
    }
    let styleUrl = styleRef.url;
    if (styleRef.file && !styleUrl) {
      styleUrl = await ensureUploaded(styleRef);
      if (styleUrl) setStyleRef((p) => ({ ...p, url: styleUrl }));
    }
    return {
      productUrl,
      styleUrl,
      imageUrls: [productUrl, styleUrl].filter((u): u is string => Boolean(u)),
    };
  }

  async function generateOneShot(
    shot: { role: string; prompt: string },
    refs: { productUrl: string | null; styleUrl: string | null; imageUrls: string[] },
    ratio: string,
  ): Promise<ShotResult> {
    let prompt = shot.prompt;
    if (refs.productUrl && refs.styleUrl) {
      prompt = `${dualProductIdentityHint(false)}\n\n${prompt}`;
    } else if (refs.styleUrl && !refs.productUrl) {
      prompt = [
        "IMAGE 1 is a style/layout reference ONLY — match composition, lighting mood, color energy, and typography vibe.",
        "Create new content for the brief; do not copy the reference product or logos.",
        prompt,
      ].join("\n");
    }

    const body: Record<string, unknown> = {
      prompt,
      aspect_ratio: ratio,
      num_images: 1,
      resolution: "1K",
    };
    if (refs.imageUrls.length > 0) {
      body.image_urls = refs.imageUrls;
      body.mode = "refine";
      body.endpoint = defaultEditEndpoint();
    }

    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      imageUrl?: string;
      imageUrls?: string[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || "Image generation failed.");
    }
    const url = data.imageUrl || data.imageUrls?.[0] || null;
    return {
      role: shot.role,
      prompt: shot.prompt,
      imageUrl: url,
      error: url ? null : "No image returned",
    };
  }

  async function runExpandBrief() {
    setError(null);
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/create")}`;
      return;
    }
    const seed = brief.trim();
    if (seed.length < 2) {
      setError(S.needSeed);
      return;
    }
    setExpanding(true);
    try {
      const res = await fetch("/api/expand-social-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, platform }),
      });
      const data = (await res.json()) as { brief?: string; error?: string };
      if (!res.ok || !data.brief) {
        throw new Error(data.error || "Could not expand that brief.");
      }
      setBrief(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExpanding(false);
    }
  }

  async function runPlan() {
    setError(null);
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/create")}`;
      return;
    }
    const trimmed = brief.trim();
    if (trimmed.length < 8) {
      setError(S.needBrief);
      return;
    }
    setBusy(true);
    try {
      const productUrl = await ensureUploaded(product);
      if (productUrl) setProduct((p) => ({ ...p, url: productUrl }));
      const styleUrl = await ensureUploaded(styleRef);
      if (styleUrl) setStyleRef((p) => ({ ...p, url: styleUrl }));

      const res = await fetch("/api/plan-social-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: trimmed,
          platform,
          imageCount,
          hasProductPhoto: Boolean(productUrl),
          hasStyleRef: Boolean(styleUrl),
        }),
      });
      const data = (await res.json()) as { plan?: SocialPackPlan; error?: string };
      if (!res.ok || !data.plan) {
        throw new Error(data.error || "Could not plan this pack.");
      }
      setPlan(data.plan);
      setCaption(data.plan.caption);
      setHashtagsText(data.plan.hashtags.join(" "));
      setAspectRatio(
        sanitizeSocialPackAspectRatio(data.plan.aspectRatio, "4:5"),
      );
      setStep("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runGenerate() {
    if (!plan) return;
    setError(null);
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/create")}`;
      return;
    }
    setBusy(true);
    setStep("generate");
    const ratio = sanitizeSocialPackAspectRatio(aspectRatio, plan.aspectRatio);
    const next: ShotResult[] = plan.shots.map((s) => ({
      role: s.role,
      prompt: s.prompt,
      imageUrl: null,
      error: null,
    }));
    setShots(next);

    try {
      const refs = await resolveRefUrls();
      const updatedPlan = { ...plan, aspectRatio: ratio };
      setPlan(updatedPlan);

      for (let i = 0; i < plan.shots.length; i++) {
        try {
          next[i] = await generateOneShot(plan.shots[i]!, refs, ratio);
        } catch (e) {
          next[i] = {
            ...next[i]!,
            error: e instanceof Error ? e.message : String(e),
          };
        }
        setShots([...next]);
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function regenShot(index: number) {
    if (!plan || busy) return;
    setError(null);
    setRegenIndex(index);
    setBusy(true);
    try {
      const refs = await resolveRefUrls();
      const ratio = sanitizeSocialPackAspectRatio(aspectRatio, plan.aspectRatio);
      const result = await generateOneShot(plan.shots[index]!, refs, ratio);
      setShots((prev) => {
        const copy = [...prev];
        copy[index] = result;
        return copy;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setRegenIndex(null);
    }
  }

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(S.copyFailed);
    }
  }

  const estimate = plan?.tokenEstimate ?? imageCount * TOKEN_COST.image;
  const platformLabel = (p: SocialPackPlatform) => S.platforms[p];

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
      <LandingNav />
      <main className="relative flex-1 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          {S.title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          {S.subtitle}
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {step === "brief" ? (
          <section className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {S.productLabel}
                </span>
                <button
                  type="button"
                  disabled={busy || expanding}
                  onClick={() => void runExpandBrief()}
                  className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                >
                  {expanding ? S.aiThinking : S.aiThink}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{S.productHint}</p>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={brief.trim().length > 120 ? 6 : 3}
                placeholder={S.productPlaceholder}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-violet-400/50 focus:border-violet-300 focus:ring-2"
              />
            </div>

            <div>
              <span className="text-sm font-medium text-slate-800">
                {S.platformLabel}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {SOCIAL_PACK_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      platform === p
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-600/25"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    {platformLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                {S.imageCountLabel}
              </span>
              <select
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {withCount(S.tokenEstimate, imageCount * TOKEN_COST.image)}
              </p>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploadCard
                title={S.productPhotoTitle}
                hint={S.productPhotoHint}
                image={product}
                onChange={(file) => setLocalImage(setProduct, product, file)}
                uploadLabel={S.uploadImage}
                changeLabel={S.changeImage}
                removeLabel={S.remove}
              />
              <ImageUploadCard
                title={S.styleRefTitle}
                hint={S.styleRefHint}
                image={styleRef}
                onChange={(file) => setLocalImage(setStyleRef, styleRef, file)}
                uploadLabel={S.uploadImage}
                changeLabel={S.changeImage}
                removeLabel={S.remove}
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void runPlan()}
              className="inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? S.planning : S.planButton}
            </button>
          </section>
        ) : null}

        {step === "plan" && plan ? (
          <section className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-sm text-slate-600">
              {S.platformLine}{" "}
              <strong className="text-slate-900">
                {platformLabel(plan.platform)}
              </strong>
              {" · "}
              {withCount(S.tokensLine, estimate)}
            </p>
            {plan.visualDna ? (
              <p className="text-xs text-slate-500">
                {S.lookLabel} {plan.visualDna}
              </p>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                {S.aspectLabel}
              </span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {ASPECT_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                {S.captionLabel}
              </span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-violet-400/50 focus:border-violet-300 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                {S.hashtagsLabel}
              </span>
              <textarea
                value={hashtagsText}
                onChange={(e) => setHashtagsText(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-violet-400/50 focus:border-violet-300 focus:ring-2"
              />
            </label>

            <ul className="space-y-2 text-sm text-slate-700">
              {plan.shots.map((s, i) => (
                <li
                  key={`${s.role}-${i}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <span className="font-medium capitalize text-slate-800">{s.role}</span>
                  <span className="mt-1 block text-xs text-slate-500 line-clamp-2">
                    {s.prompt}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep("brief")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {S.back}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runGenerate()}
                className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500 disabled:opacity-60"
              >
                {busy ? S.generating : withCount(S.generateButton, estimate)}
              </button>
            </div>
          </section>
        ) : null}

        {(step === "generate" || step === "done") && shots.length > 0 ? (
          <section className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {shots.map((s, i) => (
                <figure
                  key={`${s.role}-${i}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.imageUrl}
                      alt={s.role}
                      className="aspect-4/5 w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-4/5 items-center justify-center bg-slate-100 text-sm text-slate-500">
                      {s.error ||
                        (busy && regenIndex !== i ? S.generating : S.waiting)}
                    </div>
                  )}
                  <figcaption className="space-y-2 px-3 py-2 text-xs font-medium capitalize text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span>{s.role}</span>
                      {step === "done" ? (
                        <span className="flex gap-2 font-normal normal-case">
                          {s.imageUrl ? (
                            <a
                              href={s.imageUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-700 underline hover:text-violet-500"
                            >
                              {S.save}
                            </a>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void regenShot(i)}
                            className="text-violet-700 underline hover:text-violet-500 disabled:opacity-50"
                          >
                            {regenIndex === i ? "…" : S.regen}
                          </button>
                        </span>
                      ) : null}
                    </div>
                    {s.error ? (
                      <span className="block font-normal normal-case text-red-600">
                        {s.error}
                      </span>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>

            {step === "done" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  {S.postCopyTitle}
                </h2>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {postText}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyPost()}
                    className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500"
                  >
                    {copied ? S.copied : S.copyPost}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("brief");
                      setPlan(null);
                      setShots([]);
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {S.newPack}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
      </main>
      <LandingFooter />
    </div>
  );
}
