import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * CSP allowlist for Clerk, Stripe, Mixpanel, Sentry, fal CDN, and R2 media.
 * 'unsafe-inline' / 'unsafe-eval' are required by Next.js + Clerk without nonces.
 */
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.alchemyailab.com",
    "https://challenges.cloudflare.com",
    "https://js.stripe.com",
    "https://cdn.mxpnl.com",
    "https://*.mixpanel.com",
    "https://browser.sentry-cdn.com",
    "https://*.sentry-cdn.com",
  ].join(" "),
  [
    "style-src 'self' 'unsafe-inline'",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
  ].join(" "),
  ["img-src 'self' data: blob: https:"].join(" "),
  [
    "font-src 'self' data:",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
  ].join(" "),
  [
    "connect-src 'self'",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.alchemyailab.com",
    "wss://*.clerk.com",
    "wss://*.clerk.accounts.dev",
    "https://api.stripe.com",
    "https://*.stripe.com",
    "https://api.mixpanel.com",
    "https://api-js.mixpanel.com",
    "https://*.mixpanel.com",
    "https://cdn.mxpnl.com",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.sentry.io",
    "https://fal.media",
    "https://*.fal.media",
    "https://*.fal.ai",
    "https://*.r2.cloudflarestorage.com",
    "https://*.r2.dev",
    "blob:",
    ...(isDev
      ? ["ws://localhost:3000", "http://localhost:3000", "ws://127.0.0.1:3000", "http://127.0.0.1:3000"]
      : []),
  ].join(" "),
  [
    "frame-src 'self'",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.alchemyailab.com",
    "https://challenges.cloudflare.com",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
  ].join(" "),
  [
    "media-src 'self' blob: data:",
    "https://fal.media",
    "https://*.fal.media",
    "https://*.r2.cloudflarestorage.com",
    "https://*.r2.dev",
  ].join(" "),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.alchemyailab.com https://checkout.stripe.com https://*.stripe.com",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // Force HTTPS for two years, including subdomains (safe on Vercel).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent the app from being framed (clickjacking protection).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny access to powerful browser features by default.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** Only linux bins + only routes that spawn ffmpeg (avoids 250MB+ deploy blowups). */
const FFMPEG_TRACE = [
  "./node_modules/ffmpeg-static/**/*",
  "./node_modules/ffprobe-static/index.js",
  "./node_modules/ffprobe-static/package.json",
  "./node_modules/ffprobe-static/bin/linux/x64/**",
];

/** Caption overlay burn needs CJK fonts (gitignored TTFs downloaded at build). */
const COMPOSITOR_FONT_TRACE = ["./public/compositor/fonts/**/*"];

const FFMPEG_API_ROUTES = [
  "/api/add-bgm",
  "/api/analyze-beats",
  "/api/analyze-research-reel",
  "/api/burn-script-captions",
  "/api/burn-visual-captions",
  "/api/compose",
  "/api/dub-script-voice",
  "/api/generate-kling-storyboard",
  "/api/postprocess",
  "/api/prepare-reference-video",
  "/api/preview-script-voice",
  "/api/stitch-videos",
  "/api/trim-video",
] as const;

const FONT_API_ROUTES = [
  "/api/burn-script-captions",
  "/api/burn-visual-captions",
  "/api/burn-image-text",
  "/api/burn-image-canvas",
  "/api/compose",
] as const;

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["konva", "react-konva"],
  poweredByHeader: false,
  // Keep static binaries outside the webpack bundle so Vercel can spawn them.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static", "opentype.js"],
  outputFileTracingIncludes: {
    ...Object.fromEntries(FFMPEG_API_ROUTES.map((route) => [route, FFMPEG_TRACE])),
    ...Object.fromEntries(
      FONT_API_ROUTES.map((route) => [
        route,
        [
          ...(FFMPEG_API_ROUTES as readonly string[]).includes(route) ? FFMPEG_TRACE : [],
          ...COMPOSITOR_FONT_TRACE,
        ],
      ]),
    ),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    // Caption studio can upload large MP4s via /api/library/upload when R2 CORS fails.
    middlewareClientMaxBodySize: "100mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
