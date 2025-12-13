import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  env: {
    // Either VERCEL_OIDC_TOKEN or AI_GATEWAY_API_KEY must be set
    oidcToken: { env: "VERCEL_OIDC_TOKEN", optional: "AI_GATEWAY_API_KEY" },
    gatewayApiKey: { env: "AI_GATEWAY_API_KEY", optional: "VERCEL_OIDC_TOKEN" },
  },
});
