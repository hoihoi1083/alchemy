/**
 * Record a real browser walkthrough of the image path (not AI clips).
 *
 *   npx tsx scripts/record-image-demo.ts
 *
 * Writes public/videos/landing/image-workflow-demo.mp4 (sped-up).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!.trim();
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const PORT = Number(process.env.PORT ?? 3000);
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const PRODUCT_PNG = path.join(
  process.cwd(),
  "public/images/landing/landing-transform-before.png",
);
const OUT_DIR = path.join(process.cwd(), "public/videos/landing");
const RAW_DIR = path.join(process.cwd(), ".demo-record");
const MARKS_JSON = path.join(RAW_DIR, "image-demo-marks.json");
const OUT_MP4 = path.join(OUT_DIR, "image-workflow-demo.mp4");

const VIEW = { width: 1440, height: 900 };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
  if (!res.ok || !body.token) {
    throw new Error(`sign_in_tokens failed: ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function hideChrome(page: Page) {
  await page.addStyleTag({
    content: `
      button[aria-label="Open studio assistant"],
      .landing-float-cta,
      [class*="LandingFloatingCta"],
      iframe[title*="issue"],
      iframe[title*="Sentry"] { display: none !important; }
    `,
  });
}

async function continueMicro(page: Page) {
  await page.getByRole("button", { name: /^Continue$/i }).last().click();
}

async function main() {
  const userId = process.env.E2E_CLERK_USER_ID?.trim();
  const sk = process.env.CLERK_SECRET_KEY?.trim();
  if (!userId || !sk) {
    throw new Error("Need E2E_CLERK_USER_ID + CLERK_SECRET_KEY in .env.local");
  }
  if (!existsSync(PRODUCT_PNG)) {
    throw new Error(`Missing product photo: ${PRODUCT_PNG}`);
  }

  await clerkSetup();

  rmSync(RAW_DIR, { recursive: true, force: true });
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  // Sign in first (not in the demo video).
  const authCtx = await browser.newContext({ viewport: VIEW });
  const authPage = await authCtx.newPage();
  await setupClerkTestingToken({ page: authPage });
  const ticket = await clerkSignInToken(userId);
  await authPage.goto(`${BASE}/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`);
  await authPage.waitForURL((u) => !u.pathname.startsWith("/sign-in"), {
    timeout: 45_000,
  });
  const storage = await authCtx.storageState();
  await authCtx.close();

  const recCtx = await browser.newContext({
    viewport: VIEW,
    storageState: storage,
    locale: "en-US",
    recordVideo: { dir: RAW_DIR, size: VIEW },
  });
  const page = await recCtx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("ams-locale", "en");
  });
  await setupClerkTestingToken({ page });

  const t0 = Date.now();
  const mark = (id: string) => {
    const sec = (Date.now() - t0) / 1000;
    console.log(`[mark] ${id} @ ${sec.toFixed(2)}s`);
    return sec;
  };
  const marks: Record<string, number> = {};

  // 1. Landing
  await page.goto(`${BASE}/`);
  await hideChrome(page);
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 20_000 });
  marks.landing = mark("landing");
  await sleep(900);
  await page.goto(`${BASE}/start`);
  await page.waitForURL(/\/start/, { timeout: 20_000 });
  await hideChrome(page);
  marks.start = mark("start");
  await sleep(900);

  // 2. Physical product
  await page.getByRole("button", { name: /Physical Products/i }).click();
  await sleep(600);
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await page.waitForURL(/\/studio/, { timeout: 20_000 });
  await hideChrome(page);
  marks.studio = mark("studio");
  await sleep(800);

  // 3. Images only
  await page.getByRole("button", { name: /Generate images only/i }).click();
  await sleep(700);
  await continueMicro(page);
  marks.path = mark("path");

  // 4. Product name
  await page.locator('[data-coach-id="coach-product"] input, [data-coach-id="coach-product"]').first().waitFor({
    timeout: 20_000,
  });
  const nameInput = page.locator("input.pn-input, [data-coach-id='coach-product']").first();
  await nameInput.click();
  await nameInput.fill("");
  await nameInput.pressSequentially("Lumina Glow Serum", { delay: 28 });
  await sleep(500);
  await continueMicro(page);
  marks.name = mark("name");

  // 5. Direct create (skip research)
  await page.getByRole("tab", { name: /Direct create/i }).click();
  await sleep(700);
  await continueMicro(page);
  marks.setup = mark("setup");

  // 6. Headline + product photo (main dropzone — not the optional style-reference input)
  const headline = page.locator("label").filter({ hasText: /Main hook/i }).locator("input.pg-input");
  await headline.waitFor({ timeout: 25_000 });
  await headline.click();
  await headline.fill("");
  await headline.pressSequentially("Glow that shows up on camera", { delay: 22 });
  await sleep(400);

  const single = page.getByRole("button", { name: /Single image/i });
  if (await single.count()) {
    await single.first().click();
    await sleep(400);
  }

  const dropLabel = page.locator("label").filter({ hasText: /Drag & drop/i }).first();
  await dropLabel.waitFor({ timeout: 15_000 });
  const inputId = await dropLabel.getAttribute("for");
  if (!inputId) throw new Error("Main product photo input has no id");
  await page.locator(`input[id="${inputId}"]`).setInputFiles(PRODUCT_PNG);
  await page.locator("img").filter({ has: page.locator("xpath=ancestor::div[contains(@class,'h-24')]") }).first().waitFor({
    timeout: 10_000,
  }).catch(() => {});
  await sleep(1200);

  const generateBtn = page.locator("button.pg-generate-btn").first();
  await generateBtn.scrollIntoViewIfNeeded();
  try {
    await generateBtn.waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForFunction(
      () => {
        const btn = document.querySelector("button.pg-generate-btn") as HTMLButtonElement | null;
        return Boolean(btn && !btn.disabled);
      },
      null,
      { timeout: 20_000 },
    );
  } catch {
    const msg = await page.locator(".pg-desktop-generate p, .pg-generate-btn").first().textContent();
    await page.screenshot({ path: path.join(RAW_DIR, "generate-blocked.png"), fullPage: true });
    throw new Error(`Generate stayed disabled. UI said: ${msg?.trim() ?? "(no message)"}`);
  }
  await sleep(600);
  await generateBtn.click();
  marks.generate = mark("generate");

  // 7. Wait for real generation (not a UI thumbnail).
  await page
    .getByText(/Generating photos/i)
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => {});
  try {
    await page
      .getByRole("heading", {
        name: /Review your generated content|Your image is ready|Review generated image/i,
      })
      .first()
      .waitFor({ timeout: 120_000 });
    marks.result = mark("result");
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("img")].some((img) => {
          const el = img as HTMLImageElement;
          const src = el.currentSrc || el.src || "";
          if (!src || src.startsWith("data:")) return false;
          if (/landing|mascot|logo|icon|flask|avatar|wordmark/i.test(src)) return false;
          // 4:5 generated still — taller than wide, not a tiny thumb.
          return el.naturalWidth > 280 && el.naturalHeight > el.naturalWidth * 1.15;
        }),
      null,
      { timeout: 60_000 },
    );
    await page.evaluate(() => {
      const hit = [...document.querySelectorAll("img")].find((img) => {
        const el = img as HTMLImageElement;
        return el.naturalWidth > 280 && el.naturalHeight > el.naturalWidth * 1.15;
      });
      hit?.scrollIntoView({ block: "center" });
    });
    await sleep(1200);
    await sleep(800);
    await page.screenshot({
      path: path.join(RAW_DIR, "result-still.jpg"),
      type: "jpeg",
      quality: 82,
    });
    await sleep(2800);
  } catch {
    marks.result = mark("result-timeout");
    await page.screenshot({ path: path.join(RAW_DIR, "result-timeout.png"), fullPage: true });
    console.warn("Generate wait timed out — keeping the wizard recording.");
    await sleep(1500);
  }

  marks.end = mark("end");
  writeFileSync(MARKS_JSON, JSON.stringify(marks, null, 2));

  const video = page.video();
  await recCtx.close();
  await browser.close();

  if (!video) throw new Error("Playwright did not record a video");
  const webm = await video.path();
  console.log(`Raw video: ${webm}`);

  speedAndMux(webm, marks);
}

function speedAndMux(webm: string, marks: Record<string, number>) {
  const gen = marks.generate ?? 0;
  const result = marks.result ?? marks.end ?? gen + 1;
  const end = marks.end ?? result;

  // Fast-forward: setup 2.2×, generate wait 7×, hold result 1.4×.
  const aEnd = Math.max(0.2, gen);
  const bEnd = Math.max(aEnd + 0.2, result);
  const cEnd = Math.max(bEnd + 0.2, end);

  const still = path.join(RAW_DIR, "result-still.jpg");
  const tmp = path.join(RAW_DIR, "sped.mp4");
  const stillMp4 = path.join(RAW_DIR, "result-hold.mp4");

  const filter = [
    `[0:v]trim=0:${aEnd.toFixed(2)},setpts=PTS/2.2[v0]`,
    `[0:v]trim=${aEnd.toFixed(2)}:${bEnd.toFixed(2)},setpts=(PTS-STARTPTS)/7[v1]`,
    `[0:v]trim=${bEnd.toFixed(2)}:${cEnd.toFixed(2)},setpts=(PTS-STARTPTS)/1.4[v2]`,
    `[v0][v1][v2]concat=n=3:v=1:a=0,fps=30,format=yuv420p,scale=1280:-2[v]`,
  ].join(";");

  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      webm,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      tmp,
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed with status ${r.status}`);
  }

  if (!existsSync(still)) {
    spawnSync("ffmpeg", [
      "-y",
      "-i",
      tmp,
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      OUT_MP4,
    ], { stdio: "inherit" });
    console.log(`Wrote ${OUT_MP4}`);
    return;
  }

  const hold = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      still,
      "-t",
      "3.2",
      "-vf",
      "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      stillMp4,
    ],
    { stdio: "inherit" },
  );
  if (hold.status !== 0) {
    throw new Error(`ffmpeg still failed with status ${hold.status}`);
  }

  const r2 = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      tmp,
      "-i",
      stillMp4,
      "-filter_complex",
      "[0:v][1:v]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v]",
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      OUT_MP4,
    ],
    { stdio: "inherit" },
  );
  if (r2.status !== 0) {
    throw new Error(`ffmpeg concat failed with status ${r2.status}`);
  }
  spawnSync("cp", [
    still,
    path.join(process.cwd(), "public/images/landing/image-workflow-demo-poster.jpg"),
  ]);
  console.log(`Wrote ${OUT_MP4}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
