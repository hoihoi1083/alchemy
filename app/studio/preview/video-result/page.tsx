"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import {
  VideoResultPanel,
  VideoReviewFooterBar,
} from "@/components/studio/VideoResultPanel";
import { useLocale } from "@/components/LocaleProvider";
import { downloadMediaUrl } from "@/lib/download-media";

/** Local demo reel (no generation). Swap with Cloudflare via ?url= */
const DEFAULT_DEMO_VIDEO = "/images/landing/alchemy-flask-headturn.mp4?v=1";

function isAllowedDemoUrl(raw: string): boolean {
  if (raw.startsWith("/") && !raw.startsWith("//")) return true;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".r2.dev") ||
      host.endsWith(".r2.cloudflarestorage.com") ||
      host.includes("cloudflare") ||
      host.endsWith(".fal.media") ||
      host === "localhost"
    );
  } catch {
    return false;
  }
}

function VideoResultPreviewContent() {
  const { m } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [downloadBusy, setDownloadBusy] = useState(false);

  const videoUrl = useMemo(() => {
    const fromQuery = searchParams.get("url")?.trim();
    if (fromQuery && isAllowedDemoUrl(fromQuery)) return fromQuery;
    return DEFAULT_DEMO_VIDEO;
  }, [searchParams]);

  const usingRemote = videoUrl.startsWith("http");

  async function handleDownload() {
    setDownloadBusy(true);
    try {
      await downloadMediaUrl(videoUrl, "preview-reel.mp4");
    } catch {
      /* preview — ignore */
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">Video result UI preview (no generation)</p>
          <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
            Default demo uses a local landing MP4. To preview a Cloudflare / R2 clip, open{" "}
            <code className="rounded bg-white px-1 py-0.5 text-[11px]">
              /studio/preview/video-result?url=https://YOUR.r2.dev/….mp4
            </code>
            {usingRemote ? (
              <span className="mt-1 block truncate text-violet-800">Using: {videoUrl}</span>
            ) : null}
          </p>
          <Link
            href="/studio"
            className="mt-2 inline-block text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            ← Back to studio
          </Link>
        </div>

        <VideoResultPanel
          preview={{
            videoUrl,
            productLabel: "Alchemy demo product",
            durationLabel: "8s",
            resolution: "720p",
            styleLabel: m.wizard.pathQuickTitle,
            videoNote: "Design preview — not a generated video output.",
          }}
        />

        <div className="hidden md:block">
          <VideoReviewFooterBar
            onBack={() => router.push("/studio")}
            onDownload={() => void handleDownload()}
            onGenerateOneMore={() => router.push("/studio/preview/video-result")}
            downloadBusy={downloadBusy}
            generateBusy={false}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto max-w-7xl">
          <VideoReviewFooterBar
            onBack={() => router.push("/studio")}
            onDownload={() => void handleDownload()}
            onGenerateOneMore={() => router.push("/studio/preview/video-result")}
            downloadBusy={downloadBusy}
            generateBusy={false}
          />
        </div>
      </div>
    </main>
  );
}

export default function VideoResultPreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">
          Loading preview…
        </main>
      }
    >
      <VideoResultPreviewContent />
    </Suspense>
  );
}
