import type { NextConfig } from "next";
import path from "node:path";
import { withWorkflow } from "workflow/next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // This template lives inside the fullstackrecipes monorepo; pin the workspace
  // root so Turbopack doesn't infer it from a parent lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
  // Externalize pino to prevent Turbopack from bundling thread-stream test files.
  serverExternalPackages: ["pino"],
};

export default withSentryConfig(withWorkflow(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: process.env.NEXT_PUBLIC_SENTRY_ORG,
  project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors.
    automaticVercelMonitors: true,
  },
});
