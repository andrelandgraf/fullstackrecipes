import { loadConfig } from "../common/load-config";

export const authConfig = loadConfig({
  env: {
    secret: "BETTER_AUTH_SECRET",
    url: "BETTER_AUTH_URL",
    vercelClientId: { env: "VERCEL_CLIENT_ID", optional: true },
    vercelClientSecret: {
      env: "VERCEL_CLIENT_SECRET",
      optional: true,
    },
  },
});
