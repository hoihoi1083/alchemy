import { fal } from "@fal-ai/client";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const envText = require("fs").readFileSync(envPath, "utf8");
  for (const line of envText.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) process.env[t.slice(0, i)] = t.slice(i + 1).trim();
  }
}

type GeminiAspectRatio =
  | "auto"
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9"
  | "4:1"
  | "1:4"
  | "8:1"
  | "1:8";

async function generateImage(
  prompt: string,
  filename: string,
  aspect_ratio: GeminiAspectRatio = "3:4",
) {
  console.log(`Generating: ${filename}...`);
  console.log(`Prompt: ${prompt}`);
  
  try {
    const result = await fal.subscribe("fal-ai/gemini-3.1-flash-image-preview", {
      input: {
        prompt,
        aspect_ratio,
      },
      logs: false,
    });
    
    // Extract image URL
    // @ts-ignore
    const url = result.data?.images?.[0]?.url;
    if (!url) {
      console.log(`Failed to get URL for ${filename}`);
      return;
    }
    
    console.log(`Downloading ${url}...`);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    
    const outDir = path.join(process.env.HOME || "", "Desktop", "ai-generated-posts");
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    
    const outPath = path.join(outDir, filename);
    writeFileSync(outPath, buf);
    console.log(`Saved to ${outPath}\n`);
  } catch (e) {
    console.error(`Error generating ${filename}:`, e);
  }
}

async function main() {
  loadEnvLocal();
  if (!process.env.FAL_KEY) {
    console.error("Missing FAL_KEY");
    process.exit(1);
  }
  
  fal.config({ credentials: process.env.FAL_KEY });
  
  const baseStyle = "A highly aesthetic Xiaohongshu (Little Red Book) style social media post graphic, elegant and minimalistic. High quality typography and clean layout. Center the text nicely.";
  
  // Set 1: Crystal Beginner Guide (6 images)
  const set1 = [
    {
      file: "01_crystal_guide_cover.jpg",
      text: "水晶小白第一次买手串，先看这 5 点",
      desc: "An elegant cover image showing a beautiful, high-quality crystal bracelet on a soft cream or pastel background."
    },
    {
      file: "02_crystal_guide_color.jpg",
      text: "不要只看颜色",
      desc: "A minimalistic composition with different colored crystal beads slightly out of focus, emphasizing deeper meaning."
    },
    {
      file: "03_crystal_guide_meaning.jpg",
      text: "不要只听 “招财/桃花”",
      desc: "A sleek graphic with a subtle glowing crystal, representing inner energy rather than superficial labels."
    },
    {
      file: "04_crystal_guide_material.jpg",
      text: "看材质、尺寸、佩戴感",
      desc: "A close-up macro shot of a crystal bead showing its natural texture, flawless lighting."
    },
    {
      file: "05_crystal_guide_state.jpg",
      text: "看适不适合自己的状态",
      desc: "A tranquil and calming aesthetic, maybe a soft light or water reflection over a smooth crystal stone."
    },
    {
      file: "06_crystal_guide_harmoniq.jpg",
      text: "Harmoniq 配对流程",
      desc: "A futuristic yet elegant abstract diagram or soft glowing aura, representing a precise matching system."
    }
  ];
  
  for (const item of set1) {
    const prompt = `${baseStyle} ${item.desc} The image must boldly feature the following Simplified Chinese text: "${item.text}". Make sure the Chinese text is readable and aesthetically integrated.`;
    await generateImage(prompt, item.file, "3:4");
  }
  
  // Set 2: Educational Post (Black Background)
  const set2 = {
    file: "07_education_luck_cover.jpg",
    text: "什么时候才需要 “开运”？不是越不顺越要乱买",
    desc: "A sophisticated dark mode/black background design with elegant typography and a subtle, mysterious glowing element like a moonstone or dim light."
  };
  
  const prompt2 = `${baseStyle} ${set2.desc} The image must boldly feature the following Simplified Chinese text: "${set2.text}". Ensure the background is predominantly dark/black, making the text pop.`;
  await generateImage(prompt2, set2.file, "3:4");
  
  console.log("All generations complete.");
}

main();