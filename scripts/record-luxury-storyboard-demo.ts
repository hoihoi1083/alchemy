/**
 * Record a real studio walkthrough: combined path + AI research + Luxury birth
 * storyboard (3 scenes) + video. Final beat: still of the output, then the clip
 * plays independently (letterboxed). Waits are sped in mux.

 *
 *   npx tsx scripts/record-luxury-storyboard-demo.ts
 *
 * Requires: app on :3000, E2E_CLERK_USER_ID + Clerk keys, ffmpeg.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { appendHeroOutput, probeDuration } from "./lib/append-hero-output";
import { savePageResultVideo } from "./lib/save-result-video";

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
const POSTER_DIR = path.join(process.cwd(), "public/images/landing");
const RAW_DIR = path.join(process.cwd(), ".demo-record/luxury");
const MARKS_JSON = path.join(RAW_DIR, "luxury-storyboard-demo-marks.json");
const OUT_MARKS = path.join(RAW_DIR, "luxury-storyboard-demo-out-marks.json");
const OUT_MP4 = path.join(OUT_DIR, "luxury-storyboard-demo.mp4");
const OUT_POSTER = path.join(POSTER_DIR, "luxury-storyboard-demo-poster.jpg");
const OUTPUT_CLIP = path.join(RAW_DIR, "output.mp4");
const MARKS_TS = path.join(process.cwd(), "lib/landing-demo.ts");

const VIEW = { width: 1440, height: 900 };
const LUXURY_BRIEF =
  "red crystal void → ruby heart pulse → serum bottle born from liquid metal; jewelry-ad lighting; no prices";

type Seg = { start: number; end: number; rate: number };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function clickName(page: Page, name: RegExp | string) {
  const loc = page.getByRole("button", { name });
  await loc.first().waitFor({ timeout: 25_000 });
  await loc.first().click();
}

async function fillSlow(locator: Locator, text: string, delay = 36) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(text, { delay });
}

async function dump(page: Page, name: string) {
  await page
    .screenshot({ path: path.join(RAW_DIR, name), fullPage: true, type: "jpeg", quality: 70 })
    .catch(() => {});
}

/** Linger on the review grid so mux can keep stills at 1×. */
async function showStoryboardStills(page: Page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".image-review-grid img").length >= 3,
    undefined,
    { timeout: 180_000 },
  );
  // Playwright's recordVideo compositor skips cross-origin <img> pixels.
  // Rewrite to blob: URLs so the demo actually shows the stills.
  await page.evaluate(async () => {
    const imgs = Array.from(
      document.querySelectorAll(".image-review-grid img"),
    ) as HTMLImageElement[];
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith("blob:") || src.startsWith("data:")) return;
        try {
          const res = await fetch(src, { mode: "cors", credentials: "omit" });
          const blob = await res.blob();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("blob img"));
            img.src = URL.createObjectURL(blob);
          });
        } catch {
          try {
            const res = await fetch(src, { credentials: "include" });
            const blob = await res.blob();
            img.src = URL.createObjectURL(blob);
            await new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          } catch {
            /* keep src */
          }
        }
      }),
    );
  });
  await page.waitForFunction(
    () => {
      const imgs = Array.from(
        document.querySelectorAll(".image-review-grid img"),
      ) as HTMLImageElement[];
      return imgs.filter((img) => img.complete && img.naturalWidth > 80).length >= 3;
    },
    undefined,
    { timeout: 60_000 },
  );
  const frames = page.locator(".image-review-grid img");
  const n = Math.min(3, await frames.count());
  for (let i = 0; i < n; i++) {
    await frames.nth(i).scrollIntoViewIfNeeded().catch(() => {});
    await wait(1400);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(3200);
}

async function waitForResultVideo(page: Page, timeoutMs: number) {
  await page.waitForFunction(
    () => {
      const videos = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
      return videos.some(
        (v) =>
          v.readyState >= 2 &&
          v.videoWidth > 80 &&
          Number.isFinite(v.duration) &&
          v.duration > 1,
      );
    },
    undefined,
    { timeout: timeoutMs },
  );
}

/** Brief hold on the Studio review UI — the real clip is muxed on independently. */
async function holdResultUi(page: Page) {
  await page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
    const v =
      videos.find(
        (el) => el.videoWidth > 80 && Number.isFinite(el.duration) && el.duration > 1,
      ) ?? videos[0];
    if (!v) return;
    v.scrollIntoView({ block: "center", inline: "center" });
    v.pause();
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
  });
  await wait(2200);
}

async function main() {
  if (process.argv.includes("--mux-only")) {
    const marks = JSON.parse(readFileSync(MARKS_JSON, "utf8")) as Record<string, number>;
    const files = readdirSync(RAW_DIR);
    const webmName = files.find((f) => f.endsWith(".webm"));
    if (!webmName) throw new Error("No .webm in .demo-record — record first");
    muxDemo(path.join(RAW_DIR, webmName), marks);
    return;
  }
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
  mkdirSync(POSTER_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const authCtx = await browser.newContext({ viewport: VIEW });
  const authPage = await authCtx.newPage();
  await setupClerkTestingToken({ page: authPage });
  const ticket = await clerkSignInToken(userId);
  await authPage.goto(`${BASE}/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`);
  await authPage.waitForURL((u) => !u.pathname.startsWith("/sign-in"), {
    timeout: 45_000,
  });
  // Warm routes so the recorded landing is not a cold compile.
  await authPage.goto(`${BASE}/`).catch(() => {});
  await authPage.goto(`${BASE}/start`).catch(() => {});
  const storage = await authCtx.storageState();
  await authCtx.close();

  const recCtx = await browser.newContext({
    viewport: VIEW,
    storageState: storage,
    locale: "en-US",
    bypassCSP: true,
    ignoreHTTPSErrors: true,
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

  // 1. Landing — short beat only (homepage dwell is trimmed again in mux).
  await page.goto(`${BASE}/`);
  await hideChrome(page);
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 20_000 });
  marks.landing = mark("landing");
  await wait(1400);
  await page.goto(`${BASE}/start`);
  await page.waitForURL(/\/start/, { timeout: 20_000 });
  await hideChrome(page);
  marks.start = mark("start");
  await wait(900);

  await clickName(page, /Physical Products/i);
  await wait(500);
  await page.locator(".start-continue-btn").click();
  await page.waitForURL(/\/studio/, { timeout: 60_000 });
  await hideChrome(page);
  marks.studio = mark("studio");
  await wait(700);

  // 2. Combined = create stills + storyboard video (the selling point).
  await clickName(page, /Generate images, then video/i);
  await wait(800);
  await continueMicro(page);
  marks.path = mark("path");

  await page
    .locator('[data-coach-id="coach-product"] input, [data-coach-id="coach-product"]')
    .first()
    .waitFor({ timeout: 20_000 });
  const nameInput = page.locator("input.pn-input, [data-coach-id='coach-product']").first();
  await fillSlow(nameInput, "Lumina Glow Serum", 30);
  await wait(500);
  await continueMicro(page);
  marks.name = mark("name");

  // 3. AI research — stay here long enough to read results, then Direct create
  //    (Luxury birth cannot keep a research reel).
  await page.getByRole("tab", { name: /Platform research/i }).click();
  marks.research = mark("research");
  await wait(700);
  const keywordBox = page.locator("input").nth(0);
  try {
    await page.getByPlaceholder(/crystal bracelet/i).first().click({ timeout: 8_000 });
    await page.getByPlaceholder(/crystal bracelet/i).first().fill("");
    await page
      .getByPlaceholder(/crystal bracelet/i)
      .first()
      .pressSequentially("luxury skincare serum", { delay: 28 });
  } catch {
    await keywordBox.fill("luxury skincare serum");
  }
  await wait(400);
  await page.getByRole("button", { name: /Research live content/i }).click();
  const researchHit = await page
    .getByText(/Top 3 picks|All posts found|AI Research Result/i)
    .first()
    .waitFor({ timeout: 90_000 })
    .then(() => true)
    .catch(() => false);
  marks.researchResults = mark(researchHit ? "research-results" : "research-timeout");
  await wait(researchHit ? 3200 : 1600);
  if (researchHit) {
    const selectBtn = page.getByRole("button", { name: /Select this style/i }).first();
    if (await selectBtn.count()) {
      await selectBtn.click().catch(() => {});
      await wait(1200);
    }
  }

  const directTab = page.locator("button.if-tab").nth(1);
  if (await directTab.isVisible().catch(() => false)) {
    await directTab.click();
    await wait(900);
    await continueMicro(page);
  } else {
    const continueBtn = page.getByRole("button", { name: /^Continue$/i });
    if (await continueBtn.count()) {
      await continueBtn.last().click().catch(() => {});
    }
  }
  marks.setup = mark("setup");

  // 4. Luxury birth setup
  const headline = page
    .locator("label")
    .filter({ hasText: /Main hook/i })
    .locator("input.pg-input");
  await headline.waitFor({ timeout: 25_000 });
  await fillSlow(headline, "Glow that shows up on camera", 24);
  await wait(400);

  await page.getByRole("option", { name: /Luxury birth/i }).click();
  await wait(600);
  const sceneSelect = page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: /^3$/ }) })
    .first();
  await sceneSelect.selectOption("3").catch(() => {});

  const brief = page.locator("textarea.pg-textarea").first();
  await brief.waitFor({ timeout: 15_000 });
  await fillSlow(brief, LUXURY_BRIEF, 12);
  await wait(400);

  const dropLabel = page.locator("label").filter({ hasText: /Drag & drop|Upload/i }).first();
  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  if (await dropLabel.count()) {
    const inputId = await dropLabel.getAttribute("for");
    if (inputId) {
      await page.locator(`input[id="${inputId}"]`).setInputFiles(PRODUCT_PNG);
    } else {
      await fileInput.setInputFiles(PRODUCT_PNG);
    }
  } else {
    await fileInput.waitFor({ state: "attached", timeout: 15_000 });
    await fileInput.setInputFiles(PRODUCT_PNG);
  }
  await wait(1400);

  const outlineBtn = page.getByRole("button", { name: /Generate storyboard outline/i });
  await outlineBtn.scrollIntoViewIfNeeded();
  await outlineBtn.click();
  marks.outline = mark("outline");
  await page.getByRole("button", { name: /^Re-plan outline$/i }).waitFor({
    timeout: 180_000,
  });
  marks.outlineReady = mark("outline-ready");
  await wait(1800);

  const generateBtn = page.locator("button.pg-generate-btn").first();
  await generateBtn.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => {
      const btn = document.querySelector("button.pg-generate-btn") as HTMLButtonElement | null;
      return Boolean(btn && !btn.disabled);
    },
    null,
    { timeout: 20_000 },
  );
  await wait(500);
  await generateBtn.click();
  marks.generateStills = mark("generate-stills");

  const approveBox = page.getByText("These stills are good — continue to video");
  const stillsReady = await approveBox
    .waitFor({ timeout: 480_000 })
    .then(() => true)
    .catch(() => false);
  if (!stillsReady) {
    await page.screenshot({
      path: path.join(RAW_DIR, "stills-timeout.png"),
      fullPage: true,
    });
    const errText = await page.locator("body").innerText();
    throw new Error(
      `Stills review never appeared. UI snippet: ${errText.slice(0, 1200)}`,
    );
  }
  marks.stillsReady = mark("stills-ready");
  await showStoryboardStills(page);
  await dump(page, "stills-viewed.jpg");
  marks.stillsViewed = mark("stills-viewed");
  await wait(400);
  await page.locator('input[type="checkbox"]').last().check({ force: true });
  await wait(700);
  await page.getByRole("button", { name: /^Continue$/i }).last().click();
  marks.approve = mark("approve");
  await wait(1200);

  const videoBtn = page
    .getByRole("button", { name: /Approve & generate video|Generate video/i })
    .first();
  await videoBtn.waitFor({ timeout: 40_000 });
  await videoBtn.scrollIntoViewIfNeeded();
  await wait(600);
  await videoBtn.click();
  marks.generateVideo = mark("generate-video");

  try {
    await waitForResultVideo(page, 900_000);
  } catch {
    await dump(page, "video-timeout.jpg");
    const errText = await page.locator("body").innerText();
    throw new Error(`Output video never appeared. UI snippet: ${errText.slice(0, 1200)}`);
  }
  marks.videoReady = mark("video-ready");
  await dump(page, "result-still.jpg");
  try {
    await savePageResultVideo(page, OUTPUT_CLIP);
    console.log(`Saved result clip ${OUTPUT_CLIP}`);
  } catch (err) {
    console.warn("Could not download result clip — mux will keep in-app playback", err);
  }
  await holdResultUi(page);
  marks.videoPlayed = mark("video-played");
  await wait(400);

  marks.end = mark("end");
  writeFileSync(MARKS_JSON, JSON.stringify(marks, null, 2));

  const video = page.video();
  await recCtx.close();
  await browser.close();

  if (!video) throw new Error("Playwright did not record a video");
  const webm = await video.path();
  console.log(`Raw video: ${webm}`);
  muxDemo(webm, marks);
}

function mapRawToOut(raw: number, segs: Seg[]): number {
  let out = 0;
  for (const s of segs) {
    if (raw <= s.start) return out;
    const clipEnd = Math.min(raw, s.end);
    out += (clipEnd - s.start) / s.rate;
    if (raw < s.end) return out;
  }
  return out;
}

function muxDemo(webm: string, marks: Record<string, number>) {
  const start = marks.start ?? 2;
  const research = marks.research ?? start;
  const setup = marks.setup ?? research;
  const researchResults = marks.researchResults ?? setup;
  const typedEnd = Math.min(research + 8, researchResults);
  const outline = marks.outline ?? setup;
  const outlineReady = marks.outlineReady ?? outline;
  const genStills = marks.generateStills ?? outlineReady;
  const stillsReady = marks.stillsReady ?? genStills;
  const stillsViewed = marks.stillsViewed ?? stillsReady;
  const genVideo = marks.generateVideo ?? stillsViewed;
  const videoReady = marks.videoReady ?? marks.end ?? genVideo;
  const videoPlayed = marks.videoPlayed ?? marks.end ?? videoReady;
  const end = marks.end ?? videoPlayed;

  const landingKeep = 2.1;
  const landingStart = Math.max(0, start - landingKeep);

  // Fast-forward waits; keep stills review + full output playback at 1×.
  const segs: Seg[] = [
    { start: landingStart, end: start, rate: 1 },
    { start, end: research, rate: 1.25 },
    { start: research, end: typedEnd, rate: 1.2 },
    { start: typedEnd, end: researchResults, rate: 14 },
    { start: researchResults, end: setup, rate: 1.15 },
    { start: setup, end: outline, rate: 1.25 },
    { start: outline, end: outlineReady, rate: 12 },
    { start: outlineReady, end: genStills, rate: 1.2 },
    { start: genStills, end: stillsReady, rate: 16 },
    { start: stillsReady, end: stillsViewed, rate: 1 },
    { start: stillsViewed, end: genVideo, rate: 1.35 },
    { start: genVideo, end: videoReady, rate: 16 },
    { start: videoReady, end: videoPlayed, rate: 1 },
    { start: videoPlayed, end: Math.max(videoPlayed + 0.2, end), rate: 1 },
  ].filter((s) => s.end - s.start > 0.12);

  const parts = segs.map(
    (s, i) =>
      `[0:v]trim=${s.start.toFixed(2)}:${s.end.toFixed(2)},setpts=(PTS-STARTPTS)/${s.rate}[v${i}]`,
  );
  const concat =
    segs.map((_, i) => `[v${i}]`).join("") +
    `concat=n=${segs.length}:v=1:a=0,fps=30,format=yuv420p,scale=1280:-2[v]`;
  const filter = [...parts, concat].join(";");

  const sped = path.join(RAW_DIR, "sped.mp4");
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", webm, "-filter_complex", filter, "-map", "[v]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", sped],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error(`ffmpeg speed failed (${r.status})`);

  const bed = ensureSoftBed();
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", sped],
    { encoding: "utf8" },
  );
  const dur = Math.max(8, Number.parseFloat(probe.stdout.trim()) || 40);
  const fadeOutAt = Math.max(2, dur - 2.4);

  const mix = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      sped,
      "-stream_loop",
      "-1",
      "-i",
      bed,
      "-filter_complex",
      `[1:a]volume=0.12,afade=t=in:st=0:d=1.6,afade=t=out:st=${fadeOutAt.toFixed(2)}:d=2.2[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      dur.toFixed(2),
      "-c:v",
      "libx264",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      OUT_MP4,
    ],
    { stdio: "inherit" },
  );
  if (mix.status !== 0) throw new Error(`ffmpeg mux failed (${mix.status})`);

  // Playwright's screencast omits cross-origin stills. Overlay the CDP screenshot
  // for the stills-review beat so the landing demo actually shows the grid.
  const stillShot = path.join(RAW_DIR, "stills-viewed.jpg");
  const tStill = mapRawToOut(stillsReady, segs);
  const tViewed = mapRawToOut(stillsViewed, segs);
  if (existsSync(stillShot) && tViewed > tStill + 0.4) {
    const hold = path.join(RAW_DIR, "stills-hold.mp4");
    const holdDur = 12;
    spawnSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-t",
        String(holdDur),
        "-i",
        stillShot,
        "-vf",
        "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=ffffff,fps=30,format=yuv420p,setsar=1",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        hold,
      ],
      { stdio: "inherit" },
    );
    const spliced = path.join(RAW_DIR, "spliced.mp4");
    const sp = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        OUT_MP4,
        "-i",
        hold,
        "-filter_complex",
        `[0:v]trim=0:${tStill.toFixed(2)},setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[vs];[0:v]trim=${tViewed.toFixed(2)},setpts=PTS-STARTPTS[v1];[v0][vs][v1]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]`,
        "-map",
        "[v]",
        "-an",
        "-c:v",
        "libx264",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        spliced,
      ],
      { stdio: "inherit" },
    );
    if (sp.status === 0) {
      const dur2 = Math.max(8, Number.parseFloat(
        spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", spliced], { encoding: "utf8" }).stdout.trim(),
      ) || 40);
      const fade2 = Math.max(2, dur2 - 2.4);
      spawnSync(
        "ffmpeg",
        [
          "-y",
          "-i",
          spliced,
          "-stream_loop",
          "-1",
          "-i",
          bed,
          "-filter_complex",
          `[1:a]volume=0.12,afade=t=in:st=0:d=1.6,afade=t=out:st=${fade2.toFixed(2)}:d=2.2[a]`,
          "-map",
          "0:v",
          "-map",
          "[a]",
          "-t",
          dur2.toFixed(2),
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          OUT_MP4,
        ],
        { stdio: "inherit" },
      );
    }
  }

  if (existsSync(OUTPUT_CLIP)) {
    const walkDur = probeDuration(OUT_MP4);
    const hero = appendHeroOutput({
      walkMp4: OUT_MP4,
      outputMp4: OUTPUT_CLIP,
      destMp4: OUT_MP4,
      destPoster: OUT_POSTER,
      trimWalkTo: walkDur,
      stillHoldSec: 1.7,
    });
    console.log("Appended independent output", hero);
  } else {
    const still = path.join(RAW_DIR, "result-still.jpg");
    if (existsSync(still)) {
      spawnSync("cp", [still, OUT_POSTER]);
    } else {
      spawnSync("ffmpeg", ["-y", "-ss", String(Math.max(0, dur - 1.2)), "-i", OUT_MP4, "-frames:v", "1", OUT_POSTER], {
        stdio: "inherit",
      });
    }
  }

  const outMarks = {
    pickProduct: Number(mapRawToOut(start, segs).toFixed(2)),
    research: Number(mapRawToOut(research, segs).toFixed(2)),
    storyboard: Number(mapRawToOut(stillsReady, segs).toFixed(2)),
    video: Number(mapRawToOut(videoReady, segs).toFixed(2)),
    duration: Number(dur.toFixed(2)),
  };
  writeFileSync(OUT_MARKS, JSON.stringify({ raw: marks, segs, outMarks }, null, 2));

  const stepMarks = [
    0,
    outMarks.research,
    outMarks.storyboard,
    outMarks.video,
  ] as const;
  const src = readFileSync(MARKS_TS, "utf8");
  const next = src.replace(
    /storyboard: \{[\s\S]*?stepMarks: \[[^\]]+\],\n  \},/,
    `storyboard: {
    video: "/videos/landing/luxury-storyboard-demo.mp4?v=${Date.now()}",
    poster: "/images/landing/luxury-storyboard-demo-poster.jpg?v=${Date.now()}",
    stepMarks: [${stepMarks.join(", ")}],
  },`,
  );
  if (next === src) {
    console.warn("Could not patch storyboard block in lib/landing-demo.ts — update stepMarks by hand");
  } else {
    writeFileSync(MARKS_TS, next);
  }

  console.log(`Wrote ${OUT_MP4}`);
  console.log("STEP_MARKS", stepMarks);
}

function ensureSoftBed(): string {
  const calm = path.join(process.cwd(), "public/bgm/calm.mp3");
  const bed = path.join(RAW_DIR, "demo-bed.mp3");
  const src = existsSync(calm)
    ? ["-i", calm]
    : [
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=174.61:duration=90",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=220:duration=90",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=261.63:duration=90",
      ];
  const filter = existsSync(calm)
    ? "[0:a]volume=1,afade=t=in:d=1[a]"
    : "[0:a]volume=0.35[a0];[1:a]volume=0.28[a1];[2:a]volume=0.22[a2];[a0][a1][a2]amix=inputs=3:normalize=0,lowpass=f=900,afade=t=in:d=2[a]";
  const args = existsSync(calm)
    ? ["-y", ...src, "-t", "90", "-filter_complex", filter, "-map", "[a]", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "4", bed]
    : ["-y", ...src, "-filter_complex", filter, "-map", "[a]", "-t", "90", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "4", bed];
  const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (r.status !== 0 || !existsSync(bed)) {
    if (existsSync(calm)) return calm;
    throw new Error("Could not build demo BGM bed");
  }
  return bed;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
