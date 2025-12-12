import { z } from "zod";
import { validateConfig, type PreValidate } from "@/lib/common/validate-config";

const AIConfigSchema = z.object({
  gatewayApiKey: z.string("AI_GATEWAY_API_KEY must be defined."),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

const config: PreValidate<AIConfig> = {
  gatewayApiKey: process.env.AI_GATEWAY_API_KEY,
};

export const aiConfig = validateConfig(AIConfigSchema, config);
