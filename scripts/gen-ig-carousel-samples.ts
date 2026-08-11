/**
 * One-off: generate 1–2 improved IG carousel sample frames with brand mascot lock.
 *
 *   npx tsx --env-file=.env.local scripts/gen-ig-carousel-samples.ts
 *
 * Writes: .tmp/ig-carousel-gen/sample-01-cover.jpg, sample-08-cta.jpg
 */
import { fal } from "@fal-ai/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
	const p = path.join(process.cwd(), ".env.local");
	if (!existsSync(p)) return;
	for (const line of readFileSync(p, "utf8").split("\n")) {
		const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (!m) continue;
		let val = m[2]!.trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (!process.env[m[1]!]) process.env[m[1]!] = val;
	}
}

loadEnvLocal();
const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
	console.error("Missing FAL_KEY");
	process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const OUT_DIR = path.join(process.cwd(), ".tmp/ig-carousel-gen");
mkdirSync(OUT_DIR, { recursive: true });

const MASCOT = path.join(
	process.cwd(),
	"public/images/landing/alchemy-flask-cute-goggles.png",
);
const LAYOUT_COVER = path.join(
	process.cwd(),
	".tmp/ig-carousel-ref/slide-01.jpg",
);
const LAYOUT_CTA = path.join(
	process.cwd(),
	".tmp/ig-carousel-ref/slide-08.jpg",
);

async function uploadLocal(filePath: string, mime: string) {
	const buf = readFileSync(filePath);
	const blob = new Blob([buf], { type: mime });
	return fal.storage.upload(blob);
}

function extractImageUrl(data: unknown): string | undefined {
	if (!data || typeof data !== "object") return undefined;
	const images = (data as { images?: Array<{ url?: string }> }).images;
	if (images?.[0]?.url) return images[0].url;
	const image = (data as { image?: { url?: string } }).image;
	if (image?.url) return image.url;
	return undefined;
}

const MASCOT_LOCK = `IMAGE 1 is the EXACT Alchemy brand mascot — lock this identity: cute crystalline / low-poly Erlenmeyer flask character, pearlescent white body, soft pink/magenta internal glow at the base, oversized chunky lab safety goggles, large friendly round dark eyes, tiny simple smile, short stubby feet. Do NOT invent a different mascot, fox, animal, robot, or smooth glass bottle character. Keep the same proportions and face.`;

const SAMPLES = [
	{
		id: "01-cover",
		layout: LAYOUT_COVER,
		out: "sample-01-cover.jpg",
		prompt: `${MASCOT_LOCK}
IMAGE 2 is the Instagram carousel COVER layout reference only — keep the same information architecture and dark cosmic tech mood, but make it cleaner, sharper, and more premium.

Create a vertical Instagram 4:5 carousel cover for Alchemy AI Lab titled "WHAT IS ALCHEMY?"
Improve the design:
- Make IMAGE 1 mascot the clear hero on the right, standing on a glowing purple holographic ring platform, looking friendly and inviting toward the product transformation.
- Left: clear before→after: plain "PRODUCT PHOTO" of a white pump bottle → arrow → elevated "MARKETING CONTENT" jungle pedestal scene with neon ring.
- Top-left: Alchemy AI Lab wordmark + flask logo (simple geometric flask mark, not the mascot).
- Headline: WHAT IS ALCHEMY? with soft blue→pink gradient on ALCHEMY.
- Subline: Turn your product photo into stunning marketing content — in seconds.
- Bottom row of 4 small neon feature chips: AI-powered creative / Fast turnaround / Social-ready content / Built for marketers.
- Bottom pill: CREATE. ELEVATE. CONVERT.
- Dark deep navy/purple cosmic background, cyan + magenta neon accents, soft particles, high-end 3D marketing illustration.
- Crisp readable English text only. No watermarks. No tiny gibberish. No extra characters.`,
	},
	{
		id: "08-cta",
		layout: LAYOUT_CTA,
		out: "sample-08-cta.jpg",
		prompt: `${MASCOT_LOCK}
IMAGE 2 is the Instagram carousel CTA layout reference only — keep the Upload → Create → Market story, but make the composition stronger and the mascot more central and polished.

Create a vertical Instagram 4:5 CTA slide for Alchemy AI Lab.
Improve the design:
- Center-stage IMAGE 1 mascot on a glowing holographic platform as the hero, confident and cute.
- Large headline: UPLOAD. CREATE. MARKET.
- Subline: Start with one product photo and turn it into scroll-stopping marketing content with Alchemy AI Lab.
- Three neon circular step icons in a row: Upload (cloud) → Create (spark) → Market (megaphone).
- Floating result cards showing a transformed beauty product ad (white pump bottle in lush tropical setting).
- Big gradient CTA pill: CREATE WITH ALCHEMY →
- Bottom line: YOUR AI CREATIVE STUDIO FOR UNSTOPPABLE BRANDS.
- Dark cosmic navy/purple background, cyan/magenta neon, premium 3D brand illustration.
- Crisp readable English text only. No watermarks. No tiny gibberish. No extra characters.`,
	},
] as const;

async function genOne(
	sample: (typeof SAMPLES)[number],
	mascotUrl: string,
	attempt = 1,
) {
	console.log(`[${sample.id}] nano-banana-2/edit (attempt ${attempt})…`);
	const layoutUrl = await uploadLocal(sample.layout, "image/jpeg");
	try {
		const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
			input: {
				prompt: sample.prompt,
				image_urls: [mascotUrl, layoutUrl],
				num_images: 1,
				aspect_ratio: "4:5",
			},
			logs: true,
		});
		const url = extractImageUrl(result.data);
		if (!url) {
			throw new Error(
				`No image URL: ${JSON.stringify(result.data).slice(0, 400)}`,
			);
		}
		const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
		const dest = path.join(OUT_DIR, sample.out);
		writeFileSync(dest, buf);
		console.log(
			`[${sample.id}] saved ${dest} (${(buf.length / 1024).toFixed(0)} KB)`,
		);
	} catch (e: unknown) {
		const err = e as { status?: number; body?: unknown; message?: string };
		console.error(
			`[${sample.id}] error`,
			err.status,
			JSON.stringify(err.body)?.slice(0, 400) || err.message,
		);
		if (attempt < 3) {
			await new Promise((r) => setTimeout(r, 3000));
			return genOne(sample, mascotUrl, attempt + 1);
		}
		throw e;
	}
}

async function main() {
	console.log("Uploading mascot…");
	const mascotUrl = await uploadLocal(MASCOT, "image/png");
	console.log(" ", mascotUrl);
	for (const sample of SAMPLES) {
		await genOne(sample, mascotUrl);
	}
	console.log("Done.");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
