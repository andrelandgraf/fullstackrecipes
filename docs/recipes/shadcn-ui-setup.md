### Step 1: Initialize Shadcn

```bash
bunx --bun shadcn@latest init
```

Follow the prompts to configure your project. The CLI will create a `components.json` config file and set up your CSS variables in `globals.css`.

### Step 2: Add components

Install all components:

```bash
bunx --bun shadcn@latest add --all --yes
```

Note: Shadcn is highly configurable. Omit `--yes` and follow the setup wizard to configure Shadcn to your liking.

### Step 3: Add dark mode

Install the theme provider:

```bash
bun add next-themes
```

Create the theme provider component:

```tsx
// src/components/themes/provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

Wrap your app with the provider in your layout:

```tsx
// src/app/layout.tsx
import { ThemeProvider } from "@/components/themes/provider";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Create the theme selector component to toggle between light, dark, and system themes:

```tsx
// src/components/themes/selector.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSelector() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## References

- [Shadcn Next.js Installation](https://ui.shadcn.com/docs/installation/next)
- [Shadcn Dark Mode Guide](https://ui.shadcn.com/docs/dark-mode/next)
