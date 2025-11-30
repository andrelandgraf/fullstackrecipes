## UI Integration

### Subscription Context Provider

```typescript
// lib/stripe/subscription-info.tsx
"use client"

import { createContext, useContext } from "react"

export type SubscriptionInfo = {
  planName: string
  chatLimit: number
}

const SubscriptionContext = createContext<SubscriptionInfo>({
  planName: "FREE",
  chatLimit: 100,
})

export function SubscriptionContextProvider({
  children,
  subscriptionInfo,
}: {
  children: React.ReactNode
  subscriptionInfo: SubscriptionInfo
}) {
  return (
    <SubscriptionContext.Provider value={subscriptionInfo}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionInfo() {
  return useContext(SubscriptionContext)
}
```

### Settings Page Component

```tsx
// Usage in settings page
<div className="flex justify-end">
  {isPro ? (
    <form action={createBillingPortalSession}>
      <Button type="submit">Manage Subscription</Button>
    </form>
  ) : (
    <form action={createCheckoutSession}>
      <Button type="submit">Upgrade to Pro</Button>
    </form>
  )}
</div>

// Usage progress display
<div className="space-y-2">
  <div className="flex items-center justify-between text-sm">
    <span>Monthly Chat Requests</span>
    <span className="font-medium">
      {chatRequestCount} / {chatLimit}
    </span>
  </div>
  <Progress value={(chatRequestCount / chatLimit) * 100} className="h-2" />
</div>
```
