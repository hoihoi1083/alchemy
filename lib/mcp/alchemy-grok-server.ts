import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { PRODUCT_NAME, PRODUCT_SITE_URL } from "@/lib/brand";
import { videoTokenCostFromRequest } from "@/lib/billing/charge";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { estimateCampaignTokens, TOKEN_COST } from "@/lib/billing/token-costs";
import {
  clerkIdFromMcpAuth,
  mcpAuthRequiredText,
  verifyAlchemyMcpBearer,
} from "@/lib/mcp/auth";
import { generateCampaignForMcp } from "@/lib/mcp/generate-campaign";
import { generateStoryboardForMcp } from "@/lib/mcp/generate-storyboard";
import { editStillForMcp, generateStillForMcp } from "@/lib/mcp/generate-still";
import { generateVideoForMcp } from "@/lib/mcp/generate-video";
import { listLibraryForMcp } from "@/lib/mcp/library";
import { brandKitForMcp, stampLogoForMcp } from "@/lib/mcp/logo";
import {
  mcpIssuerUrl,
  mcpProtectedResourceMetadataPath,
} from "@/lib/mcp/oauth/config";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

const MCP_VIDEO_5S_FAST = videoTokenCostFromRequest({
  resolution: "720p",
  fast: true,
  duration: 5,
});

function textResult(payload: unknown, isError = false) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
    ...(isError ? { isError: true as const } : {}),
  };
}

function jobFail(result: {
  error: string;
  code?: string;
  status?: number;
  balance?: number;
  required?: number;
  pricingUrl?: string;
  hint?: string;
}) {
  const pricingUrl =
    result.pricingUrl ?? `${PRODUCT_SITE_URL.replace(/\/$/, "")}/pricing`;
  const isInsufficientTokens =
    result.status === 402 || result.code === "INSUFFICIENT_TOKENS";
  const isPlanGated =
    result.status === 403 ||
    result.code === "storyboard_needs_pro" ||
    result.code === "PLAN_ENTITLEMENT";

  let hint = result.hint;
  if (!hint) {
    if (isInsufficientTokens) {
      hint = `Top up tokens or upgrade your subscription at ${pricingUrl}`;
    } else if (result.code === "storyboard_needs_pro") {
      hint = `Storyboard requires a Pro plan or higher. Upgrade at ${pricingUrl}`;
    } else if (result.code === "PLAN_ENTITLEMENT") {
      hint = `Campaign generation requires a Standard plan or higher. Upgrade at ${pricingUrl}`;
    } else if (isPlanGated) {
      hint = `This feature requires a plan upgrade. Visit ${pricingUrl}`;
    }
  }

  return textResult(
    {
      ok: false,
      error: result.error,
      code: result.code ?? null,
      status: result.status ?? null,
      ...(typeof result.balance === "number" ? { balance: result.balance } : {}),
      ...(typeof result.required === "number" ? { required: result.required } : {}),
      ...(isInsufficientTokens || isPlanGated
        ? {
            pricing_url: pricingUrl,
            hint,
          }
        : hint
        ? { hint }
        : {}),
    },
    true,
  );
}

const libraryAssetIdField = z
  .string()
  .optional()
  .describe(
    "Alchemy library asset id from alchemy_list_library. Prefer this over Clerk download URLs — we mint a signed https URL fal can fetch.",
  );

const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "alchemy_ping",
      {
        title: "Alchemy ping",
        description:
          "Health check for the Alchemy MCP server. Works without an API key.",
        inputSchema: z.object({}),
      },
      async () =>
        textResult({
          ok: true,
          product: PRODUCT_NAME,
          site: PRODUCT_SITE_URL,
          mcp: "alchemy-grok",
          phase: 4,
          auth: "OAuth (Sign in with Alchemy) or Bearer alk_… required",
        }),
    );

    server.registerTool(
      "alchemy_server_info",
      {
        title: "Alchemy server info",
        description:
          "Describe Alchemy MCP tools, auth, and token pricing for image generation.",
        inputSchema: z.object({}),
      },
      async () =>
        textResult({
          name: "alchemy-grok",
          product: PRODUCT_NAME,
          site: PRODUCT_SITE_URL,
          endpoint: `${PRODUCT_SITE_URL.replace(/\/$/, "")}/api/grok-mcp`,
          availableTools: [
            "alchemy_ping",
            "alchemy_server_info",
            "alchemy_whoami",
            "alchemy_generate_image",
            "alchemy_edit_image",
            "alchemy_generate_video",
            "alchemy_generate_storyboard",
            "alchemy_list_library",
            "alchemy_brand_kit",
            "alchemy_stamp_logo",
            "alchemy_generate_campaign",
          ],
          auth: {
            type: "oauth2",
            oauth: "MCP OAuth 2.1 — Custom MCP URL opens Sign in with Alchemy",
            apiKeyFallback: "Bearer alk_… from Account (CLI / Cursor)",
            createAt: `${PRODUCT_SITE_URL.replace(/\/$/, "")}/account`,
          },
          pricing: {
            alchemy_generate_image_tokens: TOKEN_COST.image,
            alchemy_edit_image_tokens: TOKEN_COST.image,
            alchemy_generate_video_5s_720p_fast_tokens: MCP_VIDEO_5S_FAST,
            alchemy_generate_storyboard_tokens_per_scene: TOKEN_COST.image,
            alchemy_generate_campaign_tokens: estimateCampaignTokens("1K"),
            alchemy_stamp_logo_tokens: 0,
            alchemy_list_library_tokens: 0,
            pricing_url: `${PRODUCT_SITE_URL.replace(/\/$/, "")}/pricing`,
            note: "Stills = Nano Banana 2 1K. Video = Seedance Fast 720p (4–8s). Storyboard = 2–4 stills (Pro+). Campaign = 3 slides (Standard+). Library URLs are signed (1h).",
          },
          grokHints: {
            media:
              "For user photos: public https URL or alchemy_list_library → library_asset_id (we mint a signed URL). Never pass Clerk-gated /api/library/download links or localhost paths.",
            preferAlchemy:
              "When the user asks for Alchemy, use these tools — not the built-in Grok image generator.",
            billing:
              "If user token balance is insufficient or a feature requires a higher tier (Storyboard needs Pro+, Campaign needs Standard+), explain what is required and share the pricing link: https://www.alchemyailab.com/pricing.",
          },
          clients: {
            grok:
              "Grok Bot → Add custom MCP → paste MCP URL only → Sign in with Alchemy in the browser",
            cursor:
              "MCP settings → URL http(s)://…/api/grok-mcp (OAuth) or Authorization: Bearer alk_…",
            chatgpt:
              "ChatGPT Developer Mode / custom GPT Actions can call the same tools; prefer MCP when available, else OpenAPI Actions against Studio APIs.",
          },
        }),
    );

    server.registerTool(
      "alchemy_whoami",
      {
        title: "Alchemy whoami",
        description:
          "Return the Alchemy account bound to the Bearer API key (plan + token balance).",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);

        const plan = await getUserPlan(clerkId);
        let creditBalance: number | null = null;
        let email: string | null = null;
        let name: string | null = null;
        if (isMongoConfigured()) {
          const db = await getDb();
          const user = await db.collection("users").findOne(
            { clerkId },
            { projection: { creditBalance: 1, email: 1, name: 1 } },
          );
          if (user) {
            creditBalance =
              typeof user.creditBalance === "number" ? user.creditBalance : null;
            email = typeof user.email === "string" ? user.email : null;
            name = typeof user.name === "string" ? user.name : null;
          }
        }

        return textResult({
          ok: true,
          clerkId,
          plan,
          creditBalance,
          email,
          name,
          imageTokenCost: TOKEN_COST.image,
          pricingUrl: `${PRODUCT_SITE_URL.replace(/\/$/, "")}/pricing`,
        });
      },
    );

    server.registerTool(
      "alchemy_generate_image",
      {
        title: "Alchemy generate image",
        description:
          `Text-to-image only (no reference photo). Nano Banana 2, ~${TOKEN_COST.image} tokens. For an attached/reference photo use alchemy_edit_image. Requires Bearer alk_…`,
        inputSchema: z.object({
          prompt: z
            .string()
            .min(1)
            .max(4000)
            .describe("What to generate — product, scene, style, text on image."),
          aspect_ratio: z
            .string()
            .optional()
            .describe("e.g. 9:16, 1:1, 16:9. Defaults to 9:16."),
        }),
      },
      async ({ prompt, aspect_ratio }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);

        const result = await generateStillForMcp({
          clerkId,
          prompt,
          aspectRatio: aspect_ratio,
        });
        if (!result.ok) return jobFail(result);
        return textResult({
          ok: true,
          image_url: result.imageUrl,
          image_urls: result.imageUrls,
          tokens_charged: result.tokensCharged,
          balance_after: result.balanceAfter,
          aspect_ratio: result.aspectRatio,
          resolution: result.resolution,
          endpoint: result.endpoint,
        });
      },
    );

    server.registerTool(
      "alchemy_edit_image",
      {
        title: "Alchemy edit image",
        description:
          `Edit a reference photo with Nano Banana 2 (keep identity, change scene/style). Pass image_url (public https) or library_asset_id (~${TOKEN_COST.image} tokens).`,
        inputSchema: z.object({
          prompt: z
            .string()
            .min(1)
            .max(4000)
            .describe("How to change the photo — keep the subject, describe the new look."),
          image_url: z
            .string()
            .max(2000)
            .optional()
            .describe("Public https URL of the reference image (not a local file path)."),
          library_asset_id: libraryAssetIdField,
          aspect_ratio: z.string().optional().describe("e.g. 9:16, 1:1, 16:9. Defaults to 9:16."),
        }),
      },
      async ({ prompt, image_url, library_asset_id, aspect_ratio }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await editStillForMcp({
          clerkId,
          prompt,
          imageUrl: image_url,
          libraryAssetId: library_asset_id,
          aspectRatio: aspect_ratio,
        });
        if (!result.ok) return jobFail(result);
        return textResult({
          ok: true,
          image_url: result.imageUrl,
          image_urls: result.imageUrls,
          tokens_charged: result.tokensCharged,
          balance_after: result.balanceAfter,
          aspect_ratio: result.aspectRatio,
          resolution: result.resolution,
          endpoint: result.endpoint,
        });
      },
    );

    server.registerTool(
      "alchemy_generate_video",
      {
        title: "Alchemy generate video",
        description:
          `Seedance Fast 720p clip (4–8 seconds, default 5s, ~${MCP_VIDEO_5S_FAST} tokens for 5s). Optional image_url or library_asset_id as the first frame. Audio off. Requires Bearer alk_….`,
        inputSchema: z.object({
          prompt: z
            .string()
            .min(1)
            .max(4000)
            .describe("Motion and scene — camera, action, no on-screen gibberish text."),
          image_url: z
            .string()
            .optional()
            .describe("Optional public https start-frame image (image-to-video)."),
          library_asset_id: libraryAssetIdField,
          duration_sec: z
            .number()
            .int()
            .min(4)
            .max(8)
            .optional()
            .describe("Clip length 4–8 seconds. Defaults to 5."),
          aspect_ratio: z.string().optional().describe("e.g. 9:16, 16:9. Defaults to 9:16."),
        }),
      },
      async ({ prompt, image_url, library_asset_id, duration_sec, aspect_ratio }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await generateVideoForMcp({
          clerkId,
          prompt,
          imageUrl: image_url,
          libraryAssetId: library_asset_id,
          durationSec: duration_sec,
          aspectRatio: aspect_ratio,
        });
        if (!result.ok) return jobFail(result);
        return textResult({
          ok: true,
          video_url: result.videoUrl,
          tokens_charged: result.tokensCharged,
          balance_after: result.balanceAfter,
          duration_sec: result.durationSec,
          aspect_ratio: result.aspectRatio,
          resolution: result.resolution,
          mode: result.mode,
          endpoint: result.endpoint,
        });
      },
    );

    server.registerTool(
      "alchemy_generate_storyboard",
      {
        title: "Alchemy generate storyboard",
        description:
          `2–4 marketing stills (hook / product / proof / cta), ~${TOKEN_COST.image} tokens each. Optional image_url or library_asset_id. Requires Pro plan (same as Studio). This returns stills, not a finished stitched video — then use alchemy_generate_video on a chosen still.`,
        inputSchema: z.object({
          brief: z
            .string()
            .min(1)
            .max(4000)
            .describe("Product, offer, and story — used to write each scene still."),
          image_url: z
            .string()
            .optional()
            .describe("Optional public https product/style reference for all scenes."),
          library_asset_id: libraryAssetIdField,
          scene_count: z
            .number()
            .int()
            .min(2)
            .max(4)
            .optional()
            .describe("Number of stills. Defaults to 3."),
          aspect_ratio: z.string().optional().describe("Defaults to 9:16."),
        }),
      },
      async ({ brief, image_url, library_asset_id, scene_count, aspect_ratio }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await generateStoryboardForMcp({
          clerkId,
          brief,
          imageUrl: image_url,
          libraryAssetId: library_asset_id,
          sceneCount: scene_count,
          aspectRatio: aspect_ratio,
        });
        if (!result.ok) return jobFail(result);
        return textResult({
          ok: true,
          scenes: result.scenes,
          tokens_charged: result.tokensCharged,
          balance_after: result.balanceAfter,
          aspect_ratio: result.aspectRatio,
          resolution: result.resolution,
        });
      },
    );

    server.registerTool(
      "alchemy_list_library",
      {
        title: "Alchemy list library",
        description:
          "List this account's recent library assets and mint signed https GET URLs (1 hour). Use library_asset_id on generate/edit/stamp/campaign so fal can fetch private R2 files. Free.",
        inputSchema: z.object({
          kind: z
            .enum(["image", "video"])
            .optional()
            .describe("Filter by asset kind. Defaults to all."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(40)
            .optional()
            .describe("Max items. Defaults to 20."),
        }),
      },
      async ({ kind, limit }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await listLibraryForMcp({ clerkId, kind, limit });
        if (!result.ok) return jobFail(result);
        return textResult({ ok: true, assets: result.assets });
      },
    );

    server.registerTool(
      "alchemy_brand_kit",
      {
        title: "Alchemy brand kit",
        description:
          "Read this account's brand kit (logo present?, colors, tagline). Does not return the raw logo file. Free. Then use alchemy_stamp_logo to overlay.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await brandKitForMcp(clerkId);
        if (!result.ok) return jobFail(result);
        return textResult(result);
      },
    );

    server.registerTool(
      "alchemy_stamp_logo",
      {
        title: "Alchemy stamp logo",
        description:
          "Composite the Brand kit logo onto a still (corner or center). Always stamps if a logo exists (does not require the Studio useBrandLogo toggle). Pass image_url or library_asset_id. Returns a signed https URL. Free (no tokens).",
        inputSchema: z.object({
          image_url: z
            .string()
            .max(2000)
            .optional()
            .describe("Public https still to stamp."),
          library_asset_id: libraryAssetIdField,
          placement: z
            .enum(["bottom-right", "bottom-left", "top-right", "top-left", "center"])
            .optional()
            .describe("Logo placement. Defaults to top-right."),
        }),
      },
      async ({ image_url, library_asset_id, placement }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await stampLogoForMcp({
          clerkId,
          imageUrl: image_url,
          libraryAssetId: library_asset_id,
          placement,
        });
        if (!result.ok) return jobFail(result);
        return textResult({
          ok: true,
          image_url: result.imageUrl,
          logo_stamped: result.logoStamped,
          placement: result.placement,
          tokens_charged: 0,
        });
      },
    );

    server.registerTool(
      "alchemy_generate_campaign",
      {
        title: "Alchemy generate campaign",
        description:
          `Three vertical stills (hero / selling-points / offer), ~${estimateCampaignTokens("1K")} tokens. Requires Standard plan or higher. Optional product photo via image_url or library_asset_id. AI logo blend is not included — call alchemy_stamp_logo on a slide if needed.`,
        inputSchema: z.object({
          product: z.string().min(1).max(500).describe("Product or brand name."),
          offer: z.string().max(500).optional().describe("Deal / CTA copy, e.g. 20% off."),
          headline: z.string().max(200).optional().describe("Hero headline. Defaults to product."),
          image_url: z
            .string()
            .max(2000)
            .optional()
            .describe("Optional public https product photo for identity."),
          library_asset_id: libraryAssetIdField,
          aspect_ratio: z.string().optional().describe("Defaults to 9:16."),
        }),
      },
      async ({ product, offer, headline, image_url, library_asset_id, aspect_ratio }, ctx) => {
        const clerkId = clerkIdFromMcpAuth(ctx.http?.authInfo);
        if (!clerkId) return textResult(mcpAuthRequiredText(), true);
        const result = await generateCampaignForMcp({
          clerkId,
          product,
          offer,
          headline,
          imageUrl: image_url,
          libraryAssetId: library_asset_id,
          aspectRatio: aspect_ratio,
        });
        if (!result.ok) return jobFail(result);
        return textResult({
          ok: true,
          slides: result.slides,
          tokens_charged: result.tokensCharged,
          balance_after: result.balanceAfter,
          aspect_ratio: result.aspectRatio,
        });
      },
    );
  },
  {
    serverInfo: {
      name: "alchemy-grok",
      version: "0.4.0",
    },
  },
);

/**
 * Public MCP handler. Unauthenticated requests get 401 + WWW-Authenticate
 * (RFC 9728) so Grok/Cursor can open Sign in with Alchemy. Authenticated via
 * OAuth access token (ato_…) or personal API key (alk_…).
 */
export const alchemyGrokMcpHandler = withMcpAuth(
  baseHandler,
  verifyAlchemyMcpBearer,
  {
    required: true,
    resourceMetadataPath: mcpProtectedResourceMetadataPath(),
    resourceUrl: mcpIssuerUrl(),
    requiredScopes: ["alchemy:generate"],
  },
);
