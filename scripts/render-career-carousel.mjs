#!/usr/bin/env node
/**
 * Render career carousel PNGs to Desktop.
 * Usage: node scripts/render-career-carousel.mjs [outputDir]
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Dynamic import compiled TS via tsx if available; fallback: spawn npx tsx
const outDir =
  process.argv[2] ||
  path.join(process.env.HOME || "", "Desktop", "career-carousel-new-design");

const { spawnSync } = await import("child_process");
const tsScript = path.join(root, "scripts/render-career-carousel.ts");
const r = spawnSync("npx", ["tsx", tsScript, outDir], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
