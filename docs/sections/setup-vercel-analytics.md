## Vercel Web Analytics Setup

Add privacy-focused web analytics to your Next.js app with [Vercel Web Analytics](https://vercel.com/docs/analytics). Track page views, visitors, and custom events with zero configuration.

### Step 1: Install the package

```bash
bun add @vercel/analytics
```

### Step 2: Add the Analytics component

Add the `Analytics` component to your root layout:

```typescript
// src/app/layout.tsx
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

That's it! Page views are now tracked automatically.

---

## Custom Events

Track custom events to measure user actions:

```typescript
import { track } from "@vercel/analytics";

// Track a button click
function SignupButton() {
  return (
    <button onClick={() => track("signup_clicked")}>
      Sign Up
    </button>
  );
}

// Track with properties
track("purchase_completed", {
  plan: "pro",
  price: 29,
  currency: "USD",
});

// Track form submissions
function ContactForm() {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    track("contact_form_submitted", { source: "footer" });
    // ... submit form
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Development

Analytics are only sent in production by default. To test in development, set the `mode` prop:

```typescript
<Analytics mode="development" />
```

Or use the `debug` prop to log events to the console:

```typescript
<Analytics debug />
```

---

## References

- [Vercel Web Analytics](https://vercel.com/docs/analytics)
- [@vercel/analytics Package](https://www.npmjs.com/package/@vercel/analytics)
