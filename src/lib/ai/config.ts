import { configSchema, server, oneOf } from "@/lib/config/schema";

export const aiConfig = configSchema(
  "AI",
  {
    // Either oidcToken or gatewayApiKey must be set
    oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
    gatewayApiKey: server({ env: "AI_GATEWAY_API_KEY" }),
  },
  {
    constraints: (s) => [oneOf([s.oidcToken, s.gatewayApiKey])],
  },
);
