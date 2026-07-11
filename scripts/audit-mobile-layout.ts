/**
 * Mobile layout audit — multiple phone viewports, overflow + overlap checks.
 * Run: npx tsx scripts/audit-mobile-layout.ts
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "scripts/mobile-audit-screenshots");

const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "iphone-14-pro-max", width: 430, height: 932 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "galaxy-s8", width: 360, height: 740 },
] as const;

type Issue = { viewport: string; page: string; kind: string; detail: string };

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
}

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
  if (!res.ok || !body.token) throw new Error("Clerk sign-in token failed");
  return body.token;
}

async function signIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("ams-locale", "en");
  });
  await setupClerkTestingToken({ page });
  const ticket = await clerkSignInToken(process.env.E2E_CLERK_USER_ID!);
  await page.goto(`${BASE}/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`);
  await page.waitForURL((url) => !url.pathname.includes("/sign-in"), { timeout: 45_000 });
}

type LayoutMetrics = {
  overflowPx: number;
  fabVisible: boolean;
  mobileBarVisible: boolean;
  fabBarOverlap: boolean;
  fabBottomPx: number | null;
  barTopPx: number | null;
  stepIndicatorVisible: boolean;
  continueBtnVisible: boolean;
};

async function measureLayout(page: Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowPx = Math.max(0, doc.scrollWidth - window.innerWidth);

    const fab = document.querySelector<HTMLElement>(
      'button[aria-label*="assistant" i], button[aria-label*="嚮導" i], button[aria-label*="助手" i], button[aria-expanded]',
    );
    const bar = document.querySelector<HTMLElement>(".fixed.inset-x-0.bottom-0.z-30");
    const stepOl = document.querySelector("ol.mb-8");

    const fabRect = fab?.getBoundingClientRect();
    const barRect = bar?.getBoundingClientRect();

    let fabBarOverlap = false;
    if (fabRect && barRect && barRect.height > 0) {
      fabBarOverlap = fabRect.bottom > barRect.top + 4;
    }

    const continueBtn =
      document.querySelector<HTMLElement>('[data-coach-id="coach-continue-setup"]') ??
      document.querySelector<HTMLElement>('[data-coach-id="coach-continue-image"]');

    return {
      overflowPx,
      fabVisible: Boolean(fab && fabRect && fabRect.width > 0),
      mobileBarVisible: Boolean(bar && barRect && barRect.height > 0),
      fabBarOverlap,
      fabBottomPx: fabRect ? Math.round(fabRect.bottom) : null,
      barTopPx: barRect && barRect.height > 0 ? Math.round(barRect.top) : null,
      stepIndicatorVisible: Boolean(stepOl),
      continueBtnVisible: Boolean(
        continueBtn &&
          continueBtn.getBoundingClientRect().height > 0 &&
          continueBtn.getBoundingClientRect().bottom <= window.innerHeight,
      ),
    };
  });
}

async function auditPage(
  ctx: BrowserContext,
  viewportName: string,
  pagePath: string,
  label: string,
  issues: Issue[],
  opts?: { afterGoto?: (page: Page) => Promise<void> },
) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${pagePath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (opts?.afterGoto) await opts.afterGoto(page);
  await page.waitForTimeout(600);

  const finalUrl = page.url();
  const m = await measureLayout(page);
  const shot = join(OUT, `${viewportName}--${label}.png`);
  await page.screenshot({ path: shot, fullPage: false });

  if (m.overflowPx > 2) {
    issues.push({
      viewport: viewportName,
      page: label,
      kind: "horizontal-overflow",
      detail: `${m.overflowPx}px wider than viewport`,
    });
  }
  if (m.mobileBarVisible && m.fabBarOverlap) {
    issues.push({
      viewport: viewportName,
      page: label,
      kind: "fab-bar-overlap",
      detail: `FAB bottom ${m.fabBottomPx}px vs bar top ${m.barTopPx}px`,
    });
  }
  if (pagePath.includes("studio") && m.mobileBarVisible && !m.continueBtnVisible) {
    issues.push({
      viewport: viewportName,
      page: label,
      kind: "cta-offscreen",
      detail: "Mobile bar CTA not fully in viewport",
    });
  }

  console.log(
    `  ${label} (${finalUrl.replace(BASE, "") || "/"}): overflow=${m.overflowPx}px fab=${m.fabVisible ? "y" : "n"} bar=${m.mobileBarVisible ? "y" : "n"} overlap=${m.fabBarOverlap ? "YES" : "no"} cta=${m.continueBtnVisible ? "ok" : "—"}`,
  );
  await page.close();
}

async function main() {
  loadEnvLocal();
  mkdirSync(OUT, { recursive: true });

  const hasAuth = Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.E2E_CLERK_USER_ID?.trim(),
  );

  if (hasAuth) {
    await clerkSetup();
  }

  const browser = await chromium.launch({ headless: true });
  const issues: Issue[] = [];

  let authAvailable = hasAuth;

  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.name} (${vp.width}×${vp.height}) ===`);
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    if (authAvailable) {
      const authPage = await ctx.newPage();
      try {
        await signIn(authPage);
      } catch (err) {
        console.warn(`  Auth failed for ${vp.name}: ${err instanceof Error ? err.message : err}`);
        authAvailable = false;
      }
      await authPage.close();
    }

    await auditPage(ctx, vp.name, "/", "landing", issues);

    if (authAvailable) {
      await auditPage(ctx, vp.name, "/start", "start", issues);
      await auditPage(ctx, vp.name, "/studio?mode=concept", "studio-concept-setup", issues, {
        afterGoto: async (page) => {
          await page.waitForSelector("ol.mb-8", { timeout: 30_000 }).catch(() => {});
        },
      });
      await auditPage(ctx, vp.name, "/studio?mode=physical", "studio-physical-setup", issues, {
        afterGoto: async (page) => {
          await page.waitForSelector("ol.mb-8", { timeout: 30_000 }).catch(() => {});
        },
      });
    } else {
      console.log("  (skip /start, /studio — no E2E_CLERK_USER_ID)");
    }

    await auditPage(ctx, vp.name, "/pro", "pro", issues);
    await ctx.close();
  }

  await browser.close();

  console.log("\n=== SUMMARY ===");
  if (issues.length === 0) {
    console.log("No layout issues detected across viewports.");
  } else {
    for (const i of issues) {
      console.log(`[${i.kind}] ${i.viewport} / ${i.page}: ${i.detail}`);
    }
    console.log(`\n${issues.length} issue(s) found. Screenshots: ${OUT}`);
    process.exitCode = 1;
  }
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
