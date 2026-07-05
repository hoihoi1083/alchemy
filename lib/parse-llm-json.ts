import { jsonrepair } from "jsonrepair";

/** Strip ```json fences from model output. */
export function stripMarkdownFence(raw: string): string {
  const t = raw.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1].trim() : t;
}

function normalizeSmartQuotes(input: string): string {
  return input
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'");
}

function escapeControlCharsInJsonStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") continue;
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
    }
    out += ch;
  }
  return out;
}

function removeTrailingCommas(input: string): string {
  return input.replace(/,(\s*[}\]])/g, "$1");
}

function countUnclosedBrackets(json: string): { braces: number; brackets: number } {
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  return { braces: Math.max(0, braces), brackets: Math.max(0, brackets) };
}

function closeTruncatedJson(json: string): string {
  const { braces, brackets } = countUnclosedBrackets(json);
  let s = json;
  for (let i = 0; i < brackets; i++) s += "]";
  for (let i = 0; i < braces; i++) s += "}";
  return s;
}

function repairJsonText(json: string): string {
  return closeTruncatedJson(
    removeTrailingCommas(escapeControlCharsInJsonStrings(normalizeSmartQuotes(json))),
  );
}

/** Parse a JSON object from LLM text with common repair passes. */
export function parseLlmJsonObject<T>(raw: string, label = "Model"): T {
  const cleaned = stripMarkdownFence(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`${label} returned invalid JSON.`);
  }

  const slice = cleaned.slice(start, end + 1);
  const candidates = [slice, repairJsonText(slice)];

  try {
    candidates.push(jsonrepair(slice));
  } catch {
    // jsonrepair could not fix — other passes may still work
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      lastError = e;
    }
  }

  try {
    return JSON.parse(jsonrepair(repairJsonText(slice))) as T;
  } catch (e) {
    lastError = e;
  }

  const detail = lastError instanceof Error ? lastError.message : "parse failed";
  throw new Error(`${label} returned invalid JSON: ${detail}`);
}
