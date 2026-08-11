/**
 * Generate brand-mascot turnarounds / angles for IG carousel use.
 *
 *   npx tsx --env-file=.env.local scripts/gen-mascot-angles.ts
 *
 * Writes: .tmp/mascot-angles/*.jpg
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

const OUT_DIR = path.join(process.cwd(), ".tmp/mascot-angles");
mkdirSync(OUT_DIR, { recursive: true });

const MASCOT = path.join(
	process.cwd(),
	"public/images/landing/alchemy-flask-cute-goggles.png",
);

const IDENTITY = `IMAGE 1 is the EXACT Alchemy brand mascot. Lock identity perfectly:
cute crystalline / low-poly Erlenmeyer flask character, pearlescent white translucent body, soft pink/magenta glow inside the base, oversized chunky light-grey / white lab safety goggles, large friendly round dark eyes with soft highlights.
CRITICAL: NO legs, NO feet, NO stubby paws, NO shoes — the flask sits on its flat circular base only, clean Erlenmeyer silhouette.
Do NOT change species, proportions, goggle shape, or materials. Do NOT turn it into a fox, animal, robot, smooth glass bottle, or different character.
Only change camera angle / expression / pose as instructed. Clean studio turnaround: soft dark cyber-lab bokeh background (deep navy/purple), subtle rim light, no text, no logo, no watermark, no extra props. Center the mascot. High-end 3D character render.`;

const ANGLES = [
	// —— existing set ——
	{
		id: "front-hero",
		out: "mascot-front-hero.jpg",
		prompt: `${IDENTITY}
Camera: straight-on front view, eye-level, mascot facing camera, friendly and centered. Slightly closer crop, hero portrait. Flat base only — no legs.`,
	},
	{
		id: "three-quarter-left",
		out: "mascot-3q-left.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter view from the LEFT. Mascot body angled ~35° so left shoulder/side of flask is closer to camera; face still looking toward camera with a friendly smile. Flat base only — no legs.`,
	},
	{
		id: "three-quarter-right",
		out: "mascot-3q-right.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter view from the RIGHT. Mascot body angled ~35° so right shoulder/side of flask is closer to camera; face still looking toward camera with a friendly smile. Flat base only — no legs.`,
	},
	{
		id: "side-profile",
		out: "mascot-side-profile.jpg",
		prompt: `${IDENTITY}
Camera: clean LEFT side profile (90°). Show flask silhouette and goggles in profile. Flat circular base only — no legs or feet.`,
	},
	{
		id: "looking-up",
		out: "mascot-looking-up.jpg",
		prompt: `${IDENTITY}
Camera: slightly low angle looking up at the mascot. Mascot tilts head upward a little, curious/hopeful expression, same face and goggles. Flat base only — no legs.`,
	},
	{
		id: "pointing",
		out: "mascot-pointing.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter view from the right. Add a tiny cute translucent crystalline arm gesturing/pointing to the LEFT (as if presenting a product). Arms only — still NO legs/feet; flask sits on flat base. Arms match the crystalline material.`,
	},

	// —— more angles ——
	{
		id: "back-view",
		out: "mascot-back-view.jpg",
		prompt: `${IDENTITY}
Camera: rear / back view. Show the back of the flask and the goggle strap clearly. Same materials and pink base glow. Flat base only — no legs.`,
	},
	{
		id: "3q-back-left",
		out: "mascot-3q-back-left.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter rear view from the LEFT rear (~135°). Mostly back/side of flask visible, a hint of one eye/goggle edge. Flat base only — no legs.`,
	},
	{
		id: "high-angle",
		out: "mascot-high-angle.jpg",
		prompt: `${IDENTITY}
Camera: high angle looking down ~30°. Mascot looking up slightly toward camera. Flat circular base clearly visible. No legs.`,
	},
	{
		id: "side-right",
		out: "mascot-side-right.jpg",
		prompt: `${IDENTITY}
Camera: clean RIGHT side profile (90°). Flat circular base only — no legs.`,
	},
	{
		id: "lean-left",
		out: "mascot-lean-left.jpg",
		prompt: `${IDENTITY}
Camera: front-ish three-quarter. Mascot body leans gently to its LEFT (playful tilt), still stable on flat base. Friendly expression. No legs.`,
	},

	// —— expressions (mostly front / slight 3q) ——
	{
		id: "expr-happy",
		out: "mascot-expr-happy.jpg",
		prompt: `${IDENTITY}
Camera: front hero portrait. Expression: big happy smile, bright sparkly eyes, cheerful energy. Keep simple cute face language — bigger smile curve only. Flat base, no legs.`,
	},
	{
		id: "expr-excited",
		out: "mascot-expr-excited.jpg",
		prompt: `${IDENTITY}
Camera: slight low angle front. Expression: excited / amazed — wider eyes, tiny open-mouth smile (cute "wow"), pink glow a bit brighter. Flat base, no legs.`,
	},
	{
		id: "expr-thinking",
		out: "mascot-expr-thinking.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter from the right. Expression: thinking — eyes glance upward-left, soft thoughtful mouth (tiny flat or slight frown-curious, not angry). Optional tiny crystalline arm with finger on chin. Flat base, no legs.`,
	},
	{
		id: "expr-wink",
		out: "mascot-expr-wink.jpg",
		prompt: `${IDENTITY}
Camera: front portrait. Expression: playful wink — one eye closed, other eye open and bright, small smile. Flat base, no legs.`,
	},
	{
		id: "expr-proud",
		out: "mascot-expr-proud.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter from the left. Expression: proud / confident — calm confident smile, chin slightly up. Flat base, no legs.`,
	},
	{
		id: "expr-surprised",
		out: "mascot-expr-surprised.jpg",
		prompt: `${IDENTITY}
Camera: front portrait. Expression: surprised — rounder wider eyes, tiny open O mouth (still cute, not scary). Flat base, no legs.`,
	},
	{
		id: "expr-shy",
		out: "mascot-expr-shy.jpg",
		prompt: `${IDENTITY}
Camera: three-quarter from the right, face slightly turned away. Expression: shy / bashful — soft smile, eyes looking sideways, gentle pose. Flat base, no legs.`,
	},
	{
		id: "expr-cheer",
		out: "mascot-expr-cheer.jpg",
		prompt: `${IDENTITY}
Camera: front three-quarter. Expression: celebrating — big smile. Tiny crystalline arms raised in a cheer (arms OK, still NO legs). Flat base only.`,
	},
] as const;

/** Default: only the new batch (skip regenerating existing keepers). */
const DEFAULT_IDS = [
	"back-view",
	"3q-back-left",
	"high-angle",
	"side-right",
	"lean-left",
	"expr-happy",
	"expr-excited",
	"expr-thinking",
	"expr-wink",
	"expr-proud",
	"expr-surprised",
	"expr-shy",
	"expr-cheer",
] as const;

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

async function genOne(
	angle: (typeof ANGLES)[number],
	mascotUrl: string,
	attempt = 1,
) {
	console.log(`[${angle.id}] (attempt ${attempt})…`);
	try {
		const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
			input: {
				prompt: angle.prompt,
				image_urls: [mascotUrl],
				num_images: 1,
				aspect_ratio: "1:1",
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
		const dest = path.join(OUT_DIR, angle.out);
		writeFileSync(dest, buf);
		console.log(`[${angle.id}] saved ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
	} catch (e: unknown) {
		const err = e as { status?: number; body?: unknown; message?: string };
		console.error(
			`[${angle.id}] error`,
			err.status,
			JSON.stringify(err.body)?.slice(0, 400) || err.message,
		);
		if (attempt < 3) {
			await new Promise((r) => setTimeout(r, 2500));
			return genOne(angle, mascotUrl, attempt + 1);
		}
		throw e;
	}
}

async function main() {
	const argv = process.argv.slice(2);
	const all = argv.includes("--all");
	const only = argv.filter((a) => a !== "--all");
	const queue = all
		? [...ANGLES]
		: only.length
			? ANGLES.filter((a) => only.includes(a.id))
			: ANGLES.filter((a) =>
					(DEFAULT_IDS as readonly string[]).includes(a.id),
				);

	if (!queue.length) {
		console.error("No matching ids. Pass ids, or --all.");
		process.exit(1);
	}

	console.log(
		`Generating ${queue.length}: ${queue.map((q) => q.id).join(", ")}`,
	);
	console.log("Uploading mascot…");
	const mascotUrl = await uploadLocal(MASCOT, "image/png");
	console.log(" ", mascotUrl);

	for (const angle of queue) {
		await genOne(angle, mascotUrl);
	}
	console.log("Done →", OUT_DIR);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
