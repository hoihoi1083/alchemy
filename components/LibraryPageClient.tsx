"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { LandingFloatingCta } from "@/components/landing/LandingFloatingCta";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLocale } from "@/components/LocaleProvider";
import { downloadMediaUrl } from "@/lib/download-media";
import {
  isPromotionMode,
  storePromotionMode,
} from "@/lib/promotion-mode";
import { ACTIVE_PROJECT_STORAGE_KEY } from "@/lib/wizard-project-snapshot";

const ACTIVE_PROJECT_KEY = ACTIVE_PROJECT_STORAGE_KEY;

type ProjectRow = {
  id: string;
  name: string;
  promotionMode: string;
  templateId: string;
  imageUrl: string | null;
  videoUrl: string | null;
  updatedAt: string;
  createdAt: string;
};

type AssetKind = "image" | "video" | "audio" | "voiceover";

type AssetRow = {
  id: string;
  kind: AssetKind;
  name: string | null;
  contentType: string;
  projectId: string | null;
  createdAt: string;
  downloadUrl: string;
  previewUrl: string;
};

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(
    locale === "zh-cn" ? "zh-CN" : locale === "zh-tw" ? "zh-TW" : locale === "zh" ? "zh-HK" : "en-US",
    {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isMediaUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  if (url.startsWith("/api/library/download/")) return true;
  if (url.startsWith("/api/pipeline-files/")) return true;
  return false;
}

function isLibraryUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("/api/library/download/"));
}

/** Prefer durable library assets over possibly-expired fal URLs on the project row. */
function resolveProjectMedia(
  project: ProjectRow,
  assets: AssetRow[],
): { imageUrl: string | null; videoUrl: string | null } {
  const linked = assets.filter((a) => a.projectId === project.id);
  const durableImage =
    linked.find((a) => a.kind === "image")?.previewUrl ??
    (isLibraryUrl(project.imageUrl) ? project.imageUrl : null);
  const durableVideo =
    linked.find((a) => a.kind === "video")?.previewUrl ??
    (isLibraryUrl(project.videoUrl) ? project.videoUrl : null);

  return {
    imageUrl: durableImage ?? (isMediaUrl(project.imageUrl) ? project.imageUrl : null),
    videoUrl: durableVideo ?? (isMediaUrl(project.videoUrl) ? project.videoUrl : null),
  };
}

function MediaThumb({
  src,
  kind,
  fallbackLabel,
}: {
  src: string;
  kind: "image" | "video" | "audio";
  fallbackLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailed(false);
    setBlobUrl(null);
    // Library previews need credentials; <img src> can fail under Clerk.
    // Prefer credentialed fetch → blob URL for same-origin library downloads.
    if (!src.startsWith("/api/library/download/")) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const res = await fetch(src, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get("content-type") || "";
        if (type.includes("text/html") || type.includes("application/json")) {
          throw new Error(`Bad content-type ${type}`);
        }
        const blob = await res.blob();
        if (blob.size < 100 || blob.type.includes("html")) {
          throw new Error("Empty or HTML blob");
        }
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
        {fallbackLabel}
      </div>
    );
  }

  const displaySrc = blobUrl ?? (src.startsWith("/api/library/download/") ? undefined : src);
  if (!displaySrc) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
        …
      </div>
    );
  }

  if (kind === "video") {
    return (
      <video
        src={displaySrc}
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900/90 px-4">
        <audio src={displaySrc} controls className="w-full" onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

async function downloadProjectMedia(url: string, filename: string): Promise<void> {
  // Always go through studio-download so fal CDN expiry / pipeline / R2 are handled server-side.
  await downloadMediaUrl(url, filename);
}

export function LibraryPageClient() {
  const { m, locale } = useLocale();
  const L = m.library;
  const { isSignedIn, isLoaded } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    { type: "project" | "asset"; id: string } | null
  >(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [projRes, assetRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/library/assets"),
      ]);
      if (projRes.status === 401 || assetRes.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/library")}`;
        return;
      }
      if (!projRes.ok) throw new Error(L.loadError);
      const data = (await projRes.json()) as { projects?: ProjectRow[] };
      setProjects(
        (data.projects ?? []).map((p) => ({
          ...p,
          updatedAt:
            typeof p.updatedAt === "string"
              ? p.updatedAt
              : new Date(p.updatedAt as unknown as Date).toISOString(),
          createdAt:
            typeof p.createdAt === "string"
              ? p.createdAt
              : new Date(p.createdAt as unknown as Date).toISOString(),
        })),
      );
      if (assetRes.ok) {
        const aData = (await assetRes.json()) as { assets?: AssetRow[] };
        setAssets(aData.assets ?? []);
      } else {
        setAssets([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : L.loadError);
    } finally {
      setLoading(false);
    }
  }, [L.loadError]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/library")}`;
      return;
    }
    void load();
  }, [isLoaded, isSignedIn, load]);

  function openInStudio(projectId: string, mode: string) {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    if (isPromotionMode(mode)) {
      storePromotionMode(mode);
      window.location.href = `/studio?mode=${mode}`;
      return;
    }
    window.location.href = "/studio";
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    setDeletingId(id);
    setError(null);
    try {
      if (type === "project") {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(L.loadError);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (window.localStorage.getItem(ACTIVE_PROJECT_KEY) === id) {
          window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
        }
      } else {
        const res = await fetch(`/api/library/download/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(L.loadError);
        setAssets((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : L.loadError);
    } finally {
      setDeletingId(null);
    }
  }

  function assetBadge(kind: AssetKind): string {
    if (kind === "video") return L.videoBadge;
    if (kind === "audio") return L.audioBadge;
    if (kind === "voiceover") return L.voiceoverBadge;
    return L.imageBadge;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <LandingNav />

      <div className="mx-auto max-w-5xl px-6 pb-28 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">{L.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{L.subtitle}</p>
        <p className="mt-2 text-xs text-slate-500">{L.linkExpiredHint}</p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">{L.loading}</p>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-xl font-semibold tracking-tight">{L.savedFilesTitle}</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{L.savedFilesSubtitle}</p>
              {assets.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">
                  {L.savedFilesEmpty}
                </p>
              ) : (
                <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {assets.map((a) => {
                    const isVideo = a.kind === "video" || a.kind === "voiceover";
                    const isAudio = a.kind === "audio";
                    const thumbKind = isVideo ? "video" : isAudio ? "audio" : "image";
                    return (
                      <li
                        key={a.id}
                        className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <div className="relative aspect-[4/5] bg-slate-100">
                          <MediaThumb
                            src={a.previewUrl}
                            kind={thumbKind}
                            fallbackLabel={L.noMedia}
                          />
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {assetBadge(a.kind)}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div>
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {a.name || assetBadge(a.kind)}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {L.updatedLabel} {formatDate(a.createdAt, locale)}
                            </p>
                          </div>
                          <div className="mt-auto flex flex-wrap gap-2">
                            {(a.kind === "video" || a.kind === "voiceover") && (
                              <Link
                                href={`/captions?video=${encodeURIComponent(a.downloadUrl)}`}
                                className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                              >
                                {L.editCaptions}
                              </Link>
                            )}
                            {a.kind === "image" && (
                              <Link
                                href={`/edit-image?image=${encodeURIComponent(a.downloadUrl)}&returnTo=${encodeURIComponent("/library")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                              >
                                {L.editImage}
                              </Link>
                            )}
                            <a
                              href={a.downloadUrl}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                            >
                              {L.download}
                            </a>
                            <a
                              href={a.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {L.openMedia}
                            </a>
                            <button
                              type="button"
                              disabled={deletingId === a.id}
                              onClick={() => setPendingDelete({ type: "asset", id: a.id })}
                              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === a.id ? L.deleting : L.delete}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mt-14">
              <h2 className="text-xl font-semibold tracking-tight">{L.projectsTitle}</h2>
              {projects.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
                  <p className="text-sm text-slate-600">{L.empty}</p>
                  <Link
                    href="/studio"
                    className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {L.emptyCta}
                  </Link>
                </div>
              ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const media = resolveProjectMedia(p, assets);
              const hasImage = isMediaUrl(media.imageUrl);
              const hasVideo = isMediaUrl(media.videoUrl);
              const thumb = hasImage ? media.imageUrl : hasVideo ? media.videoUrl : null;
              const safeName = (p.name || "project").replace(/[^\w.-]+/g, "_").slice(0, 48);
              const downloadImageUrl =
                assets.find((a) => a.projectId === p.id && a.kind === "image")?.downloadUrl ??
                media.imageUrl;
              const downloadVideoUrl =
                assets.find((a) => a.projectId === p.id && a.kind === "video")?.downloadUrl ??
                media.videoUrl;

              return (
                <li
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/5] bg-slate-100">
                    {hasImage ? (
                      <MediaThumb src={media.imageUrl!} kind="image" fallbackLabel={L.noMedia} />
                    ) : hasVideo ? (
                      <MediaThumb src={media.videoUrl!} kind="video" fallbackLabel={L.noMedia} />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
                        {L.noMedia}
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {hasImage ? (
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          {L.imageBadge}
                        </span>
                      ) : null}
                      {hasVideo ? (
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          {L.videoBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h2 className="truncate text-sm font-semibold text-slate-900">
                        {p.name || "Untitled"}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {L.updatedLabel} {formatDate(p.updatedAt, locale)}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openInStudio(p.id, p.promotionMode)}
                        className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        {L.openStudio}
                      </button>
                      {hasVideo && downloadVideoUrl ? (
                        <Link
                          href={`/captions?video=${encodeURIComponent(downloadVideoUrl)}`}
                          className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                        >
                          {L.editCaptions}
                        </Link>
                      ) : null}
                      {hasImage && downloadImageUrl ? (
                        <Link
                          href={`/edit-image?image=${encodeURIComponent(downloadImageUrl)}&returnTo=${encodeURIComponent("/library")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                        >
                          {L.editImage}
                        </Link>
                      ) : null}
                      {hasImage && downloadImageUrl ? (
                        <button
                          type="button"
                          onClick={() => void downloadProjectMedia(downloadImageUrl, `${safeName}.png`)}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {L.downloadImage}
                        </button>
                      ) : null}
                      {hasVideo && downloadVideoUrl ? (
                        <button
                          type="button"
                          onClick={() => void downloadProjectMedia(downloadVideoUrl, `${safeName}.mp4`)}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {L.downloadVideo}
                        </button>
                      ) : null}
                      {thumb ? (
                        <a
                          href={thumb}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {L.openMedia}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => setPendingDelete({ type: "project", id: p.id })}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === p.id ? L.deleting : L.delete}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
              )}
            </section>
          </>
        )}
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="library-delete-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <p id="library-delete-title" className="text-sm text-slate-800">
              {L.deleteConfirm}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmPendingDelete()}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <LandingFloatingCta />
    </main>
  );
}
