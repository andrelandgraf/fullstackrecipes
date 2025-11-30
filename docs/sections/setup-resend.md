## Resend Setup

Set up [Resend](https://resend.com/docs/send-with-nextjs) for transactional emails like password resets.

---

### Step 1: Install the package

```bash
bun add resend
```

### Step 2: Add environment variables

Add to your `.env.local`:

```env
RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="Your App <noreply@yourdomain.com>"
```

Get your API key from [resend.com/api-keys](https://resend.com/api-keys).

### Step 3: Create the resend config

Create `src/lib/resend/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const ResendConfigSchema = z.object({
  apiKey: z.string("RESEND_API_KEY must be defined."),
  fromEmail: z.string().default("Acme <onboarding@resend.dev>"),
});

export type ResendConfig = z.infer<typeof ResendConfigSchema>;

const config: PreValidate<ResendConfig> = {
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL,
};

export const resendConfig = validateConfig(ResendConfigSchema, config);
```

### Step 4: Create the Resend client

Create `src/lib/resend/client.ts`:

```typescript
import { Resend } from "resend";
import { resendConfig } from "./config";

export const resend = new Resend(resendConfig.apiKey);
```

### Step 5: Create the send helper

Create `src/lib/resend/send.ts`:

```typescript
import { resend } from "./client";
import { resendConfig } from "./config";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
};

export async function sendEmail({ to, subject, react, from }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: from ?? resendConfig.fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
```

---

## Usage

```typescript
import { sendEmail } from "@/lib/resend/send";

await sendEmail({
  to: "user@example.com",
  subject: "Welcome!",
  react: <WelcomeEmail name="John" />,
});
```

### Create email templates

Email templates are React components. Create them in `src/lib/auth/emails/` for auth-related emails:

```typescript
// src/lib/auth/emails/forgot-password.tsx
interface ForgotPasswordEmailProps {
  resetLink: string;
}

export function ForgotPasswordEmail({ resetLink }: ForgotPasswordEmailProps) {
  return (
    <div>
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href={resetLink}>Reset Password</a>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  );
}
```

---

## File Structure

```
src/lib/resend/
  config.ts    # Environment validation
  client.ts    # Resend client instance
  send.ts      # Email sending helper

src/lib/auth/emails/
  forgot-password.tsx    # Password reset template
```

---

## References

- [Resend Next.js Guide](https://resend.com/docs/send-with-nextjs)
- [React Email](https://react.email/)
