import { flag } from "flags/next";

export const emailVerificationFlag = flag({
  key: "email-verification",
  decide() {
    return Boolean(process.env.RESEND_API_KEY);
  },
});
