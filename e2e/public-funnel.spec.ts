import { test, expect } from "@playwright/test";

test.describe("Public entry funnel", () => {
  test("landing loads and primary CTA targets /start", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("alchemy.ai").first()).toBeVisible();
    const startLink = page.getByRole("link", { name: /Start Creating|Open Studio/i }).first();
    await expect(startLink).toHaveAttribute("href", "/start");
  });

  test("how it works scrolls on landing (#how)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /How It Works/i }).click();
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
    await page.goto("/start");
    await expect(page).toHaveURL(/sign-in/);
  });
});
