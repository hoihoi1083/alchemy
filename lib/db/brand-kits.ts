import { getDb } from "@/lib/mongodb";
import { parseBrandKit, type BrandKit } from "@/lib/brand-kit";

export type DbBrandKit = BrandKit & {
  clerkId: string;
};

export async function getBrandKit(clerkId: string): Promise<BrandKit | null> {
  const db = await getDb();
  const doc = await db.collection<DbBrandKit>("brand_kits").findOne({ clerkId });
  return doc ? parseBrandKit(doc) : null;
}

export async function upsertBrandKit(clerkId: string, kit: BrandKit): Promise<BrandKit> {
  const db = await getDb();
  const updated: BrandKit = { ...kit, updatedAt: new Date().toISOString() };
  await db.collection<DbBrandKit>("brand_kits").updateOne(
    { clerkId },
    { $set: { ...updated, clerkId } },
    { upsert: true },
  );
  return updated;
}
