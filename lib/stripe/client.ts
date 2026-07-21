import Stripe from "stripe";

let stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Vercel production must use live Stripe keys — never ship sk_test_ to real users. */
export function assertStripeLiveInProduction(): void {
  if (process.env.VERCEL_ENV !== "production") return;
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  if (!key) return;
  if (!key.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a live key (sk_live_...) when VERCEL_ENV=production.",
    );
  }
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
  if (pk && !pk.startsWith("pk_live_")) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be pk_live_... when VERCEL_ENV=production.",
    );
  }
}

export function getStripe(): Stripe {
  assertStripeLiveInProduction();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    "http://localhost:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}
