## Installation

```bash
bun add nuqs
```

## Setup the Adapter

Wrap your app with the `NuqsAdapter` in your root layout:

```tsx title="src/app/layout.tsx"
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
```

## Suspense Boundary Requirement

nuqs uses `useSearchParams` behind the scenes, which requires a Suspense boundary. Without one, Next.js throws an error during static rendering.

Wrap nuqs-using components with Suspense via a wrapper component. This keeps the Suspense boundary colocated with the component that needs it, avoiding the need to add Suspense in every consuming component:

```tsx title="src/components/search/search-input.tsx"
import { Suspense } from "react";

type SearchInputProps = {
  placeholder?: string;
};

// Public component with built-in Suspense
export function SearchInput(props: SearchInputProps) {
  return (
    <Suspense fallback={<input placeholder={props.placeholder} disabled />}>
      <SearchInputClient {...props} />
    </Suspense>
  );
}
```

```tsx title="src/components/search/search-input.tsx (continued)"
"use client";

import { useQueryState, parseAsString } from "nuqs";

// Internal client component that uses nuqs
function SearchInputClient({ placeholder = "Search..." }: SearchInputProps) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  function handleChange(value: string) {
    setSearch(value || null);
  }

  return (
    <input
      value={search}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
```

Now `SearchInput` can be used anywhere without the consumer needing to add Suspense:

```tsx
// No Suspense needed here - it's built into SearchInput
<SearchInput placeholder="Search recipes..." />
```

## Basic Usage

Replace `useState` with `useQueryState` to sync state to the URL. This creates URLs like `?q=react` when searching.

## Parsers

nuqs provides parsers for different data types:

```tsx
import {
  useQueryState,
  parseAsString,
  parseAsBoolean,
  parseAsArrayOf,
} from "nuqs";

// String with default
const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

// Boolean (for toggles)
const [showArchived, setShowArchived] = useQueryState(
  "archived",
  parseAsBoolean.withDefault(false),
);

// Array of strings (for multi-select filters)
const [tags, setTags] = useQueryState(
  "tags",
  parseAsArrayOf(parseAsString).withDefault([]),
);
```

## Deep Links to Modals

Use query params to control modal visibility, enabling shareable links. Apply the wrapper pattern to keep Suspense colocated:

```tsx title="src/components/settings/settings-dialog.tsx"
import { Suspense } from "react";

type SettingsDialogProps = {
  children: React.ReactNode;
};

// Public component with built-in Suspense
export function SettingsDialog(props: SettingsDialogProps) {
  return (
    <Suspense fallback={<span>{props.children}</span>}>
      <SettingsDialogClient {...props} />
    </Suspense>
  );
}
```

```tsx title="src/components/settings/settings-dialog.tsx (continued)"
"use client";

import { useQueryState, parseAsBoolean } from "nuqs";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";

function SettingsDialogClient({ children }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useQueryState(
    "settings",
    parseAsBoolean.withDefault(false),
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open || null)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>{/* Settings content */}</DialogContent>
    </Dialog>
  );
}
```

Link directly to the open modal with `?settings=true`.

For modals that operate on specific items (like delete confirmations), use the item ID:

```tsx
const [deleteId, setDeleteId] = useQueryState("delete", parseAsString);

// Open: setDeleteId("item-123")
// Close: setDeleteId(null)
// Deep link: ?delete=item-123

<AlertDialog
  open={!!deleteId}
  onOpenChange={(open) => !open && setDeleteId(null)}
>
```

## SEO: Canonical URLs

Since query parameters are for local UI state, add a canonical URL to tell search engines to index the page without them:

```tsx title="src/app/page.tsx"
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};
```

This prevents duplicate content issues from filter variations like `?q=react` and `?q=nextjs` being indexed separately.

## Clearing State

Setting a value to `null` removes it from the URL:

```tsx
// Clear single param
setSearch(null);

// Clear multiple params
function clearFilters() {
  setSearch(null);
  setTags(null);
  setShowArchived(null);
}
```

When using `.withDefault()`, setting to `null` clears the URL param but returns the default value as state.
