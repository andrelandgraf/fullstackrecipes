import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  server: {
    // Either oidcToken or gatewayApiKey must be set
    oidcToken: {
      value: process.env.VERCEL_OIDC_TOKEN,
      optional: "gatewayApiKey",
    },
    gatewayApiKey: {
      value: process.env.AI_GATEWAY_API_KEY,
      optional: "oidcToken",
    },
  },
});
