import { loadConfig } from "../common/load-config";

export const authConfig = loadConfig({
  server: {
    secret: process.env.BETTER_AUTH_SECRET,
    url: process.env.BETTER_AUTH_URL,
    vercelClientId: { value: process.env.VERCEL_CLIENT_ID, optional: true },
    vercelClientSecret: {
      value: process.env.VERCEL_CLIENT_SECRET,
      optional: true,
    },
  },
});
