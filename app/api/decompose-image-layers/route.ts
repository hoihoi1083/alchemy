import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import {
  estimateInpaintTokens,
  estimateSmartLayersDetectTokens,
  TOKEN_COST,
} from "@/lib/billing/token-costs";
import {
  iou,
  isWeakOcrLabel,
  mergeAdjacentTextBoxes,
  nmsBoxes,
  parseBoxes,
  toPixelBox,
  type LayerBox,
} from "@/lib/edit-image-2-boxes";
import { isFailedFluxEraseOutput } from "@/lib/edit-image-2-erase-quality";
import { holeContentBarelyChanged } from "@/lib/edit-image-2-heal-quality";
import {
  holeUnionCoverage,
} from "@/lib/edit-image-2-hole-coverage";
import { localRingFill } from "@/lib/edit-image-2-local-heal";
import { alphaContentBBox } from "@/lib/edit-image-2-qwen-layers";
import {
  keyUniformBackground,
  keyingLooksUseful,
  opaqueBBox,
  plateLooksUniform,
} from "@/lib/edit-image-2-text-matte";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 300;

const ERASE_ENDPOINT = "fal-ai/flux-pro/v1/erase";

/** Whole-body subjects — Magic Layers people. */
const WHOLE_PERSON_RE =
  /\b(person|man|woman|people|boy|girl|player|athlete|human)\b|人|球员|运动员/i;
/** Florence scraps that shred bodies into face/shoe layers — drop these. */
const SCRAP_LABEL_RE =
  /\b(face|footwear|shoe|sneaker|hand|arm|leg|foot|head|hair|eye|glasses|ear|finger|limb|neck|torso)\b|脸|鞋|手|脚|头|手臂/i;
const PERSON_LABEL_RE =
  /\b(person|man|woman|human|face|people|boy|girl|player|athlete|uniform|jersey|body|head)\b|人|脸|面|球衣|球员/i;

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

function unionPx(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
) {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

type PxItem = {
  box: LayerBox;
  px: { left: number; top: number; width: number; height: number };
  score: number;
};

/** Merge overlapping person boxes into whole-body layers (face+torso → one person). */
function mergePersonClusters(items: PxItem[]): PxItem[] {
  const persons = items.filter((it) => WHOLE_PERSON_RE.test(it.box.label));
  const scraps = items.filter(
    (it) =>
      SCRAP_LABEL_RE.test(it.box.label) ||
      (PERSON_LABEL_RE.test(it.box.label) && !WHOLE_PERSON_RE.test(it.box.label)),
  );
  const used = new Set<number>();
  const out: PxItem[] = [];
  for (let i = 0; i < persons.length; i++) {
    if (used.has(i)) continue;
    let acc = { ...persons[i]!.px };
    let score = persons[i]!.score;
    let label = persons[i]!.box.label;
    used.add(i);
    let grew = true;
    while (grew) {
      grew = false;
      for (let j = 0; j < persons.length; j++) {
        if (used.has(j)) continue;
        const other = persons[j]!.px;
        const overlap =
          boxOverlapFraction(acc, other) > 0.08 ||
          boxOverlapFraction(other, acc) > 0.08 ||
          iou(acc, other) > 0.1;
        const acx = acc.left + acc.width / 2;
        const ocx = other.left + other.width / 2;
        const sameColumn = Math.abs(acx - ocx) < Math.max(acc.width, other.width) * 0.55;
        if (overlap && sameColumn) {
          acc = unionPx(acc, other);
          score = Math.max(score, persons[j]!.score);
          used.add(j);
          grew = true;
        }
      }
    }
    // Absorb face/shoe scraps that belong to this person so SAM gets a full body box.
    for (const scrap of scraps) {
      if (
        boxOverlapFraction(scrap.px, acc) > 0.35 ||
        boxOverlapFraction(acc, scrap.px) > 0.12 ||
        iou(acc, scrap.px) > 0.08
      ) {
        const acx = acc.left + acc.width / 2;
        const scx = scrap.px.left + scrap.px.width / 2;
        if (Math.abs(acx - scx) < Math.max(acc.width, scrap.px.width) * 0.7) {
          acc = unionPx(acc, scrap.px);
        }
      }
    }
    out.push({
      box: {
        ...persons[i]!.box,
        label: WHOLE_PERSON_RE.test(label) ? label : "person",
        kind: "object",
      },
      px: acc,
      score,
    });
  }
  return out;
}

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
  const userId = auth.user.userId;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: {
    image_url?: string;
    heal?: boolean | string;
    sam?: boolean | string;
    /** OCR text lines only — skip Florence object boxes (they shred people/diagrams). */
    text_only?: boolean | string;
    /** BiRefNet v2 full-image subject — OFF by default (mashes people+text). Opt-in only. */
    subject_matte?: boolean | string;
  };
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

  const truthy = (v: unknown) =>
    v === true || ["1", "true", "yes"].includes(String(v ?? "").trim().toLowerCase());

  // Body flags preferred; URL query kept as fallback for older callers.
  // Default: local heal ON, SAM ON (SAM billed separately via smart_layers_sam).
  const url = new URL(request.url);
  const resolveFlag = (bodyVal: unknown, queryKey: string, defaultOn: boolean) => {
    if (bodyVal !== undefined && bodyVal !== null && String(bodyVal).trim() !== "") {
      return truthy(bodyVal);
    }
    const q = url.searchParams.get(queryKey);
    if (q !== null && q !== "") return truthy(q);
    return defaultOn;
  };
  const wantSam = resolveFlag(body.sam, "sam", false);
  // Magic Layers: heal plate by default so moved elements leave no ghosts.
  const wantHeal = resolveFlag(body.heal, "heal", true);
  // Default off — object OD slices subjects into overlapping scraps on posters.
  const wantTextOnly = resolveFlag(body.text_only, "text_only", false);
  // Default OFF — BiRefNet pulls people+SMASH into one blob (MAS clipped). Use Florence+SAM.
  const wantSubjectMatte = resolveFlag(body.subject_matte, "subject_matte", false);

  const tokenCost = estimateSmartLayersDetectTokens({ sam: wantSam });
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_detect",
    sam: wantSam,
    samBundle: wantSam ? TOKEN_COST.smart_layers_sam : 0,
  });
  if ("error" in charged) return charged.error;

  try {
    // Private library / localhost → fal CDN so Florence + SAM can fetch.
    const imageUrl = await falVisionImageUrl(request, rawImageUrl, {
      clerkId: auth.user.userId,
    });

    const [ocrRes, objRes, imgRes] = await Promise.all([
      fal.subscribe("fal-ai/florence-2-large/ocr-with-region", {
        input: { image_url: imageUrl },
        logs: false,
      }),
      wantTextOnly
        ? Promise.resolve({ data: {} as unknown })
        : fal.subscribe("fal-ai/florence-2-large/object-detection", {
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

    // —— BiRefNet v2: one clean hero subject (not Florence face/jersey scraps) ——
    let subjectBBox: { left: number; top: number; width: number; height: number } | null =
      null;
    let subjectCropUrl: string | null = null;
    let matteTokensCharged = 0;
    let creditBalance = charged.balanceAfter;

    if (wantSubjectMatte) {
      const matteCost = TOKEN_COST.smart_layers_matte;
      const matteCharged = await chargeTokens(auth.user.userId, matteCost, {
        kind: "smart_layers_matte",
        mode: "florence-subject",
      });
      if (!("error" in matteCharged)) {
        try {
          const srcFalUrl = await fal.storage.upload(
            new File(
              [new Uint8Array(await sharp(imgBuf).png().toBuffer())],
              "subject-src.png",
              { type: "image/png" },
            ),
          );
          const matte = await fal.subscribe("fal-ai/birefnet/v2", {
            input: {
              image_url: srcFalUrl,
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
              // Hero subject — not full poster, not a speck.
              if (subBBox && coverage >= 0.04 && coverage <= 0.72) {
                const { left, top, width, height } = subBBox;
                subjectBBox = { left, top, width, height };
                const crop = await sharp(matted)
                  .extract({ left, top, width, height })
                  .png()
                  .toBuffer();
                subjectCropUrl = await uploadPng(crop, "subject-birefnet.png");
                matteTokensCharged = matteCost;
                creditBalance = matteCharged.balanceAfter ?? creditBalance;
              } else {
                await refundTokens(auth.user.userId, matteCost, {
                  kind: "smart_layers_matte",
                  reason: "subject_unused",
                });
              }
            } else {
              await refundTokens(auth.user.userId, matteCost, {
                kind: "smart_layers_matte",
                reason: "subject_download_failed",
              });
            }
          } else {
            await refundTokens(auth.user.userId, matteCost, {
              kind: "smart_layers_matte",
              reason: "subject_empty",
            });
          }
        } catch (subErr) {
          console.warn("[decompose-image-layers] BiRefNet subject skipped:", subErr);
          await refundTokens(auth.user.userId, matteCost, {
            kind: "smart_layers_matte",
            reason: "subject_failed",
          });
        }
      }
    }

    const textBoxes = parseBoxes(ocrRes.data, "text");
    // Object OD often shreds people/diagrams into overlapping scraps — optional.
    const objectBoxes = wantTextOnly
      ? []
      : parseBoxes(objRes.data, "object").filter((b) => {
          const px = toPixelBox(b, imgW, imgH);
          const area = px.width * px.height;
          if (area < imgW * imgH * 0.008) return false;
          if (area >= imgW * imgH * 0.85) return false;
          // Drop whole-poster labels
          if (/^poster$/i.test(b.label.trim())) return false;
          return true;
        });

    const textPx = mergeAdjacentTextBoxes(
      textBoxes
        .map((b) => ({
          box: b,
          px: toPixelBox(b, imgW, imgH),
          score: b.score,
        }))
        .filter(({ px }) => px.width * px.height >= imgW * imgH * 0.0012)
        // Don't lift jersey OCR sitting on the BiRefNet subject
        .filter(
          ({ px }) =>
            !subjectBBox || boxOverlapFraction(px, subjectBBox) < 0.28,
        ),
    );
    // Drop tiny fragments nested inside a larger merged line.
    const textKept = nmsBoxes(textPx, 0.4);

    // —— Objects: whole people only (no face/shoe scraps). Text stays OCR. ——
    const rawObjectItems: PxItem[] = objectBoxes.map((b) => ({
      box: b,
      px: toPixelBox(b, imgW, imgH),
      score: b.score,
    }));

    const personMerged = mergePersonClusters(rawObjectItems);

    // Non-person props (monitor, bottle…) — drop scraps + anything that is mostly text.
    const propItems = rawObjectItems
      .filter(({ box }) => !SCRAP_LABEL_RE.test(box.label))
      .filter(({ box }) => !WHOLE_PERSON_RE.test(box.label))
      .filter(({ box }) => !PERSON_LABEL_RE.test(box.label))
      .filter(({ px }) => {
        for (const t of textKept) {
          if (iou(t.px, px) > 0.35) return false;
          if (boxOverlapFraction(t.px, px) > 0.55) return false;
        }
        return true;
      })
      .filter(({ px }) => {
        if (!subjectBBox) return true;
        return boxOverlapFraction(px, subjectBBox) < 0.45;
      });

    // Drop person clusters that are mostly a text plate (OD boxed SMASH as "poster").
    const peopleClean = personMerged.filter(({ px }) => {
      for (const t of textKept) {
        // Big display type sitting on people — keep both; only drop if OD ≈ text box.
        if (iou(t.px, px) > 0.65) return false;
      }
      return px.width * px.height >= imgW * imgH * 0.02;
    });

    const objectDeduped = nmsBoxes(
      [
        ...peopleClean,
        ...propItems.filter((a, i, arr) => {
          const aArea = a.px.width * a.px.height;
          return !arr.some((b, j) => {
            if (i === j) return false;
            const bArea = b.px.width * b.px.height;
            if (bArea <= aArea * 1.05) return false;
            return iou(a.px, b.px) > 0.55;
          });
        }),
      ],
      0.45,
    );

    // Prefer whole people; cap props so we don't drown the board.
    const MAX_PEOPLE = wantTextOnly ? 0 : 4;
    const MAX_PROPS = wantTextOnly ? 0 : 4;
    const MAX_TEXT = 24;
    const peopleRanked = objectDeduped
      .filter((o) => WHOLE_PERSON_RE.test(o.box.label))
      .sort((a, b) => b.px.width * b.px.height - a.px.width * a.px.height)
      .slice(0, MAX_PEOPLE);
    const propsRanked = objectDeduped
      .filter((o) => !WHOLE_PERSON_RE.test(o.box.label))
      .sort((a, b) => b.px.width * b.px.height - a.px.width * a.px.height)
      .slice(0, MAX_PROPS);
    const objectRanked = [...peopleRanked, ...propsRanked];
    const selected: PxItem[] = [
      ...objectRanked,
      ...textKept.slice(0, MAX_TEXT),
    ];

    // Lift short graphic numerals / logos Florence treated as text (e.g. big "7")
    // as SAM objects when they aren't already covered.
    const graphicText = textKept.filter(({ box, px }) => {
      const label = (box.label || "").trim();
      if (!label || label.length > 4) return false;
      if (!/^[\d０-９7７CRⅠ-Ⅹ]+$/i.test(label.replace(/\s/g, ""))) return false;
      const area = px.width * px.height;
      if (area < imgW * imgH * 0.004) return false;
      if (subjectBBox && boxOverlapFraction(px, subjectBBox) > 0.25) return false;
      return true;
    });
    for (const g of graphicText.slice(0, 3)) {
      if (selected.some((s) => iou(s.px, g.px) > 0.4)) continue;
      selected.push({
        box: { ...g.box, kind: "object", label: g.box.label || "7" },
        px: g.px,
        score: g.score,
      });
      // Remove matching text layer so we don't double-stack.
      const ti = selected.findIndex(
        (s) => s.box.kind === "text" && iou(s.px, g.px) > 0.5,
      );
      if (ti >= 0) selected.splice(ti, 1);
    }

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
            image_url: imageUrl,
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

    /**
     * Per-person BiRefNet on a crop — cleaner whole bodies than SAM scraps
     * (Aug 25 desk person layers, not shredded SMASH athletes).
     */
    async function birefnetPersonCutout(px: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): Promise<{
      crop: Buffer;
      place: { left: number; top: number; width: number; height: number };
    } | null> {
      try {
        const pad = Math.max(8, Math.round(Math.min(px.width, px.height) * 0.06));
        const left = Math.max(0, px.left - pad);
        const top = Math.max(0, px.top - pad);
        const width = Math.min(imgW - left, px.width + pad * 2);
        const height = Math.min(imgH - top, px.height + pad * 2);
        const cropPng = await sharp(imgBuf)
          .extract({ left, top, width, height })
          .png()
          .toBuffer();
        const srcUrl = await fal.storage.upload(
          new File([new Uint8Array(cropPng)], "person-crop.png", { type: "image/png" }),
        );
        const matte = await fal.subscribe("fal-ai/birefnet/v2", {
          input: {
            image_url: srcUrl,
            model: "Matting",
            refine_foreground: true,
            output_format: "png",
          },
          logs: false,
        });
        const outUrl =
          (matte.data as { image?: { url?: string } })?.image?.url ??
          (matte.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
        if (!outUrl) return null;
        const outRes = await fetch(outUrl, { cache: "no-store" });
        if (!outRes.ok) return null;
        let matted = Buffer.from(await outRes.arrayBuffer());
        const mMeta = await sharp(matted).metadata();
        if ((mMeta.width ?? 0) !== width || (mMeta.height ?? 0) !== height) {
          matted = Buffer.from(
            await sharp(matted).resize(width, height, { fit: "fill" }).png().toBuffer(),
          );
        }
        const content = await alphaContentBBox(matted);
        if (!content || content.coverage < 0.02) return null;
        const crop = await sharp(matted)
          .extract({
            left: content.left,
            top: content.top,
            width: content.width,
            height: content.height,
          })
          .png()
          .toBuffer();
        return {
          crop,
          place: {
            left: left + content.left,
            top: top + content.top,
            width: content.width,
            height: content.height,
          },
        };
      } catch (err) {
        console.warn("[decompose-image-layers] BiRefNet person cutout skipped:", err);
        return null;
      }
    }

    const layers: DecomposedLayer[] = [];
    let samRefined = 0;
    let textKeyed = 0;
    let personMatted = 0;
    const holeRects: Array<{ left: number; top: number; width: number; height: number }> = [];

    if (subjectBBox && subjectCropUrl) {
      const { left, top, width, height } = subjectBBox;
      layers.push({
        id: crypto.randomUUID(),
        kind: "object",
        label: "主体",
        text: "",
        xPct: (left / imgW) * 100,
        yPct: (top / imgH) * 100,
        wPct: (width / imgW) * 100,
        hPct: (height / imgH) * 100,
        cropUrl: subjectCropUrl,
        bbox: { left, top, width, height },
        lifted: true,
      });
      const pad = Math.max(8, Math.round(Math.min(width, height) * 0.1));
      holeRects.push({
        left: Math.max(0, left - pad),
        top: Math.max(0, top - pad),
        width: Math.min(imgW - Math.max(0, left - pad), width + pad * 2),
        height: Math.min(imgH - Math.max(0, top - pad), height + pad * 2),
      });
    }

    // SAM for props (keyboard/monitor). People use BiRefNet — SAM shreds athletes.
    const samBudget = new Set(
      objectRanked
        .filter((o) => !WHOLE_PERSON_RE.test(o.box.label))
        .map((o) => `${o.px.left},${o.px.top},${o.px.width},${o.px.height}`),
    );

    /** Key uniform pill / bar plates so yellow/white glyphs lift without the red/green fill. */
    async function keyTextCrop(
      px: { left: number; top: number; width: number; height: number },
    ): Promise<{
      crop: Buffer;
      place: { left: number; top: number; width: number; height: number };
    } | null> {
      try {
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
        if (!plateLooksUniform(rgba, outW, outH)) return null;
        const keyed = keyUniformBackground(rgba, outW, outH);
        const boxOpaque = opaqueBBox(keyed.data, outW, outH);
        const opaqueRatio = boxOpaque
          ? (boxOpaque.width * boxOpaque.height) / Math.max(1, outW * outH)
          : 0;
        if (!boxOpaque || !keyingLooksUseful(keyed.keyedRatio, opaqueRatio)) return null;
        const crop = await sharp(Buffer.from(keyed.data), {
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
        return {
          crop,
          place: {
            left: px.left + boxOpaque.left,
            top: px.top + boxOpaque.top,
            width: boxOpaque.width,
            height: boxOpaque.height,
          },
        };
      } catch {
        return null;
      }
    }

    for (const { box, px } of selected) {
      let crop: Buffer;
      let place = { ...px };
      const boxKey = `${px.left},${px.top},${px.width},${px.height}`;
      const isPerson = box.kind === "object" && WHOLE_PERSON_RE.test(box.label);

      if (isPerson && personMatted < 3) {
        const matted = await birefnetPersonCutout(px);
        if (matted) {
          crop = matted.crop;
          place = matted.place;
          personMatted += 1;
          // Bill matte when used (skip if charge fails — still return cutout).
          const matteCost = TOKEN_COST.smart_layers_matte;
          const matteCharged = await chargeTokens(auth.user.userId, matteCost, {
            kind: "smart_layers_matte",
            mode: "person-crop",
          });
          if (!("error" in matteCharged)) {
            matteTokensCharged += matteCost;
            creditBalance = matteCharged.balanceAfter ?? creditBalance;
          }
        } else {
          const cut = wantSam ? await samCutout(px) : null;
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
        }
      } else if (box.kind === "object" && wantSam && samBudget.has(boxKey)) {
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
      } else if (box.kind === "text") {
        const keyed = await keyTextCrop(px);
        if (keyed) {
          crop = keyed.crop;
          place = keyed.place;
          textKeyed += 1;
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

      const pad = Math.max(8, Math.round(Math.min(place.width, place.height) * 0.1));
      holeRects.push({
        left: Math.max(0, place.left - pad),
        top: Math.max(0, place.top - pad),
        width: Math.min(imgW - Math.max(0, place.left - pad), place.width + pad * 2),
        height: Math.min(imgH - Math.max(0, place.top - pad), place.height + pad * 2),
      });

      const cropUrl = await uploadPng(crop, `layer-${layers.length}.png`);
      const rawLabel = box.label.slice(0, 80);
      const weakText = box.kind === "text" && isWeakOcrLabel(rawLabel);
      const label =
        box.kind === "text"
          ? weakText
            ? "文字"
            : rawLabel || "文字"
          : rawLabel || "Object";
      layers.push({
        id: crypto.randomUUID(),
        kind: box.kind,
        label,
        // Weak OCR → empty editable string; user types while crop stays visible until live.
        text: box.kind === "text" ? (weakText ? "" : rawLabel) : "",
        xPct: (place.left / imgW) * 100,
        yPct: (place.top / imgH) * 100,
        wPct: (place.width / imgW) * 100,
        hPct: (place.height / imgH) * 100,
        cropUrl,
        bbox: {
          left: place.left,
          top: place.top,
          width: place.width,
          height: place.height,
        },
        lifted: false,
      });
    }

    const originalJpeg = await sharp(imgBuf).jpeg({ quality: 92 }).toBuffer();
    const originalBackgroundUrl = await uploadJpeg(originalJpeg, "background-original.jpg");
    let backgroundUrl = originalBackgroundUrl;
    let backgroundMode: "original" | "local-heal" | "erase" = "original";
    let healTokensCharged = 0;
    let sequentialErased = 0;

    /**
     * Aug 25 (commit 131861c): heal holes layer-by-layer with localRingFill first.
     * Only if local fails → ONE Flux Erase with a union mask on the ORIGINAL image
     * (same W×H as mask). Sequential Flux erase broke with "mask sizes do not match"
     * because fal returns a different resolution after the first call.
     */
    if (wantHeal && holeRects.length > 0) {
      const healCost = TOKEN_COST.smart_layers_heal;
      const healCharged = await chargeTokens(userId, healCost, {
        kind: "smart_layers_heal",
        mode: "local",
        holes: holeRects.length,
        coverage: holeUnionCoverage(holeRects, imgW, imgH),
      });
      const canBillLocal = !("error" in healCharged);

      try {
        let healed: Buffer = imgBuf;
        for (const r of holeRects) {
          healed = Buffer.from(await localRingFill(healed, r, imgW, imgH));
        }
        backgroundUrl = await uploadJpeg(
          await sharp(healed).jpeg({ quality: 92 }).toBuffer(),
          "background-healed.jpg",
        );
        backgroundMode = "local-heal";
        sequentialErased = holeRects.length;
        if (canBillLocal) {
          healTokensCharged = healCost;
          creditBalance = healCharged.balanceAfter ?? creditBalance;
        }
      } catch (localErr) {
        console.warn(
          "[decompose-image-layers] local heal failed, trying one Flux erase:",
          localErr,
        );
        if (canBillLocal) {
          await refundTokens(userId, healCost, {
            kind: "smart_layers_heal",
            reason: "local_heal_failed_try_erase",
          });
        }
        const megapixels = (imgW * imgH) / 1_000_000;
        const eraseCost = estimateInpaintTokens(megapixels);
        const eraseCharged = await chargeTokens(userId, eraseCost, {
          kind: "smart_layers_heal",
          mode: "erase",
          holes: holeRects.length,
        });
        try {
          if ("error" in eraseCharged) throw new Error("erase charge failed");
          const maskSvg = [
            `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`,
            `<rect width="100%" height="100%" fill="#000"/>`,
            ...holeRects.map(
              (r) =>
                `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" fill="#fff"/>`,
            ),
            `</svg>`,
          ].join("");
          // Force identical pixel size — fal rejects mismatched image/mask.
          const sourcePng = await sharp(imgBuf)
            .resize(imgW, imgH, { fit: "fill" })
            .png()
            .toBuffer();
          const maskPng = await sharp(Buffer.from(maskSvg))
            .resize(imgW, imgH, { fit: "fill" })
            .png()
            .toBuffer();
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
          const erasedUrl = (erase.data as { images?: Array<{ url?: string }> })
            ?.images?.[0]?.url;
          if (!erasedUrl) throw new Error("Erase returned no image");
          const erasedRes = await fetch(erasedUrl, { cache: "no-store" });
          if (!erasedRes.ok) throw new Error(`Erase download ${erasedRes.status}`);
          let erasedBuf = Buffer.from(await erasedRes.arrayBuffer());
          if (await isFailedFluxEraseOutput(erasedBuf)) {
            throw new Error("Erase returned chroma-green failure plate");
          }
          // Normalize back to source size for the board.
          erasedBuf = Buffer.from(
            await sharp(erasedBuf)
              .resize(imgW, imgH, { fit: "fill" })
              .jpeg({ quality: 92 })
              .toBuffer(),
          );
          backgroundUrl = await uploadJpeg(erasedBuf, "background-erase.jpg");
          backgroundMode = "erase";
          sequentialErased = holeRects.length;
          healTokensCharged = eraseCost;
          creditBalance = eraseCharged.balanceAfter ?? creditBalance;
        } catch (eraseErr) {
          console.warn(
            "[decompose-image-layers] heal failed, keeping original:",
            eraseErr,
          );
          if (!("error" in eraseCharged)) {
            await refundTokens(userId, eraseCost, {
              kind: "smart_layers_heal",
              reason: "erase_heal_failed",
            });
          }
          backgroundUrl = originalBackgroundUrl;
          backgroundMode = "original";
          sequentialErased = 0;
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
      originalBackgroundUrl,
      /** @deprecated Prefer backgroundUrl */
      backgroundDataUrl: backgroundUrl,
      layers,
      warning:
        layers.length === 0
          ? "No text or objects detected. Try Brush or Box to lift regions manually."
          : undefined,
      tokensCharged: tokenCost + healTokensCharged + matteTokensCharged,
      creditBalance,
      debug: {
        textDetected: textBoxes.length,
        objectsDetected: objectBoxes.length,
        samRefined,
        textKeyed,
        personMatted,
        subjectLifted: Boolean(subjectCropUrl),
        matteTokensCharged,
        backgroundMode,
        wantSam,
        wantHeal,
        wantTextOnly,
        wantSubjectMatte,
        healTokensCharged,
        sequentialErased,
        holeCoverage:
          holeRects.length > 0 ? holeUnionCoverage(holeRects, imgW, imgH) : 0,
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
