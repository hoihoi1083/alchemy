"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import mixpanel from "mixpanel-browser";

let initialized = false;
let attributionApplied = false;

function getToken(): string {
  return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN?.trim() ?? "";
}

type Attribution = {
  referrer: string | undefined;
  referring_domain: string | undefined;
  landing_page: string | undefined;
  utm_source: string | undefined;
  utm_medium: string | undefined;
  utm_campaign: string | undefined;
  utm_term: string | undefined;
  utm_content: string | undefined;
  gclid: string | undefined;
  fbclid: string | undefined;
  msclkid: string | undefined;
  ttclid: string | undefined;
  traffic_source: string;
};

function referringDomain(referrer: string): string | undefined {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

function classifyTrafficSource(opts: {
  utmSource?: string;
  utmMedium?: string;
  referrer?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
}): string {
  if (opts.gclid) return "google_ads";
  if (opts.fbclid) return "meta_ads";
  if (opts.msclkid) return "microsoft_ads";
  if (opts.ttclid) return "tiktok_ads";

  const source = (opts.utmSource ?? "").toLowerCase();
  const medium = (opts.utmMedium ?? "").toLowerCase();

  // Explicit campaign tags (best for IG / RedNote / TikTok / 抖音 in-app browsers).
  // Still match Chinese 小红书 in referrers from the China app.
  if (
    source.includes("instagram") ||
    source === "ig" ||
    source.includes("小红书") ||
    source.includes("xiaohongshu") ||
    source === "xhs" ||
    source === "rednote" ||
    source.includes("rednote") ||
    source.includes("tiktok") ||
    source.includes("douyin") ||
    source.includes("抖音")
  ) {
    if (medium.includes("cpc") || medium.includes("paid") || medium.includes("ppc") || medium.includes("ads")) {
      return "paid_social";
    }
    return "social";
  }

  if (opts.utmSource || opts.utmMedium) {
    if (medium.includes("cpc") || medium.includes("paid") || medium.includes("ppc")) {
      return "paid";
    }
    if (medium.includes("email")) return "email";
    if (medium.includes("social")) return "social";
    if (medium.includes("affiliate")) return "affiliate";
    return "campaign";
  }

  if (!opts.referrer) return "direct";
  const host = referringDomain(opts.referrer)?.toLowerCase() ?? "";
  if (!host) return "referral";

  if (host.includes("google.") || host === "google.com") return "organic_search";
  if (host.includes("bing.") || host === "bing.com") return "organic_search";
  if (host.includes("yahoo.")) return "organic_search";

  // Social / short-video apps (referrer often missing inside in-app browsers).
  if (host.includes("instagram.") || host === "l.instagram.com") return "social_instagram";
  if (
    host.includes("xiaohongshu.") ||
    host.includes("xhslink.") ||
    host.includes("xhscdn.") ||
    host === "xhslink.com"
  ) {
    return "social_xiaohongshu";
  }
  if (host.includes("tiktok.") || host.includes("tiktokv.")) return "social_tiktok";
  if (host.includes("douyin.") || host.includes("iesdouyin.") || host.includes("amemv.")) {
    return "social_douyin";
  }
  if (
    host.includes("facebook.") ||
    host.includes("fb.") ||
    host.includes("linkedin.") ||
    host.includes("twitter.") ||
    host.includes("x.com") ||
    host.includes("youtube.") ||
    host.includes("weibo.") ||
    host.includes("threads.")
  ) {
    return "social";
  }

  return "referral";
}

function readAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;
  const utm_source = params.get("utm_source")?.trim() || undefined;
  const utm_medium = params.get("utm_medium")?.trim() || undefined;
  const utm_campaign = params.get("utm_campaign")?.trim() || undefined;
  const utm_term = params.get("utm_term")?.trim() || undefined;
  const utm_content = params.get("utm_content")?.trim() || undefined;
  const gclid = params.get("gclid")?.trim() || undefined;
  const fbclid = params.get("fbclid")?.trim() || undefined;
  const msclkid = params.get("msclkid")?.trim() || undefined;
  const ttclid = params.get("ttclid")?.trim() || undefined;

  return {
    referrer,
    referring_domain: referrer ? referringDomain(referrer) : undefined,
    landing_page: `${window.location.pathname}${window.location.search}`,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    gclid,
    fbclid,
    msclkid,
    ttclid,
    traffic_source: classifyTrafficSource({
      utmSource: utm_source,
      utmMedium: utm_medium,
      referrer,
      gclid,
      fbclid,
      msclkid,
      ttclid,
    }),
  };
}

/** Persist first-touch + last-touch acquisition. */
function applyAttribution(opts?: { forceLastTouch?: boolean }) {
  if (typeof window === "undefined") return;
  if (attributionApplied && !opts?.forceLastTouch) return;

  const a = readAttribution();
  const hasCampaignSignal = Boolean(
    a.utm_source ||
      a.utm_medium ||
      a.utm_campaign ||
      a.gclid ||
      a.fbclid ||
      a.msclkid ||
      a.ttclid,
  );

  // First touch — set once for this browser profile.
  mixpanel.register_once({
    initial_referrer: a.referrer ?? "direct",
    initial_referring_domain: a.referring_domain ?? "direct",
    initial_landing_page: a.landing_page,
    initial_utm_source: a.utm_source,
    initial_utm_medium: a.utm_medium,
    initial_utm_campaign: a.utm_campaign,
    initial_utm_term: a.utm_term,
    initial_utm_content: a.utm_content,
    initial_traffic_source: a.traffic_source,
  });

  mixpanel.people.set_once({
    initial_referrer: a.referrer ?? "direct",
    initial_referring_domain: a.referring_domain ?? "direct",
    initial_landing_page: a.landing_page,
    initial_utm_source: a.utm_source,
    initial_utm_medium: a.utm_medium,
    initial_utm_campaign: a.utm_campaign,
    initial_traffic_source: a.traffic_source,
  });

  // Last touch — only when this hit has UTM/ad ids or it's the first load.
  if (!attributionApplied || hasCampaignSignal) {
    const lastTouch: Record<string, string> = {
      traffic_source: a.traffic_source,
    };
    if (a.referrer) lastTouch.referrer = a.referrer;
    if (a.referring_domain) lastTouch.referring_domain = a.referring_domain;
    if (a.utm_source) lastTouch.utm_source = a.utm_source;
    if (a.utm_medium) lastTouch.utm_medium = a.utm_medium;
    if (a.utm_campaign) lastTouch.utm_campaign = a.utm_campaign;
    if (a.utm_term) lastTouch.utm_term = a.utm_term;
    if (a.utm_content) lastTouch.utm_content = a.utm_content;
    if (a.gclid) lastTouch.gclid = a.gclid;
    if (a.fbclid) lastTouch.fbclid = a.fbclid;
    if (a.msclkid) lastTouch.msclkid = a.msclkid;
    if (a.ttclid) lastTouch.ttclid = a.ttclid;
    mixpanel.register(lastTouch);
  }

  attributionApplied = true;
}

function ensureMixpanel(): boolean {
  const token = getToken();
  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[mixpanel] NEXT_PUBLIC_MIXPANEL_TOKEN missing — add it to .env.local and restart npm run dev",
      );
    }
    return false;
  }
  if (initialized) return true;

  mixpanel.init(token, {
    // Full behavioral capture for product analytics.
    autocapture: {
      pageview: "full-url",
      click: true,
      dead_click: true,
      rage_click: true,
      input: true,
      scroll: true,
      submit: true,
      // Button / link labels (not free-text field values).
      capture_text_content: true,
      // Never autocapture auth screens (Clerk password / email forms).
      block_url_regexes: [/\/sign-in(?:\/|$)/i, /\/sign-up(?:\/|$)/i],
    },
    // Watch 100% of sessions while you are learning the product.
    // Lower this later (e.g. 10) to control Mixpanel cost.
    record_sessions_percent: 100,
    record_heatmap_data: true,
    // Session Replay: mask everything by default; unmask studio fields only.
    // Password / email / tel / hidden inputs stay masked by Mixpanel always.
    record_mask_all_text: true,
    record_mask_all_inputs: true,
    record_unmask_text_selector: "[data-mp-unmask]",
    record_unmask_input_selector: "input[data-mp-unmask], textarea[data-mp-unmask]",
    persistence: "localStorage",
    track_pageview: false, // we emit Page Viewed on App Router navigations
    ignore_dnt: false,
    debug: process.env.NODE_ENV === "development",
  });

  initialized = true;
  mixpanel.register({
    app: "alchemy-studio",
    app_env: process.env.NODE_ENV,
  });
  applyAttribution();
  mixpanel.track("App Loaded", {
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
  return true;
}

function usePageAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageEnteredAt = useRef<number>(Date.now());
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!ensureMixpanel()) return;
    // Update last-touch only if this URL carries campaign params.
    applyAttribution({ forceLastTouch: true });

    const query = searchParams?.toString() ?? "";
    const path = query ? `${pathname}?${query}` : pathname;
    const now = Date.now();

    if (lastPath.current && lastPath.current !== path) {
      const ms = now - pageEnteredAt.current;
      mixpanel.track("Page Left", {
        path: lastPath.current,
        duration_ms: ms,
        duration_sec: Math.round(ms / 1000),
      });
    }

    pageEnteredAt.current = now;
    lastPath.current = path;

    const a = readAttribution();
    mixpanel.track("Page Viewed", {
      path,
      pathname,
      referrer: a.referrer,
      referring_domain: a.referring_domain,
      traffic_source: a.traffic_source,
      utm_source: a.utm_source,
      utm_medium: a.utm_medium,
      utm_campaign: a.utm_campaign,
    });
    mixpanel.time_event("Page Left");
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!ensureMixpanel()) return;

    const flush = () => {
      if (!lastPath.current) return;
      const ms = Date.now() - pageEnteredAt.current;
      mixpanel.track("Page Left", {
        path: lastPath.current,
        duration_ms: ms,
        duration_sec: Math.round(ms / 1000),
        reason: "unload",
      });
      // Best-effort flush before tab close.
      mixpanel.track("Session Unload", { path: lastPath.current });
    };

    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
}

function MixpanelPageTracker() {
  usePageAnalytics();
  return null;
}

/** Browser Mixpanel: autocapture + session replay + identify Clerk users. */
export function MixpanelProvider() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const identified = useRef<string | null>(null);

  useEffect(() => {
    ensureMixpanel();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!ensureMixpanel()) return;

    if (isSignedIn && userId) {
      if (identified.current === userId) return;
      mixpanel.identify(userId);
      mixpanel.people.set({
        $email: user?.primaryEmailAddress?.emailAddress ?? undefined,
        $name: user?.fullName ?? user?.username ?? undefined,
        clerkId: userId,
      });
      identified.current = userId;
      return;
    }

    if (!isSignedIn && identified.current) {
      mixpanel.reset();
      identified.current = null;
    }
  }, [isLoaded, isSignedIn, userId, user]);

  return (
    <Suspense fallback={null}>
      <MixpanelPageTracker />
    </Suspense>
  );
}

export function trackEvent(
  event: string,
  props?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!ensureMixpanel()) return;
  mixpanel.track(event, props);
}
