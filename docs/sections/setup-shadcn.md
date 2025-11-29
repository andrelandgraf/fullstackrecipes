## Set Up Shadcn UI

Add beautiful, accessible components to your Next.js app with Shadcn UI.

### Step 1: Initialize Shadcn

```bash
bunx --bun shadcn@latest init
```

Follow the prompts to configure your project. The CLI will:

- Create a `components.json` config file
- Set up your CSS variables in `globals.css`
- Configure path aliases

### Step 2: Add components

Install all components at once:

```bash
bunx --bun shadcn@latest add --all
```

Or add individual components as needed:

```bash
bunx --bun shadcn@latest add button card input
```

### Step 3: Add dark mode (optional)

Install the theme provider:

```bash
bun add next-themes
```

Create a theme provider component:

```tsx
// src/components/themes/provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemesProvider attribute="class">{children}</NextThemesProvider>;
}
```

Wrap your app with the provider in your root layout:

```tsx
// src/app/layout.tsx
import { ThemeProvider } from "@/components/themes/provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

---

## References

- [Shadcn UI Documentation](https://ui.shadcn.com/docs)
- [Shadcn Next.js Installation](https://ui.shadcn.com/docs/installation/next)
- [Shadcn Dark Mode Guide](https://ui.shadcn.com/docs/dark-mode/next)
- [next-themes](https://github.com/pacocoursey/next-themes)
