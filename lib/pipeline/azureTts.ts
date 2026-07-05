import { promises as fs } from "fs";

function getAzureConfig() {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (!key || !region) {
    throw new Error("Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION.");
  }
  return { key, region };
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function synthesizeCantoneseToFile(args: {
  text: string;
  voice: string;
  outputWavPath: string;
}): Promise<void> {
  return synthesizeSpeechToFile({
    text: args.text,
    voice: args.voice,
    xmlLang: "zh-HK",
    outputWavPath: args.outputWavPath,
  });
}

export async function synthesizeSpeechToFile(args: {
  text: string;
  voice: string;
  xmlLang: string;
  outputWavPath: string;
}): Promise<void> {
  const { key, region } = getAzureConfig();
  const { text, voice, xmlLang, outputWavPath } = args;
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = [
    `<speak version='1.0' xml:lang='${xmlLang}'>`,
    `<voice xml:lang='${xmlLang}' name='${voice}'>`,
    escapeXml(text),
    "</voice>",
    "</speak>",
  ].join("");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
      "User-Agent": "ai-marketing-studio-postprocess",
    },
    body: ssml,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Azure TTS failed: ${res.status} ${detail}`);
  }

  const audio = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outputWavPath, audio);
}
