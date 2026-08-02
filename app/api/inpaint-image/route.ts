import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { estimateInpaintTokens } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { parseBrandKit } from "@/lib/brand-kit";
import { brandKitHasPromptContent, brandKitPromptBlock } from "@/lib/brand-merge";
import {
  buildInpaintErasePrompt,
  buildInpaintFillPrompt,
  isEraseIntent,
} from "@/lib/inpaint-erase";
import { jobDir } from "@/lib/pipeline/paths";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 180;

const FILL_ENDPOINT = "fal-ai/flux-pro/v1/fill";

function isUsableImageUrl(url: string | undefined): boolean {
  const u = url?.trim() ?? "";
  return (
    u.startsWith("http") ||
    u.startsWith("/api/pipeline-files/") ||
    u.startsWith("/api/library/download/")
  );
}

function formatFalError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Inpaint failed";
}

async function megapixelsFromBuffer(buf: Buffer): Promise<number> {
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > 0 && h > 0) return (w * h) / 1_000_000;
  } catch {
    /* fall through */
  }
  return 1;
}

export async function POST(req: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid or oversized upload." }, { status: 413 });
  }
  const sourceUrl = (formData.get("source_image_url") as string | null)?.trim();
  const imageFile = formData.get("image_file");
  const rawPrompt = (formData.get("prompt") as string | null)?.trim() ?? "";
  const modeField = (formData.get("inpaint_mode") as string | null)?.trim();
  const maskFile = formData.get("mask_image");
  const brandKitRaw = (formData.get("brand_kit") as string | null)?.trim() || "";

  // Erase = local heal via FILL (mask-only). FLUX Erase often deletes the whole
  // object under the brush (e.g. entire floating card), which feels wrong vs phone editors.
  const useErase =
    modeField === "erase" || (modeField !== "fill" && (!rawPrompt || isEraseIntent(rawPrompt)));

  let fillPrompt = rawPrompt;
  if (useErase) {
    fillPrompt = buildInpaintErasePrompt();
  } else {
    if (brandKitRaw) {
      try {
        const brandKit = parseBrandKit(JSON.parse(brandKitRaw));
        if (brandKitHasPromptContent(brandKit)) {
          fillPrompt = [fillPrompt, brandKitPromptBlock(brandKit)].filter(Boolean).join(". ");
        }
      } catch {
        return NextResponse.json({ error: "Invalid brand kit data." }, { status: 400 });
      }
    }
    fillPrompt = buildInpaintFillPrompt(fillPrompt);
    if (!fillPrompt.trim()) {
      return NextResponse.json({ error: "Describe what to paint inside the mask." }, { status: 400 });
    }
  }

  if (!(maskFile instanceof File) || maskFile.size === 0) {
    return NextResponse.json({ error: "Draw a mask area first." }, { status: 400 });
  }

  if (!isUsableImageUrl(sourceUrl) && !(imageFile instanceof File && imageFile.size > 0)) {
    return NextResponse.json(
      { error: "source_image_url or image_file is required." },
      { status: 400 },
    );
  }

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  const inputPath = path.join(dir, "inpaint-input.png");

  // Materialize source BEFORE charge so we can bill by megapixel (fal $0.05/MP).
  let sourceBytes: Buffer;
  try {
    if (isUsableImageUrl(sourceUrl)) {
      await materializeMediaInput(sourceUrl!, inputPath);
      sourceBytes = await fs.readFile(inputPath);
    } else if (imageFile instanceof File && imageFile.size > 0) {
      sourceBytes = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(inputPath, sourceBytes);
    } else {
      return NextResponse.json(
        { error: "source_image_url or image_file is required." },
        { status: 400 },
      );
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load source image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const megapixels = await megapixelsFromBuffer(sourceBytes);
  const tokenCost = estimateInpaintTokens(megapixels);
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "inpaint",
    endpoint: FILL_ENDPOINT,
    mode: useErase ? "erase" : "fill",
    megapixels: Math.ceil(Math.max(1, megapixels)),
  });
  if ("error" in charged) return charged.error;

  fal.config({ credentials: key });

  try {
    const inputFile = new File([new Uint8Array(sourceBytes)], "source.png", {
      type: "image/png",
    });
    const falImageUrl = await fal.storage.upload(inputFile);
    const maskUrl = await fal.storage.upload(maskFile);

    const result = await fal.subscribe(FILL_ENDPOINT, {
      input: {
        prompt: fillPrompt,
        image_url: falImageUrl,
        mask_url: maskUrl,
        output_format: "png",
      },
      logs: true,
    });

    const data = result.data as { images?: Array<{ url?: string }> };
    const outUrl = data.images?.[0]?.url;
    if (!outUrl) throw new Error("Inpaint response missing image URL.");

    const res = await fetch(outUrl);
    if (!res.ok) throw new Error("Failed to download inpaint result.");
    const buffer = Buffer.from(await res.arrayBuffer());
    const outName = useErase ? "erase-result.png" : "inpaint-result.png";
    await fs.writeFile(path.join(dir, outName), buffer);
    const pipelineUrl = pipelineFileUrl(req, jobId, outName);
    // Durable R2 URL — pipeline /tmp files vanish across Vercel instances.
    const imageUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrl: outUrl,
      fallbackUrl: pipelineUrl,
      bytes: buffer,
      contentType: "image/png",
      name: useErase ? "erase-result" : "inpaint-result",
    });

    await trackUsage(auth.user.userId, "image");
    return NextResponse.json({
      imageUrl,
      endpoint: FILL_ENDPOINT,
      mode: useErase ? "erase" : "fill",
      tokensCharged: tokenCost,
      megapixelsBilled: Math.ceil(Math.max(1, megapixels)),
      creditBalance: charged.balanceAfter,
      note: useErase
        ? "Local heal — only masked pixels were regenerated; surrounding content kept."
        : "FLUX Fill — only masked pixels were regenerated.",
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "inpaint",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
