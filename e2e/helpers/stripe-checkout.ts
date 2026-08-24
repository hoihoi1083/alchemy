import type { Page } from "@playwright/test";

/**
 * Complete Stripe hosted Checkout with test Visa 4242…
 */
export async function fillStripeTestCardAndSubmit(page: Page): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });

  await page.getByLabel(/Card number/i).fill("4242 4242 4242 4242");
  await page.getByLabel(/Expiration/i).fill("12 / 34");
  await page.getByLabel(/^CVC$/i).fill("123");
  await page.getByLabel(/Cardholder name/i).fill("E2E Pro Trial");

  const zip = page.getByLabel(/^ZIP$/i);
  if (await zip.isVisible().catch(() => false)) {
    await zip.fill("94107");
  }

  // Link "save for faster checkout" requires a valid phone — skip for E2E.
  const saveLink = page.getByRole("checkbox", {
    name: /Save my information for faster checkout/i,
  });
  if (await saveLink.isChecked().catch(() => false)) {
    await saveLink.uncheck();
  }

  await page.getByRole("button", { name: /Start trial/i }).click();
}
