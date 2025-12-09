import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { authConfig } from "./config";
import { sendEmail } from "../resend/send";
import { ForgotPasswordEmail } from "./emails/forgot-password";
import { VerifyEmail } from "./emails/verify-email";
import { ChangeEmail } from "./emails/change-email";
import { DeleteAccountEmail } from "./emails/delete-account";

export const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  socialProviders: {
    ...(authConfig.vercelClientId &&
      authConfig.vercelClientSecret && {
        vercel: {
          clientId: authConfig.vercelClientId,
          clientSecret: authConfig.vercelClientSecret,
        },
      }),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      void sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        react: <ForgotPasswordEmail resetLink={url} userName={user.name} />,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }) {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        react: <VerifyEmail verificationLink={url} userName={user.name} />,
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      async sendChangeEmailConfirmation({ user, newEmail, url }) {
        void sendEmail({
          to: user.email,
          subject: "Approve email change",
          react: (
            <ChangeEmail
              confirmationLink={url}
              newEmail={newEmail}
              userName={user.name}
            />
          ),
        });
      },
    },
    deleteUser: {
      enabled: true,
      async sendDeleteAccountVerification({ user, url }) {
        void sendEmail({
          to: user.email,
          subject: "Confirm account deletion",
          react: (
            <DeleteAccountEmail confirmationLink={url} userName={user.name} />
          ),
        });
      },
    },
  },
});
