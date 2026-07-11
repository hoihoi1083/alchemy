import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect, type Page } from "@playwright/test";

const LOCALE_KEY = "ams-locale";

const hasE2eAuth = Boolean(
  process.env.CLERK_SECRET_KEY?.trim() &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.E2E_CLERK_USER_ID?.trim(),
);

async function clerkSignInToken(userId: string): Promise<string> {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      expires_in_seconds: 300,
    }),
  });
  const body = (await res.json()) as { token?: string; errors?: unknown[] };
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

test.describe("Authenticated studio funnel", () => {
  test.beforeEach(() => {
    test.skip(
      !hasE2eAuth,
      "Set E2E_CLERK_USER_ID + Clerk keys (run npm run setup:secrets)",
    );
  });

  test("sign in → /start → physical → setup step visible", async ({ page }) => {
    await signInE2eUser(page);

    await page.goto("/start");
    await expect(page.getByRole("heading", { name: /What are you promoting/i })).toBeVisible({
      timeout: 20_000,
    });

    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: /Physical product/i }) })
      .click();

    await expect(page).toHaveURL(/\/studio\?mode=physical/, { timeout: 20_000 });
    await expect(page.locator('[data-coach-id="coach-product-name"]')).toBeVisible({
      timeout: 30_000,
    });
  });

  test("template deep link preserves intent after auth flow", async ({ page }) => {
    await signInE2eUser(page);

    await page.goto("/start?template=product-reel");
    await expect(page.getByText(/Template:/i)).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: /Physical product/i }) })
      .click();

    await expect(page).toHaveURL(/\/studio\?mode=physical&template=product-reel/);
  });
});
