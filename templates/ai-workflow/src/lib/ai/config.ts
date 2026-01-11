import { configSchema, server, oneOf } from "@/lib/config/schema";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const config = configSchema(
  "AI",
  {
    oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
    gatewayApiKey: server({ env: "AI_GATEWAY_API_KEY" }),
  },
  {
    constraints: (s) => [oneOf([s.oidcToken, s.gatewayApiKey])],
  },
);

function createProvider() {
  const { oidcToken, gatewayApiKey } = config.server;

  if (gatewayApiKey) {
    return createOpenAI({
      apiKey: gatewayApiKey,
      baseURL: "https://api.openai.com/v1",
    });
  }

  return createOpenAI({
    apiKey: oidcToken,
    baseURL: "https://api.vercel.ai/v1",
  });
}

function getModel(model: string): LanguageModel {
  const provider = createProvider();
  return provider(model);
}

export const aiConfig = {
  ...config,
  getModel,
};
