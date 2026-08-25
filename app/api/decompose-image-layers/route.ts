import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  iou,
  nmsBoxes,
  parseBoxes,
  toPixelBox,
  type LayerBox,
} from "@/lib/edit-image-2-boxes";
import { localRingFill } from "@/lib/edit-image-2-local-heal";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

const ERASE_ENDPOINT = "fal-ai/flux-pro/v1/erase";

export type DecomposedLayer = {
  id: string;
  kind: "text" | "object";
  label: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  /** Cropped PNG URL (fal storage or data URL fallback). */
  cropUrl: string;
  /** @deprecated Prefer cropUrl — kept for older clients. */
  cropDataUrl?: string;
  /** Pixel bbox on the source image (for lazy matte/heal). */
  bbox: { left: number; top: number; width: number; height: number };
  /** False until first drag lifts the layer. */
  lifted: boolean;
};

async function uploadPng(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/png" }));
}

async function uploadJpeg(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/jpeg" }));
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: {
    image_url?: string;
    heal?: boolean | string;
    sam?: boolean | string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const imageUrl = body.image_url?.trim();
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: "image_url (https) is required." }, { status: 400 });
  }

  const truthy = (v: unknown) =>
    v === true || ["1", "true", "yes"].includes(String(v ?? "").trim().toLowerCase());

  // Body flags preferred; URL query kept as fallback for older callers.
  // Default ON (original working editor): heal holes + light SAM so layers can
  // move without leaving a duplicate ghost on the plate.
  const url = new URL(request.url);
  const resolveFlag = (bodyVal: unknown, queryKey: string, defaultOn: boolean) => {
    if (bodyVal !== undefined && bodyVal !== null && String(bodyVal).trim() !== "") {
      return truthy(bodyVal);
    }
    const q = url.searchParams.get(queryKey);
    if (q !== null && q !== "") return truthy(q);
    return defaultOn;
  };
  const wantSam = resolveFlag(body.sam, "sam", true);
  const wantHeal = resolveFlag(body.heal, "heal", true);

  const tokenCost = TOKEN_COST.smart_layers_detect;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_detect",
  });
  if ("error" in charged) return charged.error;

  try {
    const [ocrRes, objRes, imgRes] = await Promise.all([
      fal.subscribe("fal-ai/florence-2-large/ocr-with-region", {
        input: { image_url: imageUrl },
        logs: false,
      }),
      fal.subscribe("fal-ai/florence-2-large/object-detection", {
        input: { image_url: imageUrl },
        logs: false,
      }),
      fetch(imageUrl, { cache: "no-store" }),
    ]);

    if (!imgRes.ok) {
      throw new Error(`Failed to download image (${imgRes.status}).`);
    }
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const meta = await sharp(imgBuf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) throw new Error("Could not read image size.");

    const textBoxes = parseBoxes(ocrRes.data, "text");
    const objectBoxes = parseBoxes(objRes.data, "object").filter((b) => {
      const px = toPixelBox(b, imgW, imgH);
      return px.width * px.height < imgW * imgH * 0.85;
    });

    const textPx = textBoxes.map((b) => ({
      box: b,
      px: toPixelBox(b, imgW, imgH),
      score: b.score,
    }));

    // Drop objects that heavily overlap text; then object-vs-object NMS
    const objectCandidates = objectBoxes
      .map((b) => ({ box: b, px: toPixelBox(b, imgW, imgH), score: b.score }))
      .filter(({ px }) => !textPx.some((t) => iou(t.px, px) > 0.45));
    const objectPx = nmsBoxes(objectCandidates, 0.55);

    // Largest objects first for ranking; stack order later: objects under, text on top
    const objectRanked = [...objectPx].sort(
      (a, b) => b.px.width * b.px.height - a.px.width * a.px.height,
    );
    const selected: Array<{
      box: LayerBox;
      px: { left: number; top: number; width: number; height: number };
      score: number;
    }> = [
      ...objectRanked.slice(0, 10),
      ...textPx.slice(0, 24),
    ];

    async function samCutout(px: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): Promise<Buffer | null> {
      if (!wantSam) return null;
      try {
        const pad = 4;
        const x_min = Math.max(0, px.left - pad);
        const y_min = Math.max(0, px.top - pad);
        const x_max = Math.min(imgW, px.left + px.width + pad);
        const y_max = Math.min(imgH, px.top + px.height + pad);
        const sam = await fal.subscribe("fal-ai/sam2/image", {
          input: {
            image_url: imageUrl as string,
            box_prompts: [{ x_min, y_min, x_max, y_max }],
            apply_mask: true,
            output_format: "png",
          },
          logs: false,
        });
        const samUrl = (sam.data as { image?: { url?: string } })?.image?.url;
        if (!samUrl) return null;
        const res = await fetch(samUrl, { cache: "no-store" });
        if (!res.ok) return null;
        const full = Buffer.from(await res.arrayBuffer());
        return sharp(full)
          .extract({
            left: px.left,
            top: px.top,
            width: px.width,
            height: px.height,
          })
          .png()
          .toBuffer();
      } catch (err) {
        console.warn("[decompose-image-layers] SAM2 cutout skipped:", err);
        return null;
      }
    }

    const layers: DecomposedLayer[] = [];
    let samRefined = 0;
    const holeRects: Array<{ left: number; top: number; width: number; height: number }> = [];

    const samBudget = new Set(
      objectRanked.slice(0, 5).map((o) => `${o.px.left},${o.px.top},${o.px.width},${o.px.height}`),
    );

    for (const { box, px } of selected) {
      let crop: Buffer;
      const boxKey = `${px.left},${px.top},${px.width},${px.height}`;
      if (box.kind === "object" && samBudget.has(boxKey)) {
        const cut = await samCutout(px);
        if (cut) {
          crop = cut;
          samRefined += 1;
        } else {
          crop = await sharp(imgBuf)
            .extract({
              left: px.left,
              top: px.top,
              width: px.width,
              height: px.height,
            })
            .png()
            .toBuffer();
        }
      } else {
        crop = await sharp(imgBuf)
          .extract({
            left: px.left,
            top: px.top,
            width: px.width,
            height: px.height,
          })
          .png()
          .toBuffer();
      }

      const pad = Math.max(4, Math.round(Math.min(px.width, px.height) * 0.06));
      holeRects.push({
        left: Math.max(0, px.left - pad),
        top: Math.max(0, px.top - pad),
        width: Math.min(imgW - Math.max(0, px.left - pad), px.width + pad * 2),
        height: Math.min(imgH - Math.max(0, px.top - pad), px.height + pad * 2),
      });

      const cropUrl = await uploadPng(crop, `layer-${layers.length}.png`);
      layers.push({
        id: crypto.randomUUID(),
        kind: box.kind,
        label: box.label.slice(0, 80) || (box.kind === "text" ? "Text" : "Object"),
        text: box.kind === "text" ? box.label : "",
        xPct: (px.left / imgW) * 100,
        yPct: (px.top / imgH) * 100,
        wPct: (px.width / imgW) * 100,
        hPct: (px.height / imgH) * 100,
        cropUrl,
        bbox: { left: px.left, top: px.top, width: px.width, height: px.height },
        lifted: wantHeal || Boolean(wantSam && box.kind === "object" && samBudget.has(boxKey)),
      });
    }

    const originalJpeg = await sharp(imgBuf).jpeg({ quality: 92 }).toBuffer();
    let backgroundUrl = await uploadJpeg(originalJpeg, "background-original.jpg");
    let backgroundMode: "original" | "erase" | "local-heal" = "original";

    // Batch heal only when explicitly requested — default is lazy heal on first drag.
    if (wantHeal && holeRects.length > 0) {
      try {
        let healed: Buffer = imgBuf;
        for (const r of holeRects) {
          healed = Buffer.from(await localRingFill(healed, r, imgW, imgH));
        }
        // Re-encode once
        const jpeg = await sharp(healed).jpeg({ quality: 92 }).toBuffer();
        backgroundUrl = await uploadJpeg(jpeg, "background-healed.jpg");
        backgroundMode = "local-heal";
      } catch (localErr) {
        console.warn("[decompose-image-layers] local heal failed, trying erase:", localErr);
        try {
          const maskSvg = [
            `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`,
            `<rect width="100%" height="100%" fill="#000"/>`,
            ...holeRects.map(
              (r) =>
                `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" fill="#fff"/>`,
            ),
            `</svg>`,
          ].join("");
          const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();
          const sourcePng = await sharp(imgBuf).png().toBuffer();
          const [falImageUrl, maskUrl] = await Promise.all([
            uploadPng(sourcePng, "erase-src.png"),
            uploadPng(maskPng, "erase-mask.png"),
          ]);
          const erase = await fal.subscribe(ERASE_ENDPOINT, {
            input: {
              image_url: falImageUrl,
              mask_url: maskUrl,
              dilate_pixels: 10,
            },
            logs: false,
          });
          const erasedUrl = (erase.data as { images?: Array<{ url?: string }> })?.images?.[0]
            ?.url;
          if (!erasedUrl) throw new Error("Erase returned no image");
          const erasedRes = await fetch(erasedUrl, { cache: "no-store" });
          if (!erasedRes.ok) throw new Error(`Erase download ${erasedRes.status}`);
          const erasedBuf = Buffer.from(await erasedRes.arrayBuffer());
          backgroundUrl = await uploadJpeg(
            await sharp(erasedBuf).jpeg({ quality: 92 }).toBuffer(),
            "background-erase.jpg",
          );
          backgroundMode = "erase";
        } catch (eraseErr) {
          console.warn("[decompose-image-layers] heal failed, keeping original:", eraseErr);
          backgroundMode = "original";
        }
      }
    }

    if (layers.length === 0) {
      console.warn("[decompose-image-layers] 0 layers detected", {
        textDetected: textBoxes.length,
        objectsDetected: objectBoxes.length,
      });
    }

    return NextResponse.json({
      width: imgW,
      height: imgH,
      layerCount: layers.length,
      backgroundUrl,
      /** @deprecated Prefer backgroundUrl */
      backgroundDataUrl: backgroundUrl,
      layers,
      warning:
        layers.length === 0
          ? "No text or objects detected. Try Brush cutout to lift regions manually."
          : undefined,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
      debug: {
        textDetected: textBoxes.length,
        objectsDetected: objectBoxes.length,
        samRefined,
        backgroundMode,
        wantSam,
        wantHeal,
      },
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "smart_layers_detect",
      reason: "decompose_failed",
    });
    const message = e instanceof Error ? e.message : "Decompose failed.";
    console.error("[decompose-image-layers]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
