import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { authConfig } from "./config";
import { sendEmail } from "../resend/send";
import { ForgotPasswordEmail } from "./emails/forgot-password";
import * as schema from "./schema";

export const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        react: <ForgotPasswordEmail resetLink={url} />,
      });
    },
  },
});
