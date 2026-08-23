import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.5.223"],
};

export default withSentryConfig(nextConfig, {
  org: "juan17md",
  project: "elite-barber-shop",
  // Necesario por geobloqueo regional: los navegadores de Venezuela no
  // alcanzan *.ingest.sentry.io directo; la telemetría sale por el mismo origen.
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
  webpack: {
    treeshake: { removeDebugLogging: true },
    reactComponentAnnotation: { enabled: true },
    automaticVercelMonitors: true,
  },
});
