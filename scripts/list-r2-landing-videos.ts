/**
 * List recent public-ish video keys from R2 (if configured).
 *   npx tsx scripts/list-r2-landing-videos.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import {
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getR2Config, isR2Configured } from "../lib/storage/r2";

async function main() {
  if (!isR2Configured()) {
    console.log("R2 not configured");
    process.exit(0);
  }
  const cfg = getR2Config()!;
  const client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  const prefixes = ["", "videos/", "landing/", "exports/", "studio/", "public/"];
  for (const Prefix of prefixes) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix,
        MaxKeys: 40,
      }),
    );
    const mp4s = (res.Contents ?? []).filter((o) => o.Key?.endsWith(".mp4"));
    if (mp4s.length) {
      console.log(`\n# prefix="${Prefix}" (${mp4s.length}+ mp4)`);
      for (const o of mp4s.slice(0, 25)) {
        console.log(`  ${(o.Size ?? 0) / 1024 / 1024 | 0}MB  ${o.Key}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
