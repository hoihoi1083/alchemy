/**
 * Recut existing landing demos: keep the studio walkthrough, then a still of
 * the generated clip, then play that clip independently (letterboxed).
 *
 *   npx tsx scripts/remux-landing-hero-output.ts
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { appendHeroOutput } from "./lib/append-hero-output";

const ROOT = process.cwd();
const MARKS_TS = path.join(ROOT, "lib/landing-demo.ts");

function patchLandingDemo(
  key: "storyboard" | "video",
  videoPath: string,
  posterPath: string,
  stepMarks: number[],
) {
  const v = Date.now();
  const src = readFileSync(MARKS_TS, "utf8");
  const block =
    key === "storyboard"
      ? /storyboard: \{[\s\S]*?stepMarks: \[[^\]]+\],\n  \},/
      : /video: \{[\s\S]*?stepMarks: \[[^\]]+\],\n  \},/;
  const next = src.replace(
    block,
    `${key}: {
    video: "${videoPath}?v=${v}",
    poster: "${posterPath}?v=${v}",
    stepMarks: [${stepMarks.join(", ")}],
  },`,
  );
  if (next === src) {
    throw new Error(`Could not patch ${key} in lib/landing-demo.ts`);
  }
  writeFileSync(MARKS_TS, next);
}

function main() {
  const luxuryOut = path.join(ROOT, ".demo-record/library-outputs/6a8466b086bd2e45e834138c.mp4");
  const dripOut = path.join(ROOT, ".demo-record/library-outputs/6a8468e686bd2e45e8341396.mp4");
  if (!existsSync(luxuryOut) || !existsSync(dripOut)) {
    throw new Error("Library output mp4s missing — run scripts/fetch-e2e-demo-outputs.ts first");
  }

  copyFileSync(luxuryOut, path.join(ROOT, ".demo-record/luxury/output.mp4"));
  copyFileSync(dripOut, path.join(ROOT, ".demo-record/social-drip/output.mp4"));

  const luxuryWalk = path.join(ROOT, "public/videos/landing/luxury-storyboard-demo.mp4");
  const dripWalk = path.join(ROOT, "public/videos/landing/social-drip-workflow-demo.mp4");

  const luxury = appendHeroOutput({
    walkMp4: luxuryWalk,
    outputMp4: luxuryOut,
    destMp4: luxuryWalk,
    destPoster: path.join(ROOT, "public/images/landing/luxury-storyboard-demo-poster.jpg"),
    trimWalkTo: 63.4,
    stillHoldSec: 1.7,
  });
  console.log("luxury", luxury);
  patchLandingDemo(
    "storyboard",
    "/videos/landing/luxury-storyboard-demo.mp4",
    "/images/landing/luxury-storyboard-demo-poster.jpg",
    [0, 6.49, 33.7, 61.61],
  );

  const drip = appendHeroOutput({
    walkMp4: dripWalk,
    outputMp4: dripOut,
    destMp4: dripWalk,
    destPoster: path.join(ROOT, "public/images/landing/social-drip-demo-poster.jpg"),
    trimWalkTo: 28.2,
    stillHoldSec: 1.7,
  });
  console.log("video", drip);
  patchLandingDemo(
    "video",
    "/videos/landing/social-drip-workflow-demo.mp4",
    "/images/landing/social-drip-demo-poster.jpg",
    [0, 7.38, 13.64, 26.42],
  );
}

main();
