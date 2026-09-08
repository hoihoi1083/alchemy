import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens, requireTokens } from "@/lib/billing/charge";
import {
  estimateSmartLayersDetectTokens,
  estimateSmartLayersSandwichTokens,
  TOKEN_COST,
} from "@/lib/billing/token-costs";
import {
  nmsBoxes,
  parseBoxes,
  toPixelBox,
} from "@/lib/edit-image-2-boxes";
import { assessLiveTextConfidence } from "@/lib/edit-image-2-live-text-confidence";
import { structureTextLayers } from "@/lib/edit-image-2-text-structure";
import {
  keyUniformBackground,
  keyingLooksUseful,
  opaqueBBox,
  plateLooksUniform,
} from "@/lib/edit-image-2-text-matte";
import {
  alphaContentBBox,
  pickBackgroundLayerIndex,
} from "@/lib/edit-image-2-qwen-layers";
import {
  isLogoLikeGraphicText,
  isNearlyFlatColorLayer,
  softCoverHole,
} from "@/lib/edit-image-2-soft-cover";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 300;

const QWEN_LAYERED_ENDPOINT = "fal-ai/qwen-image-layered";

type LayerOut = {
  id: string;
  kind: "text" | "object";
  label: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  cropUrl: string;
  bbox: { left: number; top: number; width: number; height: number };
  lifted: boolean;
  z: number;
  /** Prefer Konva live type when OCR is confident. */
  useLiveText?: boolean;
  role?: "title" | "body" | "pill" | "label";
  fontSize?: number;
  fill?: string;
};

async function uploadPng(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/png" }));
}

async function uploadJpeg(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/jpeg" }));
}

function boxOverlapFraction(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): number {
  const x0 = Math.max(a.left, b.left);
  const y0 = Math.max(a.top, b.top);
  const x1 = Math.min(a.left + a.width, b.left + b.width);
  const y1 = Math.min(a.top + a.height, b.top + b.height);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return inter / Math.max(1, a.width * a.height);
}

/**
 * Hybrid Magic Layers (text → hero → Qwen remainder):
 * 1) Florence OCR — lift editable body/CTA text (skip big logo wordmarks for Qwen)
 * 2) BiRefNet — hero/subject on the original
 * 3) Soft-cover text+subject holes (no billed Florence heal) → Qwen fills the plate
 * 4) Stack: Qwen props → subject → text on top; background = Qwen bg layer
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { image_url?: string; num_layers?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawImageUrl = body.image_url?.trim();
  if (
    !rawImageUrl ||
    (!/^https?:\/\//i.test(rawImageUrl) && !isLibraryAssetUrl(rawImageUrl))
  ) {
    return NextResponse.json(
      { error: "image_url (https or library) is required." },
      { status: 400 },
    );
  }

  const numLayers = Math.max(2, Math.min(10, Math.round(Number(body.num_layers) || 6)));
  const detectCost = estimateSmartLayersDetectTokens({ sam: false });
  const qwenCost = TOKEN_COST.smart_layers_qwen;
  const sandwichBudget = estimateSmartLayersSandwichTokens();

  // Fail fast before OCR/matte if the user cannot afford a full split
  // (avoids the “text+subject only” surprise when visual peel is skipped).
  const afford = await requireTokens(auth.user.userId, sandwichBudget);
  if (afford) return afford;

  const detectCharged = await chargeTokens(auth.user.userId, detectCost, {
    kind: "smart_layers_detect",
    mode: "sandwich-text",
  });
  if ("error" in detectCharged) return detectCharged.error;

  let qwenChargedBalance: number | null = null;
  let matteTokensCharged = 0;
  let creditBalance = detectCharged.balanceAfter ?? 0;
  let logoSkipped = 0;

  try {
    const imageUrl = await falVisionImageUrl(request, rawImageUrl, {
      clerkId: auth.user.userId,
    });

    const [ocrRes, imgRes] = await Promise.all([
      fal.subscribe("fal-ai/florence-2-large/ocr-with-region", {
        input: { image_url: imageUrl },
        logs: false,
      }),
      fetch(imageUrl, { cache: "no-store" }),
    ]);
    if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status}).`);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const meta = await sharp(imgBuf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) throw new Error("Could not read image size.");

    const originalBackgroundUrl = await uploadJpeg(
      await sharp(imgBuf).jpeg({ quality: 92 }).toBuffer(),
      "sandwich-original.jpg",
    );

    // 1–2) Florence OCR + BiRefNet on the ORIGINAL (parallel-ready; subject gates jersey OCR).
    const subjectLayers: LayerOut[] = [];
    let subjectBBox: { left: number; top: number; width: number; height: number } | null =
      null;
    try {
      const matteCost = TOKEN_COST.smart_layers_matte;
      const matteCharged = await chargeTokens(auth.user.userId, matteCost, {
        kind: "smart_layers_matte",
        mode: "hybrid-subject",
      });
      if (!("error" in matteCharged)) {
        const origFalUrl = await fal.storage.upload(
          new File(
            [new Uint8Array(await sharp(imgBuf).png().toBuffer())],
            "hybrid-subject-src.png",
            { type: "image/png" },
          ),
        );
        const matte = await fal.subscribe("fal-ai/birefnet/v2", {
          input: {
            image_url: origFalUrl,
            model: "Matting",
            refine_foreground: true,
            output_format: "png",
          },
          logs: false,
        });
        const outUrl =
          (matte.data as { image?: { url?: string } })?.image?.url ??
          (matte.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
        if (outUrl) {
          const outRes = await fetch(outUrl, { cache: "no-store" });
          if (outRes.ok) {
            let matted = Buffer.from(await outRes.arrayBuffer());
            const mMeta = await sharp(matted).metadata();
            if ((mMeta.width ?? 0) !== imgW || (mMeta.height ?? 0) !== imgH) {
              matted = Buffer.from(
                await sharp(matted).resize(imgW, imgH, { fit: "fill" }).png().toBuffer(),
              );
            }
            const subBBox = await alphaContentBBox(matted);
            const coverage = subBBox?.coverage ?? 0;
            if (subBBox && coverage >= 0.04 && coverage <= 0.72) {
              const { left, top, width, height } = subBBox;
              subjectBBox = { left, top, width, height };
              const crop = await sharp(matted)
                .extract({ left, top, width, height })
                .png()
                .toBuffer();
              const cropUrl = await uploadPng(crop, "hybrid-subject.png");
              subjectLayers.push({
                id: crypto.randomUUID(),
                kind: "object",
                label: "主体",
                text: "",
                xPct: (left / imgW) * 100,
                yPct: (top / imgH) * 100,
                wPct: (width / imgW) * 100,
                hPct: (height / imgH) * 100,
                cropUrl,
                bbox: { left, top, width, height },
                lifted: true,
                z: 500,
              });
              matteTokensCharged = matteCost;
              creditBalance = matteCharged.balanceAfter ?? creditBalance;
            } else {
              await refundTokens(auth.user.userId, matteCost, {
                kind: "smart_layers_matte",
                reason: "hybrid_subject_unused",
              });
            }
          } else {
            await refundTokens(auth.user.userId, matteCost, {
              kind: "smart_layers_matte",
              reason: "hybrid_subject_download_failed",
            });
          }
        } else {
          await refundTokens(auth.user.userId, matteCost, {
            kind: "smart_layers_matte",
            reason: "hybrid_subject_empty",
          });
        }
      } else {
        console.warn("[decompose-sandwich] subject matte charge failed");
      }
    } catch (subErr) {
      console.warn("[decompose-sandwich] subject matte skipped:", subErr);
    }

    // Florence text: editable copy only — big Latin wordmarks stay for Qwen.
    const textBoxes = parseBoxes(ocrRes.data, "text");
    const filteredItems = textBoxes
      .map((b) => ({
        box: b,
        px: toPixelBox(b, imgW, imgH),
        score: b.score,
      }))
      .filter(({ px }) => px.width * px.height >= imgW * imgH * 0.001)
      .filter(
        ({ px }) => !subjectBBox || boxOverlapFraction(px, subjectBBox) < 0.28,
      )
      .filter(({ box, px }) => {
        if (isLogoLikeGraphicText(box.label, px, imgW, imgH)) {
          logoSkipped += 1;
          return false;
        }
        return true;
      });
    // Light NMS before structure so near-duplicates don't inflate blocks
    const deduped = nmsBoxes(filteredItems, 0.45);
    const structured = structureTextLayers(deduped, imgW, imgH, { maxLayers: 12 });

    const textLayers: LayerOut[] = [];
    const holeRects: Array<{ left: number; top: number; width: number; height: number }> =
      [];
    let textKeyedCount = 0;
    let liveTextCount = 0;

    for (const item of structured) {
      const { px, role } = item;
      const live = assessLiveTextConfidence({
        label: item.label,
        score: item.score,
        role,
        lines: item.lines,
      });

      const cropRaw = await sharp(imgBuf)
        .extract({
          left: px.left,
          top: px.top,
          width: px.width,
          height: px.height,
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const outW = cropRaw.info.width;
      const outH = cropRaw.info.height;
      const rgba = new Uint8ClampedArray(
        cropRaw.data.buffer,
        cropRaw.data.byteOffset,
        cropRaw.data.byteLength,
      );

      let placeLeft = px.left;
      let placeTop = px.top;
      let placeW = px.width;
      let placeH = px.height;
      let cropPng: Buffer;

      // Live text: still store a crop for AI rewrite fallback, but skip aggressive keying
      // (keyed glyphs fight Konva text). Pills / weak OCR keep keying path.
      const canKey = !live.preferLive && plateLooksUniform(rgba, outW, outH);
      if (canKey) {
        const keyed = keyUniformBackground(rgba, outW, outH);
        const boxOpaque = opaqueBBox(keyed.data, outW, outH);
        const opaqueRatio = boxOpaque
          ? (boxOpaque.width * boxOpaque.height) / Math.max(1, outW * outH)
          : 0;
        if (boxOpaque && keyingLooksUseful(keyed.keyedRatio, opaqueRatio)) {
          cropPng = await sharp(Buffer.from(keyed.data), {
            raw: { width: outW, height: outH, channels: 4 },
          })
            .extract({
              left: boxOpaque.left,
              top: boxOpaque.top,
              width: boxOpaque.width,
              height: boxOpaque.height,
            })
            .png()
            .toBuffer();
          placeLeft = px.left + boxOpaque.left;
          placeTop = px.top + boxOpaque.top;
          placeW = boxOpaque.width;
          placeH = boxOpaque.height;
          textKeyedCount += 1;
        } else {
          cropPng = await sharp(imgBuf)
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
        cropPng = await sharp(imgBuf)
          .extract({
            left: px.left,
            top: px.top,
            width: px.width,
            height: px.height,
          })
          .png()
          .toBuffer();
      }

      const cropUrl = await uploadPng(cropPng, `sandwich-text-${textLayers.length}.png`);
      const roleLabel =
        role === "title"
          ? "标题"
          : role === "pill"
            ? "标语"
            : role === "label"
              ? "标签"
              : "文字";
      // Hybrid: NEVER swap in Konva live type — Florence OCR often mangled CJK
      // ("放送元自…"). Keep the pixel crop so words look like the original ad.
      const ocrHint = (live.text || item.label || "").trim();
      textLayers.push({
        id: crypto.randomUUID(),
        kind: "text",
        label: ocrHint ? ocrHint.slice(0, 80) : roleLabel,
        text: "",
        xPct: (placeLeft / imgW) * 100,
        yPct: (placeTop / imgH) * 100,
        wPct: (placeW / imgW) * 100,
        hPct: (placeH / imgH) * 100,
        cropUrl,
        bbox: { left: placeLeft, top: placeTop, width: placeW, height: placeH },
        lifted: true,
        z: 1000 + textLayers.length,
        useLiveText: false,
        role,
      });
      // liveTextCount stays 0 for hybrid pixel path

      const pad = Math.max(6, Math.round(Math.min(px.width, px.height) * 0.08));
      holeRects.push({
        left: Math.max(0, px.left - pad),
        top: Math.max(0, px.top - pad),
        width: Math.min(imgW - Math.max(0, px.left - pad), px.width + pad * 2),
        height: Math.min(imgH - Math.max(0, px.top - pad), px.height + pad * 2),
      });
    }

    // Soft-cover only small text holes for Qwen input — never subject-sized
    // (that painted stadium-green rectangles onto the plate).
    let plateBuf: Buffer = imgBuf;
    for (const r of holeRects) {
      try {
        plateBuf = Buffer.from(await softCoverHole(plateBuf, r, imgW, imgH));
      } catch (coverErr) {
        console.warn("[decompose-sandwich] soft cover text hole failed:", coverErr);
      }
    }

    const plateForQwenUrl = await uploadJpeg(
      await sharp(plateBuf).jpeg({ quality: 92 }).toBuffer(),
      "hybrid-pre-qwen.jpg",
    );

    // 3) Qwen on the remainder → filled background + leftover graphics (SMASH, icons…).
    const qwenCharge = await chargeTokens(auth.user.userId, qwenCost, {
      kind: "smart_layers_qwen",
      mode: "hybrid",
      numLayers,
      endpoint: QWEN_LAYERED_ENDPOINT,
    });
    if ("error" in qwenCharge) {
      console.warn("[decompose-sandwich] visual split skipped (token charge failed)", {
        textLayers: textLayers.length,
        subject: subjectLayers.length,
        textKeyedCount,
        liveTextCount,
        logoSkipped,
      });
      // Partial: keep original plate (not soft-covered) so user can still edit text/hero.
      const partial = [...subjectLayers, ...textLayers];
      return NextResponse.json({
        width: imgW,
        height: imgH,
        layerCount: partial.length,
        backgroundUrl: originalBackgroundUrl,
        originalBackgroundUrl,
        backgroundDataUrl: originalBackgroundUrl,
        layers: partial,
        tokensCharged: detectCost + matteTokensCharged,
        creditBalance,
        warning: "qwen_skipped_tokens",
        debug: {
          mode: "hybrid",
          textDetected: textLayers.length,
          textKeyedCount,
          liveTextCount,
          logoSkipped,
          structuredRoles: structured.map((s) => s.role),
          objectsDetected: 0,
          qwenObjectCount: 0,
          backgroundMode: "hybrid-partial-original",
          qwenSkipped: true,
          qwenSkipReason: "tokens",
          subjectLifted: subjectLayers.length > 0,
        },
      });
    }
    qwenChargedBalance = qwenCharge.balanceAfter ?? creditBalance;
    creditBalance = qwenChargedBalance;

    const qwenRes = await fal.subscribe(QWEN_LAYERED_ENDPOINT, {
      input: {
        image_url: plateForQwenUrl,
        num_layers: numLayers,
        num_inference_steps: 28,
        guidance_scale: 5,
        output_format: "png",
        acceleration: "regular",
        enable_safety_checker: true,
      },
      logs: false,
    });
    const urls = (
      (qwenRes.data as { images?: Array<{ url?: string }> })?.images ?? []
    )
      .map((im) => im.url)
      .filter((u): u is string => Boolean(u));
    if (urls.length < 1) throw new Error("Visual split returned no layers.");

    const prepared: Array<{
      buf: Buffer;
      frameW: number;
      frameH: number;
      bbox: NonNullable<Awaited<ReturnType<typeof alphaContentBBox>>>;
    }> = [];
    for (const u of urls) {
      const r = await fetch(u, { cache: "no-store" });
      if (!r.ok) continue;
      let buf = Buffer.from(await r.arrayBuffer());
      let frameW = (await sharp(buf).metadata()).width ?? 0;
      let frameH = (await sharp(buf).metadata()).height ?? 0;
      if (!frameW || !frameH) continue;
      if (frameW !== imgW || frameH !== imgH) {
        buf = Buffer.from(
          await sharp(buf).resize(imgW, imgH, { fit: "fill" }).png().toBuffer(),
        );
        frameW = imgW;
        frameH = imgH;
      }
      const bbox = await alphaContentBBox(buf);
      if (!bbox) continue;
      prepared.push({ buf, frameW, frameH, bbox });
    }
    if (!prepared.length) throw new Error("Visual layers had no opaque content.");

    const bgIdx = pickBackgroundLayerIndex(
      prepared.map((p) => ({
        coverage: p.bbox.coverage,
        width: p.bbox.width,
        height: p.bbox.height,
        frameW: p.frameW,
        frameH: p.frameH,
      })),
    );
    const bgPrepared = prepared[bgIdx]!;
    // Use Qwen bg as-is — do NOT soft-cover subject holes with grass green.
    // Text-sized soft covers already ran pre-Qwen; large punches create green bars.
    let plateOut = Buffer.from(
      await sharp(bgPrepared.buf)
        .flatten({ background: { r: 24, g: 24, b: 28 } })
        .jpeg({ quality: 92 })
        .toBuffer(),
    );
    for (const r of holeRects) {
      try {
        plateOut = Buffer.from(await softCoverHole(plateOut, r, imgW, imgH));
      } catch (punchErr) {
        console.warn("[decompose-sandwich] post-qwen text punch failed:", punchErr);
      }
    }

    const backgroundUrl = await uploadJpeg(plateOut, "hybrid-background.jpg");

    const objectLayers: LayerOut[] = [];
    for (let i = 0; i < prepared.length; i++) {
      if (i === bgIdx) continue;
      const p = prepared[i]!;
      const { left, top, width, height } = p.bbox;
      if ((width * height) / (imgW * imgH) > 0.92 && p.bbox.coverage > 0.75) continue;
      const qBox = { left, top, width, height };
      // Only drop near-exact duplicates of hero/text — keep splash / logo props.
      if (subjectBBox && boxOverlapFraction(qBox, subjectBBox) > 0.55) continue;
      if (
        textLayers.some(
          (tl) => tl.bbox && boxOverlapFraction(qBox, tl.bbox) > 0.55,
        )
      ) {
        continue;
      }
      const crop = await sharp(p.buf)
        .extract({ left, top, width, height })
        .png()
        .toBuffer();
      if (await isNearlyFlatColorLayer(crop)) {
        console.info("[decompose-sandwich] skip flat Qwen patch", {
          left,
          top,
          width,
          height,
        });
        continue;
      }
      const cropUrl = await uploadPng(crop, `hybrid-obj-${objectLayers.length}.png`);
      objectLayers.push({
        id: crypto.randomUUID(),
        kind: "object",
        label: `图层 ${objectLayers.length + 1}`,
        text: "",
        xPct: (left / imgW) * 100,
        yPct: (top / imgH) * 100,
        wPct: (width / imgW) * 100,
        hPct: (height / imgH) * 100,
        cropUrl,
        bbox: { left, top, width, height },
        lifted: true,
        z: 100 + objectLayers.length,
      });
    }

    // Paint order: Qwen leftovers under, BiRefNet subject, Florence text on top.
    objectLayers.sort(
      (a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height,
    );
    const layers = [...objectLayers, ...subjectLayers, ...textLayers];

    console.info("[decompose-sandwich] hybrid done", {
      text: textLayers.length,
      textKeyedCount,
      liveTextCount,
      logoSkipped,
      subject: subjectLayers.length,
      qwenPrepared: prepared.length,
      qwenObjects: objectLayers.length,
    });

    return NextResponse.json({
      width: imgW,
      height: imgH,
      layerCount: layers.length,
      backgroundUrl,
      originalBackgroundUrl,
      backgroundDataUrl: backgroundUrl,
      layers,
      tokensCharged: detectCost + matteTokensCharged + qwenCost,
      creditBalance,
      warning:
        objectLayers.length === 0
          ? "qwen_no_objects"
          : layers.length === 0
            ? "no_layers"
            : undefined,
      debug: {
        mode: "hybrid",
        textDetected: textLayers.length,
        textKeyedCount,
        liveTextCount,
        logoSkipped,
        structuredRoles: structured.map((s) => s.role),
        objectsDetected: objectLayers.length + subjectLayers.length,
        qwenObjectCount: objectLayers.length,
        subjectLifted: subjectLayers.length > 0,
        backgroundMode: "hybrid-qwen",
        platePunchedHoles: holeRects.length,
        qwenLayerCount: prepared.length,
        numLayersRequested: numLayers,
        endpoint: QWEN_LAYERED_ENDPOINT,
      },
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, detectCost, {
      kind: "smart_layers_detect",
      reason: "hybrid_failed",
    });
    if (qwenChargedBalance != null) {
      await refundTokens(auth.user.userId, qwenCost, {
        kind: "smart_layers_qwen",
        reason: "hybrid_failed",
      });
    }
    if (matteTokensCharged > 0) {
      await refundTokens(auth.user.userId, matteTokensCharged, {
        kind: "smart_layers_matte",
        reason: "hybrid_failed",
      });
    }
    const message = e instanceof Error ? e.message : "Hybrid layer split failed.";
    console.error("[decompose-sandwich-layers]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
