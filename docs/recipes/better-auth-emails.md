### Step 1: Create email templates

Create styled email templates for all auth flows.

**Password Reset**:

```tsx
// src/lib/auth/emails/forgot-password.tsx
interface ForgotPasswordEmailProps {
  resetLink: string;
  userName?: string;
}

export function ForgotPasswordEmail({
  resetLink,
  userName,
}: ForgotPasswordEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "40px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1a1a1a",
            marginTop: "0",
            marginBottom: "16px",
          }}
        >
          Reset your password
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} we received a request to reset
          your password. Click the button below to choose a new password.
        </p>
        <a
          href={resetLink}
          style={{
            display: "inline-block",
            backgroundColor: "#0d9488",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Reset Password
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t request a password reset, you can safely ignore
          this email. Your password will remain unchanged.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e5e5",
            margin: "32px 0",
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "#9a9a9a",
            margin: "0",
          }}
        >
          This link will expire in 1 hour. If the button above doesn&apos;t
          work, copy and paste this URL into your browser:
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#0d9488",
            wordBreak: "break-all",
            marginTop: "8px",
          }}
        >
          {resetLink}
        </p>
      </div>
    </div>
  );
}
```

**Email Verification**:

```tsx
// src/lib/auth/emails/verify-email.tsx
interface VerifyEmailProps {
  verificationLink: string;
  userName?: string;
}

export function VerifyEmail({ verificationLink, userName }: VerifyEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "40px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1a1a1a",
            marginTop: "0",
            marginBottom: "16px",
          }}
        >
          Verify your email address
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} thanks for signing up! Please
          verify your email address to complete your registration and access all
          features.
        </p>
        <a
          href={verificationLink}
          style={{
            display: "inline-block",
            backgroundColor: "#0d9488",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Verify Email Address
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t create an account, you can safely ignore this
          email.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e5e5",
            margin: "32px 0",
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "#9a9a9a",
            margin: "0",
          }}
        >
          This link will expire in 1 hour. If the button above doesn&apos;t
          work, copy and paste this URL into your browser:
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#0d9488",
            wordBreak: "break-all",
            marginTop: "8px",
          }}
        >
          {verificationLink}
        </p>
      </div>
    </div>
  );
}
```

**Change Email Confirmation**:

```tsx
// src/lib/auth/emails/change-email.tsx
interface ChangeEmailProps {
  confirmationLink: string;
  newEmail: string;
  userName?: string;
}

export function ChangeEmail({
  confirmationLink,
  newEmail,
  userName,
}: ChangeEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "40px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1a1a1a",
            marginTop: "0",
            marginBottom: "16px",
          }}
        >
          Approve email change
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "16px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} we received a request to change
          your email address.
        </p>
        <div
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: "6px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#6b6b6b",
              margin: "0 0 4px 0",
            }}
          >
            New email address:
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "#1a1a1a",
              fontWeight: "500",
              margin: "0",
            }}
          >
            {newEmail}
          </p>
        </div>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Click the button below to approve this change. A verification email
          will then be sent to your new email address.
        </p>
        <a
          href={confirmationLink}
          style={{
            display: "inline-block",
            backgroundColor: "#0d9488",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Approve Email Change
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t request this change, please ignore this email or
          contact support if you&apos;re concerned about your account security.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e5e5",
            margin: "32px 0",
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "#9a9a9a",
            margin: "0",
          }}
        >
          This link will expire in 1 hour. If the button above doesn&apos;t
          work, copy and paste this URL into your browser:
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#0d9488",
            wordBreak: "break-all",
            marginTop: "8px",
          }}
        >
          {confirmationLink}
        </p>
      </div>
    </div>
  );
}
```

**Delete Account Verification**:

```tsx
// src/lib/auth/emails/delete-account.tsx
interface DeleteAccountEmailProps {
  confirmationLink: string;
  userName?: string;
}

export function DeleteAccountEmail({
  confirmationLink,
  userName,
}: DeleteAccountEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "40px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#dc2626",
            marginTop: "0",
            marginBottom: "16px",
          }}
        >
          Confirm Account Deletion
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "16px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} we received a request to
          permanently delete your account.
        </p>
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#dc2626",
              fontWeight: "500",
              margin: "0 0 8px 0",
            }}
          >
            Warning: This action is irreversible
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#7f1d1d",
              margin: "0",
            }}
          >
            Clicking the button below will permanently delete your account and
            all associated data. This cannot be undone.
          </p>
        </div>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          If you&apos;re sure you want to proceed, click the button below:
        </p>
        <a
          href={confirmationLink}
          style={{
            display: "inline-block",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Delete My Account
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t request this deletion, please ignore this email or
          contact support immediately. Your account will remain safe.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e5e5",
            margin: "32px 0",
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "#9a9a9a",
            margin: "0",
          }}
        >
          This link will expire in 1 hour. If the button above doesn&apos;t
          work, copy and paste this URL into your browser:
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#dc2626",
            wordBreak: "break-all",
            marginTop: "8px",
          }}
        >
          {confirmationLink}
        </p>
      </div>
    </div>
  );
}
```

### Step 2: Update the auth server

Update the auth server with email verification, change email, and delete account support:

```tsx
// src/lib/auth/server.tsx
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
  secret: authConfig.server.secret,
  baseURL: authConfig.server.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
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
```

---

## Usage

### Request Password Reset

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.requestPasswordReset({
  email: "user@example.com",
  redirectTo: "/reset-password",
});
```

### Reset Password

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.resetPassword({
  newPassword: "newSecurePassword",
  token: "token-from-url",
});
```

### Send Verification Email

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.sendVerificationEmail({
  email: "user@example.com",
  callbackURL: "/chats",
});
```

### Change Email

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.changeEmail({
  newEmail: "newemail@example.com",
  callbackURL: "/profile",
});
```

### Change Password

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.changePassword({
  currentPassword: "oldPassword",
  newPassword: "newPassword",
  revokeOtherSessions: true,
});
```

### Delete Account

```typescript
import { authClient } from "@/lib/auth/client";

await authClient.deleteUser({
  password: "password",
  callbackURL: "/",
});
```

---

## File Structure

```
src/lib/auth/
  server.tsx   # Already .tsx from base setup
  emails/
    forgot-password.tsx
    verify-email.tsx
    change-email.tsx
    delete-account.tsx
```
