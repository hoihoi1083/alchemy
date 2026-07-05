const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export function deepSeekApiKey(): string | null {
  const key =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.API_KEY?.trim() ||
    "";
  if (!key || key === "your_actual_deepseek_api_key_here") return null;
  return key;
}

export async function callDeepSeekChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    /** Ask DeepSeek for strict JSON object output when supported. */
    jsonObject?: boolean;
  } = {},
): Promise<string> {
  const apiKey = deepSeekApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing DEEPSEEK_API_KEY. Copy it from HarmoniqFengShui into .env.local.",
    );
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: options.model || process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1200,
      stream: false,
      // V4 defaults to thinking mode (bills extra output tokens). Planning tasks don't need CoT.
      thinking: { type: "disabled" },
      ...(options.jsonObject ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    if (res.status === 402 || raw.includes("Insufficient Balance")) {
      throw new Error(
        "DeepSeek API: account balance is empty. Top up at platform.deepseek.com (same key as Harmoniq).",
      );
    }
    throw new Error(`DeepSeek API error (${res.status}): ${raw.slice(0, 300)}`);
  }

  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = parsed.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek returned an empty response.");
  return content;
}
