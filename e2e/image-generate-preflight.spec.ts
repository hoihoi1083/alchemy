import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const LOCALE_KEY = "ams-locale";
const FIXTURE_PNG = path.join(process.cwd(), "tests/fixtures/smoke/product.png");
const MOCK_IMAGE_URL = "https://example.com/e2e-mock-product.png";

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

test.describe("Studio image generate preflight", () => {
  test.beforeEach(() => {
    test.skip(
      !hasE2eAuth,
      "Set E2E_CLERK_USER_ID + Clerk keys (run npm run setup:secrets)",
    );
  });

  test("upload product → mock generate → preflight panel, no error banner", async ({
    page,
  }) => {
    await page.route("**/api/generate-image", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          imageUrl: MOCK_IMAGE_URL,
          imageUrls: [MOCK_IMAGE_URL],
          endpoint: "fal-ai/nano-banana-2/edit",
        }),
      });
    });

    await page.route("**/api/review-generated-image", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          review: {
            matchesExpectation: true,
            score: 92,
            summary: "Product visible, no garbled text.",
            positives: ["clear product"],
            issues: [],
          },
        }),
      });
    });

    await signInE2eUser(page);
    await page.goto("/studio?mode=physical");

    await expect(page.locator('[data-coach-id="coach-product-name"]')).toBeVisible({
      timeout: 30_000,
    });

    await page.locator('[data-coach-id="coach-product-name"] input').fill("Rose Quartz Bracelet");
    await page.locator('[data-coach-id="coach-headline"] input').fill("Summer glow");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "product.png",
      mimeType: "image/png",
      buffer: readFileSync(FIXTURE_PNG),
    });

    await page.getByRole("button", { name: /Continue to image/i }).click();
    await expect(page.getByRole("heading", { name: /Step 2/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /Generate (image|AI image|polish)/i }).click();

    await expect(page.getByText(/Quality check — your generated image/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/AI quality scan/i)).toBeVisible();
    await expect(page.locator(".text-red-300, .text-red-400").filter({ hasText: /failed|error/i })).toHaveCount(0);
  });
});
