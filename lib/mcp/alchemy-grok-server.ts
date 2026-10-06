import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { PRODUCT_NAME, PRODUCT_SITE_URL } from "@/lib/brand";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  clerkIdFromMcpAuth,
  mcpAuthRequiredText,
  verifyAlchemyMcpBearer,
} from "@/lib/mcp/auth";
import { generateStillForMcp } from "@/lib/mcp/generate-still";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

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
          phase: 2,
          auth: "Bearer alk_… API key required for whoami + generate",
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
          ],
          auth: {
            type: "Bearer",
            keyPrefix: "alk_",
            createAt: `${PRODUCT_SITE_URL.replace(/\/$/, "")}/account`,
          },
          pricing: {
            alchemy_generate_image_tokens: TOKEN_COST.image,
            note: "Same Nano Banana 2 1K still price as Studio.",
          },
          clients: {
            grok: "Grok Bot → Add custom MCP → URL + Authorization Bearer alk_…",
            cursor: "MCP settings → URL http(s)://…/api/grok-mcp + header Authorization",
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
        });
      },
    );

    server.registerTool(
      "alchemy_generate_image",
      {
        title: "Alchemy generate image",
        description:
          `Generate one marketing still with Nano Banana 2 (charges ~${TOKEN_COST.image} Alchemy tokens). Requires Bearer alk_… API key.`,
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
        if (!result.ok) {
          return textResult(
            {
              ok: false,
              error: result.error,
              code: result.code ?? null,
              status: result.status ?? null,
            },
            true,
          );
        }
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
  },
  {
    serverInfo: {
      name: "alchemy-grok",
      version: "0.2.0",
    },
  },
);

/**
 * Public MCP handler: ping/info work anonymously; whoami + generate need Bearer alk_….
 */
export const alchemyGrokMcpHandler = withMcpAuth(
  baseHandler,
  verifyAlchemyMcpBearer,
  { required: false },
);
