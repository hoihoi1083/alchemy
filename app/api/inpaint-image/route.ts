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
import { buildInpaintFillPrompt, isEraseIntent } from "@/lib/inpaint-erase";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Prompted replacement inside the mask. */
const FILL_ENDPOINT = "fal-ai/flux-pro/v1/fill";
/**
 * True erase — no text prompt. FLUX Fill was painting our heal instructions
 * as literal words in the image (e.g. "Content-aware fill").
 */
const ERASE_ENDPOINT = "fal-ai/flux-pro/v1/erase";

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
  const productName = (formData.get("product_name") as string | null)?.trim() || "";
  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const artStyle = (formData.get("art_style") as string | null)?.trim() || "";

  // Explicit fill mode always uses Fill (so "改成正確文字" is not swallowed by erase).
  // Erase = dedicated FLUX Erase (no prompt) — Fill was painting heal instructions as text.
  const useErase =
    modeField === "erase" ||
    (modeField !== "fill" && (isEraseIntent(rawPrompt) || !rawPrompt));

  let fillPrompt = "";
  if (!useErase) {
    fillPrompt = rawPrompt;
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
    fillPrompt = buildInpaintFillPrompt(fillPrompt, {
      product: productName,
      headline,
      subline,
      offer,
      artStyle,
    });
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

  const { jobId, dir } = await createOwnedJobDir(auth.user.userId);
  const inputPath = path.join(dir, "inpaint-input.png");

  // Materialize source BEFORE charge so we can bill by megapixel.
  let sourceBytes: Buffer;
  try {
    if (isUsableImageUrl(sourceUrl)) {
      await materializeMediaInput(sourceUrl!, inputPath, { clerkId: auth.user.userId });
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

  const endpoint = useErase ? ERASE_ENDPOINT : FILL_ENDPOINT;
  const megapixels = await megapixelsFromBuffer(sourceBytes);
  const tokenCost = estimateInpaintTokens(megapixels);
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "inpaint",
    endpoint,
    mode: useErase ? "erase" : "fill",
    megapixels: Math.ceil(Math.max(1, megapixels)),
  });
  if ("error" in charged) return charged.error;

  fal.config({ credentials: key });

  try {
    const inputFile = new File([new Uint8Array(sourceBytes)], "source.png", {
      type: "image/png",
    });
    const [falImageUrl, maskUrl] = await Promise.all([
      fal.storage.upload(inputFile),
      fal.storage.upload(maskFile),
    ]);

    const result = useErase
      ? await fal.subscribe(ERASE_ENDPOINT, {
          input: {
            image_url: falImageUrl,
            mask_url: maskUrl,
            // Expand mask so text/box edges are fully removed.
            dilate_pixels: 12,
          },
          logs: true,
        })
      : await fal.subscribe(FILL_ENDPOINT, {
          input: {
            prompt: fillPrompt,
            image_url: falImageUrl,
            mask_url: maskUrl,
            output_format: "png",
            enhance_prompt: true,
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
      endpoint,
      mode: useErase ? "erase" : "fill",
      tokensCharged: tokenCost,
      megapixelsBilled: Math.ceil(Math.max(1, megapixels)),
      creditBalance: charged.balanceAfter,
      note: useErase
        ? "Erased — masked pixels removed with FLUX Erase (no prompt)."
        : "FLUX Fill — only masked pixels were regenerated from your description.",
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "inpaint",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
