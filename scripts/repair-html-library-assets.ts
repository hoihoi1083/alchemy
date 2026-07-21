/**
 * Repair library assets that accidentally stored Clerk HTML instead of media.
 *
 * Cause: mirroring fetched http://localhost/.../api/pipeline-files/... without
 * cookies and saved the sign-in HTML page into R2.
 *
 * Fix: re-read the real file from .pipeline-jobs and overwrite R2 + Mongo.
 *
 * Run: npx tsx scripts/repair-html-library-assets.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { promises as fs } from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { resolvePipelineFileUrl } from "../lib/pipeline/local-input";
import { isR2Configured, putR2Object, getR2ObjectBytes } from "../lib/storage/r2";

function contentTypeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  return "image/png";
}

async function main() {
  if (!isR2Configured()) {
    console.error("✗ R2 not configured");
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error("✗ MONGODB_URI missing");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection("assets");

  const bad = await col
    .find({ contentType: { $regex: /html/i } })
    .toArray();

  console.log(`Found ${bad.length} HTML assets to repair`);

  let fixed = 0;
  let skipped = 0;

  for (const a of bad) {
    const local = resolvePipelineFileUrl(String(a.sourceUrl ?? ""));
    if (!local) {
      console.log(`○ skip (no pipeline path): ${a.name} — ${a.sourceUrl}`);
      skipped++;
      continue;
    }
    try {
      const bytes = await fs.readFile(local);
      if (bytes.length < 1000 || bytes[0] === 0x3c) {
        console.log(`○ skip (bad local file): ${local}`);
        skipped++;
        continue;
      }
      const contentType = contentTypeFromExt(local);
      const key = String(a.r2Key);
      await putR2Object(key, bytes, contentType);
      const verify = await getR2ObjectBytes(key);
      if (!verify || verify.contentType.includes("html")) {
        console.log(`✗ verify failed: ${a.name}`);
        skipped++;
        continue;
      }
      await col.updateOne(
        { _id: a._id as ObjectId },
        { $set: { contentType, sizeBytes: bytes.length } },
      );
      console.log(`✓ repaired ${a.name} (${bytes.length} bytes → ${contentType})`);
      fixed++;
    } catch (e) {
      console.log(`✗ ${a.name}:`, e instanceof Error ? e.message : e);
      skipped++;
    }
  }

  await client.close();
  console.log(`\nDone. Fixed ${fixed}, skipped ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
