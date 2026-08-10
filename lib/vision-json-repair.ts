import { fal } from "@fal-ai/client";
import { callDeepSeekChat, deepSeekApiKey } from "@/lib/deepseek-client";
import { cleanBagelVisionText } from "@/lib/bagel-understand";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";

const FLORENCE_DETAILED = "fal-ai/florence-2-large/detailed-caption";

/** fal-native caption — billed on FAL_KEY, no OpenRouter / Bagel think traces. */
export async function runFlorenceDetailedCaption(
	imageUrl: string,
): Promise<string> {
	const result = await fal.subscribe(FLORENCE_DETAILED, {
		input: { image_url: imageUrl },
		logs: false,
	});
	const data = result.data as Record<string, unknown> | undefined;
	const text =
		(typeof data?.results === "string" && data.results.trim()) ||
		(typeof data?.text === "string" && data.text.trim()) ||
		(typeof data?.output === "string" && data.output.trim()) ||
		"";
	if (!text) throw new Error("Florence caption returned empty.");
	return text;
}

/**
 * Parse model text as JSON; if Bagel/Florence returned prose or &lt;think&gt;,
 * repair into the expected schema via DeepSeek.
 */
export async function parseOrRepairVisionJson<T extends object>(
	raw: string,
	label: string,
	schemaExample: string,
): Promise<T> {
	const cleaned = cleanBagelVisionText(raw);
	try {
		return parseLlmJsonObject<T>(cleaned, label);
	} catch {
		// continue to repair
	}

	// JSON sometimes buried inside unfinished think / prose
	const brace = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (brace >= 0 && end > brace) {
		try {
			return parseLlmJsonObject<T>(raw.slice(brace, end + 1), label);
		} catch {
			// continue
		}
	}

	if (!deepSeekApiKey()) {
		throw new Error(
			`${label} returned invalid JSON and DeepSeek is not configured to repair it.`,
		);
	}

	const repaired = await callDeepSeekChat(
		[
			{
				role: "system",
				content:
					"You convert image-analysis notes into ONE strict JSON object. No markdown. No thinking. Fill only fields supported by the schema; use empty string when unknown.",
			},
			{
				role: "user",
				content: [
					"Target schema example:",
					schemaExample,
					"",
					"Source notes from a vision model (may include <think> or prose):",
					raw.slice(0, 6000),
				].join("\n"),
			},
		],
		{ temperature: 0.1, max_tokens: 900, jsonObject: true },
	);

	return parseLlmJsonObject<T>(repaired, `${label} (repaired)`);
}

/** Preferred path: Florence caption (fal) → DeepSeek structured JSON. */
export async function captionImageToVisionJson<T extends object>(input: {
	imageUrl: string;
	schemaExample: string;
	label: string;
	extraInstructions?: string;
}): Promise<T> {
	const caption = await runFlorenceDetailedCaption(input.imageUrl);
	if (!deepSeekApiKey()) {
		// Last resort: try treating caption as somehow JSON (won't work) — require DeepSeek
		throw new Error(
			"DeepSeek is required to structure Florence captions into a brief.",
		);
	}
	const raw = await callDeepSeekChat(
		[
			{
				role: "system",
				content:
					"You analyze marketing reference-image captions and output ONE JSON object for style/layout transfer. No markdown.",
			},
			{
				role: "user",
				content: [
					"Return JSON matching this schema:",
					input.schemaExample,
					"",
					"Rules: describe layout, colors, typography mood, subjects, and legible text if mentioned.",
					"This caption is STYLE reference only — do not invent a different product for the user.",
					input.extraInstructions ?? "",
					"",
					"Image caption:",
					caption,
				]
					.filter(Boolean)
					.join("\n"),
			},
		],
		{ temperature: 0.2, max_tokens: 1400, jsonObject: true },
	);
	return parseOrRepairVisionJson<T>(raw, input.label, input.schemaExample);
}
