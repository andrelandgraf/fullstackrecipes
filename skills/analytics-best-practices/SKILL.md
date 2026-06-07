---
name: analytics-best-practices
description: Track custom events and conversions with Vercel Web Analytics via the track() call. Use when instrumenting user actions, conversions, or form submissions.
---

# Analytics Best Practices

Track custom events and conversions with Vercel Web Analytics.

## Prerequisites

Complete these setup recipes first:

- Vercel Web Analytics

### Tracking Events

Call `track(name)` or `track(name, properties)` from client code.

```typescript
import { track } from "@vercel/analytics";

track("signup_clicked");

track("purchase_completed", { plan: "pro", price: 29, currency: "USD" });
```

Name events consistently around auth, feature usage, and conversions.

```typescript
track("signup_completed", { method: "email" });
track("chat_completed", { messageCount: 5 });
track("subscription_created", { plan: "pro" });
track("upgrade_completed", { from: "free", to: "pro" });
```

### In Components

Track inside event handlers.

```tsx
import { track } from "@vercel/analytics";

function UpgradeButton() {
  return (
    <button
      onClick={() => track("upgrade_button_clicked", { location: "header" })}
    >
      Upgrade
    </button>
  );
}
```

```tsx
function ContactForm() {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    track("contact_form_submitted", { source: "footer" });
    // submit...
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Testing in Development

Events only send in production by default. Enable locally on the `<Analytics />` component in `layout.tsx`.

```tsx
<Analytics mode="development" />  // sends events
<Analytics debug />               // logs events to console
```

View page views, visitors, and custom events under Analytics in the Vercel dashboard.

---

## References

- [Vercel Web Analytics](https://vercel.com/docs/analytics)
- [Custom Events](https://vercel.com/docs/analytics/custom-events)
