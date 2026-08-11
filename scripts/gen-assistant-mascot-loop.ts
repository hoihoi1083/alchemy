/**
 * Generate Ask AI launcher mascot idle loop (1:1).
 *
 *   npx tsx --env-file=.env.local scripts/gen-assistant-mascot-loop.ts
 *
 * Writes:
 *   public/images/assistant/mascot-launcher.jpg
 *   public/videos/assistant/mascot-launcher.mp4
 */
import { fal } from "@fal-ai/client";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const SRC = path.join(
	process.cwd(),
	".tmp/mascot-angles/mascot-front-hero.jpg",
);
const IMG_DIR = path.join(process.cwd(), "public/images/assistant");
const VID_DIR = path.join(process.cwd(), "public/videos/assistant");
mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(VID_DIR, { recursive: true });

const POSTER = path.join(IMG_DIR, "mascot-launcher.jpg");
const VIDEO = path.join(VID_DIR, "mascot-launcher.mp4");

if (!existsSync(SRC)) {
	console.error("Missing source:", SRC);
	process.exit(1);
}

copyFileSync(SRC, POSTER);
console.log("poster ←", SRC);

async function uploadLocal(filePath: string, mime: string) {
	const buf = readFileSync(filePath);
	return fal.storage.upload(new Blob([buf], { type: mime }));
}

async function main() {
	console.log("Uploading poster…");
	const imageUrl = await uploadLocal(POSTER, "image/jpeg");
	console.log(" ", imageUrl);

	console.log("Seedance idle loop…");
	const videoResult = await fal.subscribe(
		"bytedance/seedance-2.0/fast/image-to-video",
		{
			input: {
				prompt:
					"The cute crystalline Erlenmeyer flask mascot with chunky white lab goggles sits centered on its flat base (NO legs). Soft idle loop: gentle pink base glow breathing, tiny playful head tilt left then right, one soft blink, friendly smile. Camera completely fixed. Dark cyber-lab bokeh background stays still. No text, no logo, no extra props. Seamless loop-friendly motion.",
				image_url: imageUrl,
				duration: "4",
				aspect_ratio: "1:1",
				resolution: "720p",
				generate_audio: false,
			},
			logs: true,
		},
	);

	const videoUrl =
		(videoResult?.data as { video?: { url?: string }; video_url?: string })
			?.video?.url ||
		(videoResult?.data as { video_url?: string })?.video_url;
	if (!videoUrl) {
		console.error("Missing video url", JSON.stringify(videoResult?.data));
		process.exit(1);
	}
	console.log(" ", videoUrl);

	const buf = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
	writeFileSync(VIDEO, buf);
	console.log("✓", VIDEO, `${(buf.length / 1024).toFixed(0)} KB`);

	const mid = spawnSync(
		"ffmpeg",
		[
			"-y",
			"-ss",
			"1.5",
			"-i",
			VIDEO,
			"-frames:v",
			"1",
			"-update",
			"1",
			"-q:v",
			"2",
			POSTER,
		],
		{ encoding: "utf8" },
	);
	if (mid.status === 0) console.log("✓ refreshed poster from mid frame");
	else console.warn("ffmpeg poster refresh skipped:", mid.stderr?.slice(0, 200));

	console.log("Done.");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
