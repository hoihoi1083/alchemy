const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export function deepSeekApiKey(): string | null {
  const key =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.API_KEY?.trim() ||
    "";
  if (!key || key === "your_actual_deepseek_api_key_here") return null;
  return key;
}

export function parseDeepSeekErrorMessage(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg;
  } catch {
    // ignore
  }
  return `Planning failed (${status}). Please try again later.`;
}

type DeepSeekVariant = {
  model: string;
  thinking: boolean;
  jsonObject: boolean;
};

function deepSeekVariants(
  options: { model?: string; jsonObject?: boolean },
): DeepSeekVariant[] {
  const primary = options.model || process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
  const wantJson = Boolean(options.jsonObject);
  const variants: DeepSeekVariant[] = [
    { model: primary, thinking: true, jsonObject: wantJson },
    { model: primary, thinking: false, jsonObject: wantJson },
  ];
  if (primary !== "deepseek-chat") {
    variants.push({ model: "deepseek-chat", thinking: false, jsonObject: wantJson });
    if (wantJson) {
      variants.push({ model: "deepseek-chat", thinking: false, jsonObject: false });
    }
  }
  return variants;
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

  const variants = deepSeekVariants(options);
  let lastRaw = "";
  let lastStatus = 0;

  for (let attempt = 0; attempt < variants.length; attempt++) {
    const variant = variants[attempt];
    const body: Record<string, unknown> = {
      model: variant.model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1200,
      stream: false,
    };
    if (variant.thinking) {
      // V4 defaults to thinking mode (bills extra output tokens). Planning tasks don't need CoT.
      body.thinking = { type: "disabled" };
    }
    if (variant.jsonObject) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (res.ok) {
      const parsed = JSON.parse(raw) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = parsed.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Planning returned an empty response.");
      return content;
    }

    lastRaw = raw;
    lastStatus = res.status;

    if (res.status === 402 || raw.includes("Insufficient Balance")) {
      throw new Error(
        "AI planning is temporarily unavailable. Please try again later.",
      );
    }

    const canRetry =
      attempt < variants.length - 1 && (res.status === 400 || res.status === 422);
    if (canRetry) {
      console.warn("[deepseek] retrying chat completion", {
        status: res.status,
        model: variant.model,
        thinking: variant.thinking,
        jsonObject: variant.jsonObject,
        message: parseDeepSeekErrorMessage(raw, res.status).slice(0, 200),
      });
      continue;
    }

    throw new Error(parseDeepSeekErrorMessage(raw, res.status));
  }

  throw new Error(parseDeepSeekErrorMessage(lastRaw, lastStatus || 400));
}
