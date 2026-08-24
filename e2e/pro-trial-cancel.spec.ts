import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect, type Page } from "@playwright/test";
import { hasClerkE2eAuth } from "./clerk-env";
import { resetE2eUserForProTrial } from "./helpers/reset-pro-trial-user";
import { fillStripeTestCardAndSubmit } from "./helpers/stripe-checkout";
import { PRO_TRIAL_BONUS_TOKENS } from "../lib/billing/plans";

const LOCALE_KEY = "ams-locale";

async function clerkSignInToken(userId: string): Promise<string> {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  const body = (await res.json()) as { token?: string };
  if (!res.ok || !body.token) {
    throw new Error(`sign_in_tokens failed: ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function signInE2eUser(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "en");
  }, LOCALE_KEY);
  await setupClerkTestingToken({ page });
  const ticket = await clerkSignInToken(process.env.E2E_CLERK_USER_ID!);
  await page.goto(`/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`);
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 45_000 });
}

type MePayload = {
  user?: {
    plan?: string;
    effectivePlan?: string;
    creditBalance?: number;
    hasUsedProTrial?: boolean;
    proTrialEndsAt?: string | null;
    stripeSubscriptionId?: string | null;
  } | null;
};

async function fetchMe(page: Page): Promise<MePayload> {
  const res = await page.request.get("/api/me");
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as MePayload;
}

test.describe("Pro trial — Visa 4242, then cancel within 7 days", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  let startBalance = 50;

  test.beforeAll(async () => {
    test.skip(!hasClerkE2eAuth(), "Set E2E_CLERK_USER_ID + Clerk keys in .env.local");
    const reset = await resetE2eUserForProTrial({ balance: 50 });
    startBalance = reset.targetBalance;
  });

  test.beforeEach(() => {
    test.skip(!hasClerkE2eAuth(), "Set E2E_CLERK_USER_ID + Clerk keys in .env.local");
  });

  test("1) free user starts Pro trial via Checkout (4242…)", async ({ page }) => {
    await signInE2eUser(page);

    const meBefore = await fetchMe(page);
    expect(meBefore.user?.effectivePlan ?? meBefore.user?.plan).toBe("free");
    expect(meBefore.user?.creditBalance ?? 0).toBe(startBalance);

    const checkoutRes = await page.request.post("/api/stripe/checkout", {
      data: { kind: "pro_trial" },
      headers: { "Content-Type": "application/json" },
    });
    expect(checkoutRes.ok()).toBeTruthy();
    const checkout = (await checkoutRes.json()) as { url?: string; error?: string };
    expect(checkout.url, checkout.error).toBeTruthy();

    await page.goto(checkout.url!);
    await fillStripeTestCardAndSubmit(page);

    await expect(page).toHaveURL(/checkout=success/, { timeout: 90_000 });
    const successUrl = new URL(page.url());
    const sessionId = successUrl.searchParams.get("session_id");
    expect(sessionId).toBeTruthy();

    // Clerk may still hydrate after Stripe redirect — fulfill explicitly (same as Pricing page).
    const confirm = await page.request.post("/api/stripe/confirm-checkout", {
      data: { sessionId },
      headers: { "Content-Type": "application/json" },
    });
    expect(confirm.ok(), await confirm.text()).toBeTruthy();
    const confirmBody = (await confirm.json()) as {
      tokensGranted?: number;
      creditBalance?: number;
      results?: Array<{ reason?: string; granted?: boolean }>;
    };
    expect(confirmBody.tokensGranted ?? 0).toBe(PRO_TRIAL_BONUS_TOKENS);
    expect(confirmBody.creditBalance ?? 0).toBeGreaterThanOrEqual(
      startBalance + PRO_TRIAL_BONUS_TOKENS,
    );
    expect(confirmBody.results?.[0]?.reason).toMatch(/pro_trial_/);

    // Stripe redirect can drop Clerk cookies — sign in again before /api/me.
    await signInE2eUser(page);
    const meAfter = await fetchMe(page);
    const plan = meAfter.user?.effectivePlan ?? meAfter.user?.plan;
    expect(plan).toBe("pro");
    expect(meAfter.user?.hasUsedProTrial).toBe(true);
    expect(meAfter.user?.proTrialEndsAt).toBeTruthy();
    expect(meAfter.user?.stripeSubscriptionId).toBeTruthy();

    const balance = meAfter.user?.creditBalance ?? 0;
    expect(balance).toBeGreaterThanOrEqual(startBalance + PRO_TRIAL_BONUS_TOKENS);
  });

  test("2) cancel Pro trial during 7-day period — keep tokens, drop to free", async ({
    page,
  }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await signInE2eUser(page);

    const meTrial = await fetchMe(page);
    expect(meTrial.user?.effectivePlan ?? meTrial.user?.plan).toBe("pro");
    const tokensBeforeCancel = meTrial.user?.creditBalance ?? 0;
    expect(tokensBeforeCancel).toBeGreaterThanOrEqual(startBalance + PRO_TRIAL_BONUS_TOKENS);

    await page.goto("/account");
    await expect(page.getByRole("button", { name: /Cancel Pro trial/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: /Cancel Pro trial/i }).click();

    // confirm + success alert from Account page
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    await expect
      .poll(
        async () => {
          const me = await fetchMe(page);
          return me.user?.effectivePlan ?? me.user?.plan ?? "unknown";
        },
        { timeout: 45_000 },
      )
      .toBe("free");
    const meFree = await fetchMe(page);
    expect(meFree.user?.effectivePlan ?? meFree.user?.plan).toBe("free");
    expect(meFree.user?.creditBalance ?? 0).toBe(tokensBeforeCancel);
    expect(meFree.user?.hasUsedProTrial).toBe(true);
    expect(meFree.user?.stripeSubscriptionId ?? null).toBeFalsy();
  });

  test("3) cannot start a second Pro trial", async ({ page }) => {
    await signInE2eUser(page);

    const res = await page.request.post("/api/stripe/checkout", {
      data: { kind: "pro_trial" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error ?? "").toMatch(/already used/i);
  });
});
