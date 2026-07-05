import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import {
  analyzeConceptReferenceImage,
  conceptImageVisionBlock,
} from "@/lib/concept-image-vision";
import { planConceptWizard } from "@/lib/concept-wizard-plan";
import type { PromptMarket } from "@/lib/prompts";
import {
  briefFromConceptVision,
  briefFromUserTextOnly,
  briefToVisionNote,
  mergeUserReferenceBrief,
} from "@/lib/user-reference-brief";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConceptRequest = {
  conceptIdea?: string;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  visualStyleId?: string;
  workflowMode?: "image-only" | "video-only" | "combined";
  market?: PromptMarket;
};

function parseConceptBody(fd: FormData): ConceptRequest {
  return {
    conceptIdea: String(fd.get("conceptIdea") ?? "").trim() || undefined,
    product: String(fd.get("product") ?? "").trim() || undefined,
    business: String(fd.get("business") ?? "").trim() || undefined,
    headline: String(fd.get("headline") ?? "").trim() || undefined,
    subline: String(fd.get("subline") ?? "").trim() || undefined,
    offer: String(fd.get("offer") ?? "").trim() || undefined,
    promptExtra: String(fd.get("promptExtra") ?? "").trim() || undefined,
    visualStyleId: String(fd.get("visualStyleId") ?? "").trim() || undefined,
    workflowMode:
      fd.get("workflowMode") === "video-only" ||
      fd.get("workflowMode") === "combined" ||
      fd.get("workflowMode") === "image-only"
        ? (fd.get("workflowMode") as ConceptRequest["workflowMode"])
        : undefined,
    market:
      fd.get("market") === "hk" || fd.get("market") === "cn" || fd.get("market") === "en"
        ? (fd.get("market") as PromptMarket)
        : undefined,
  };
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") || "";
  let body: ConceptRequest;
  let referenceImageVision: string | undefined;
  let userReferenceBrief: ReturnType<typeof briefFromUserTextOnly> = null;
  let hasReferenceImage = false;

  try {
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      body = parseConceptBody(fd);
      userReferenceBrief = briefFromUserTextOnly({
        conceptIdea: body.conceptIdea,
        headline: body.headline,
        subline: body.subline,
        promptExtra: body.promptExtra,
      });
      const ref = fd.get("reference_image") as File | null;
      if (ref && ref.size > 0) {
        hasReferenceImage = true;
        const imageUrl = await fal.storage.upload(ref);
        const vision = await analyzeConceptReferenceImage({
          imageUrl,
          conceptIdea: body.conceptIdea,
        });
        referenceImageVision = conceptImageVisionBlock(vision);
        userReferenceBrief = mergeUserReferenceBrief(
          briefFromConceptVision(vision, {
            conceptIdea: body.conceptIdea,
            headline: body.headline,
            subline: body.subline,
          }),
          userReferenceBrief,
        );
      }
    } else {
      body = await request.json();
      userReferenceBrief = briefFromUserTextOnly({
        conceptIdea: body.conceptIdea,
        headline: body.headline,
        subline: body.subline,
        promptExtra: body.promptExtra,
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const draft = await planConceptWizard({
      ...body,
      hasReferenceImage: hasReferenceImage || Boolean(userReferenceBrief),
      referenceImageVision,
      userReferenceBrief: userReferenceBrief ?? undefined,
    });
    const imageVisionNote = userReferenceBrief
      ? briefToVisionNote(userReferenceBrief)
      : referenceImageVision;
    return NextResponse.json({
      draft,
      referenceBrief: userReferenceBrief,
      imageVisionNote,
      hasReferenceImage: hasReferenceImage || Boolean(userReferenceBrief),
      sourceNote: hasReferenceImage
        ? "Concept brief from your upload + text (vision + DeepSeek)"
        : userReferenceBrief
          ? "Concept brief from your text (DeepSeek)"
          : "Concept wizard brief (DeepSeek)",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Concept planning failed.";
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
