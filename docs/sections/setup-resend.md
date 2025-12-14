## Resend Setup

Set up [Resend](https://resend.com) for transactional emails like password resets.

### MCP Server

Add the Resend MCP server to your `.cursor/mcp.json` for accurate API guidance:

```json
{
  "mcpServers": {
    "resend": {
      "url": "https://resend.com/docs/mcp"
    }
  }
}
```

---

### Step 1: Install the packages

```bash
bun add resend @react-email/components
```

The `@react-email/components` package is required for Resend to render React email templates.

### Step 2: Add environment variables

Add to your `.env.development`:

```env
RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="Your App <noreply@yourdomain.com>"
```

Then sync to Vercel with `bun run env:push`.

Get your API key from [resend.com/api-keys](https://resend.com/api-keys).

### Step 3: Create the resend config

Create the Resend config with email format validation:

```typescript
// src/lib/resend/config.ts
import { z } from "zod";
import { loadConfig } from "../common/load-config";

export const resendConfig = loadConfig({
  server: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: {
      value: process.env.RESEND_FROM_EMAIL,
      schema: z
        .string()
        .regex(
          /^.+\s<.+@.+\..+>$/,
          'Must match "Name <email@domain.com>" format.',
        ),
    },
  },
});
```

### Step 4: Create the Resend client

Create the Resend client instance:

```typescript
// src/lib/resend/client.ts
import { Resend } from "resend";
import { resendConfig } from "./config";

export const resend = new Resend(resendConfig.server.apiKey);
```

### Step 5: Create the send helper

Create the email sending helper:

```typescript
// src/lib/resend/send.ts
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
    from: from ?? resendConfig.server.fromEmail,
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

Email templates are React components colocated with the feature that uses them, following the "everything is a library" pattern. Auth-related emails (password reset, email verification) live in `src/lib/auth/emails/`, while other features would have their own `emails/` subfolder.

For example, a password reset email template:

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
