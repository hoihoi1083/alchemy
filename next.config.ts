import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
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
