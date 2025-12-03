import { flag } from "flags/next";

export const vercelSignInFlag = flag({
  key: "vercel-sign-in",
  decide() {
    return Boolean(
      process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET,
    );
  },
});
