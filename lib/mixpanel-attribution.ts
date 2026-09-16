/**
 * Client-safe Mixpanel acquisition helpers (no browser globals required for tests).
 */

export function referringDomain(referrer: string): string | undefined {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

/** Stripe/Clerk/etc. must never win first-touch — mid-funnel hops, not acquisition. */
export function isNoiseReferrerHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("stripe.com") ||
    h.includes("checkout.stripe.com") ||
    h.includes("billing.stripe.com") ||
    h.includes("clerk.") ||
    h.includes("accounts.google.") ||
    h.includes("appleid.apple.") ||
    h.includes("paypal.com") ||
    h.includes("vercel.com") ||
    h.endsWith("vercel.app")
  );
}

export function sanitizeReferrer(referrer: string | undefined): string | undefined {
  if (!referrer?.trim()) return undefined;
  const host = referringDomain(referrer);
  if (!host || isNoiseReferrerHost(host)) return undefined;
  return referrer;
}

export function classifyTrafficSource(opts: {
  utmSource?: string;
  utmMedium?: string;
  referrer?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
}): string {
  const source = (opts.utmSource ?? "").toLowerCase();
  const medium = (opts.utmMedium ?? "").toLowerCase();
  const hasUtm = Boolean(source || medium);
  const paidMedium =
    medium.includes("cpc") ||
    medium.includes("paid") ||
    medium.includes("ppc") ||
    medium.includes("ads");

  // Prefer explicit UTMs first. Facebook/IG append fbclid/gclid on organic
  // posts too — click ids alone would mis-label those as paid ads.
  if (hasUtm) {
    if (source.includes("facebook") || source === "fb" || source === "meta") {
      return paidMedium ? "meta_ads" : "social_facebook";
    }
    if (source.includes("instagram") || source === "ig") {
      return paidMedium ? "meta_ads" : "social_instagram";
    }
    if (
      source.includes("小红书") ||
      source.includes("xiaohongshu") ||
      source === "xhs" ||
      source === "rednote" ||
      source.includes("rednote")
    ) {
      return paidMedium ? "paid_social" : "social_xiaohongshu";
    }
    if (source.includes("tiktok") || source.includes("douyin") || source.includes("抖音")) {
      return paidMedium ? "paid_social" : "social_tiktok";
    }
    if (source.includes("google")) {
      return paidMedium ? "google_ads" : "organic_search";
    }

    if (paidMedium) return "paid";
    if (medium.includes("email")) return "email";
    if (medium.includes("social")) return "social";
    if (medium.includes("affiliate")) return "affiliate";
    return "campaign";
  }

  if (opts.gclid) return "google_ads";
  if (opts.fbclid) return "meta_ads";
  if (opts.msclkid) return "microsoft_ads";
  if (opts.ttclid) return "tiktok_ads";

  if (!opts.referrer) return "direct";
  const host = referringDomain(opts.referrer)?.toLowerCase() ?? "";
  if (!host) return "referral";
  if (isNoiseReferrerHost(host)) return "direct";

  if (host.includes("google.") || host === "google.com") return "organic_search";
  if (host.includes("bing.") || host === "bing.com") return "organic_search";
  if (host.includes("yahoo.")) return "organic_search";

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
    host.includes("fb.com") ||
    host === "l.facebook.com" ||
    host === "lm.facebook.com" ||
    host === "m.facebook.com" ||
    host.endsWith(".facebook.com")
  ) {
    return "social_facebook";
  }
  if (
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
