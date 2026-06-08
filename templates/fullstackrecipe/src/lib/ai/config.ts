import { configSchema, server, oneOf } from "better-env/config-schema";

/**
 * AI provider config. Uses the Vercel AI Gateway: pass a plain
 * "provider/model" string (e.g. "openai/gpt-4o") to streamText/generateText
 * and the AI SDK routes it through the gateway using AI_GATEWAY_API_KEY (local)
 * or VERCEL_OIDC_TOKEN (injected automatically on Vercel).
 */
export const aiConfig = configSchema(
  "AI",
  {
    oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
    gatewayApiKey: server({ env: "AI_GATEWAY_API_KEY" }),
  },
  {
    constraints: (s) => [oneOf([s.oidcToken, s.gatewayApiKey])],
  },
);
