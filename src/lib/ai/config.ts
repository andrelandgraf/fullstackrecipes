import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  env: {
    gatewayApiKey: "AI_GATEWAY_API_KEY",
  },
});
