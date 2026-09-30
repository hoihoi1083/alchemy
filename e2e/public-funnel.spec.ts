import { test, expect } from "@playwright/test";

const LOCALE_KEY = "ams-locale";

test.describe("Public entry funnel", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, "en");
    }, LOCALE_KEY);
  });

  test("landing loads and primary CTA targets /start", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Alchemy AI Lab").first()).toBeVisible();
    const startLink = page.getByRole("link", { name: "Start Creating" });
    await expect(startLink).toHaveAttribute("href", "/start");
  });

  test("how it works scrolls on landing (#how)", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="#how"]').first().click();
    await expect(page).toHaveURL(/#how$/);
    await expect(page.locator("#how")).toBeVisible();
  });

  test("template cards route through /start with template param", async ({ page }) => {
    await page.goto("/");
    const templateLink = page.locator('a[href^="/start?template="]').first();
    await expect(templateLink).toBeVisible();
    const href = await templateLink.getAttribute("href");
    expect(href).toMatch(/^\/start\?template=[\w-]+$/);
  });

  test("/how CTAs target /start not bare /studio", async ({ page }) => {
    await page.goto("/how");
    const studioLinks = page.locator('a[href="/studio"]');
    await expect(studioLinks).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Open Studio|Start Creating/i }).first()).toHaveAttribute(
      "href",
      "/start",
    );
  });

  test("protected /start redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/start", { waitUntil: "domcontentloaded" });
    // Clerk may briefly land on /start?__clerk_handshake=… before the sign-in redirect.
    await expect(page).toHaveURL(/sign-in/, { timeout: 30_000 });
  });

  test("get-sample is public — no sign-in required", async ({ page }) => {
    await page.goto("/get-sample", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/get-sample\/?$/);
    await expect(page.getByRole("heading", { name: /sample pack/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("get-sample/thanks is public — no sign-in required", async ({ page }) => {
    await page.goto("/get-sample/thanks", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/get-sample\/thanks/);
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { name: /sample pack is ready|sample images/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
