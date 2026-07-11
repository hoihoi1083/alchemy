import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["konva", "react-konva"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
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
