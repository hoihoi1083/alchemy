import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { requireAppUser } from "@/lib/require-app-user";
import {
  buildWizardImageExpectation,
  wizardImageMustAvoid,
  type ImageVisionReview,
} from "@/lib/image-vision-gate";
import { reviewPipelineOutput } from "@/lib/pipeline-smoke-review";
import { isImageTextMode } from "@/lib/image-text-mode";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { review: { skipped: true } as ImageVisionReview },
      { status: 200 },
    );
  }

  fal.config({ credentials: key });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = String(body.image_url ?? "").trim();
  if (!imageUrl.startsWith("http")) {
    return NextResponse.json({ error: "image_url is required." }, { status: 400 });
  }

  const product = String(body.product ?? "").trim() || "product";
  const headline = String(body.headline ?? "").trim();
  const textModeRaw = String(body.image_text_mode ?? "integrated").trim();
  const imageTextMode = isImageTextMode(textModeRaw) ? textModeRaw : "integrated";

  try {
    const review = await reviewPipelineOutput({
      imageUrl,
      mediaKind: "image",
      label: "wizard-generated-image",
      product,
      expectation: buildWizardImageExpectation({ product, headline, imageTextMode }),
      mustAvoid: wizardImageMustAvoid(imageTextMode),
    });
    return NextResponse.json({ review });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Vision review failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
