"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import mixpanel from "mixpanel-browser";
import {
  classifyTrafficSource,
  referringDomain,
  sanitizeReferrer,
} from "@/lib/mixpanel-attribution";

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

function readAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const referrer = sanitizeReferrer(document.referrer || undefined);
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

  const compact = (obj: Record<string, string | undefined>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  };

  // First touch — set once for this browser profile (events + People).
  // Skip undefined values — Mixpanel People often drops the whole set_once otherwise.
  const firstTouch = compact({
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
  mixpanel.register_once(firstTouch);
  mixpanel.people.set_once(firstTouch);

  // Last touch — only when this hit has UTM/ad ids or it's the first load.
  if (!attributionApplied || hasCampaignSignal) {
    const lastTouch = compact({
      traffic_source: a.traffic_source,
      referrer: a.referrer,
      referring_domain: a.referring_domain,
      utm_source: a.utm_source,
      utm_medium: a.utm_medium,
      utm_campaign: a.utm_campaign,
      utm_term: a.utm_term,
      utm_content: a.utm_content,
      gclid: a.gclid,
      fbclid: a.fbclid,
      msclkid: a.msclkid,
      ttclid: a.ttclid,
    });
    mixpanel.register(lastTouch);
    // Also write onto People so anonymous $device profiles show UTMs in Users UI
    // (register alone only attaches to events — profile looked empty).
    if (Object.keys(lastTouch).length > 0) {
      mixpanel.people.set(lastTouch);
    }
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
