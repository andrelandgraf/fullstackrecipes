---
name: using-nuqs
description: Sync React state to URL query params with nuqs (Suspense wrapper, parsers, clearing, deep-linkable dialogs). Use when building shareable filters, search, or URL-driven dialogs.
---

# Working with nuqs

Sync React state to URL query params with nuqs.

## Prerequisites

Complete these setup recipes first:

- URL State with nuqs

### Suspense Wrapper

nuqs reads `useSearchParams`, so it needs a Suspense boundary. Colocate it by exporting a public wrapper that suspends an internal client component — consumers then use the component without adding Suspense themselves.

```typescript
import { Suspense } from "react";

type SearchInputProps = { placeholder?: string };

export function SearchInput(props: SearchInputProps) {
  return (
    <Suspense fallback={<input placeholder={props.placeholder} disabled />}>
      <SearchInputClient {...props} />
    </Suspense>
  );
}
```

```typescript
"use client";

import { useQueryState, parseAsString } from "nuqs";

function SearchInputClient({ placeholder = "Search..." }: SearchInputProps) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value || null)}
      placeholder={placeholder}
    />
  );
}
```

### Parsers

Replace `useState` with `useQueryState` plus a parser. Use `.withDefault()` to read a fallback while keeping the URL clean.

```typescript
"use client";

import {
  useQueryState,
  parseAsString,
  parseAsBoolean,
  parseAsArrayOf,
} from "nuqs";

const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
const [showArchived, setShowArchived] = useQueryState(
  "archived",
  parseAsBoolean.withDefault(false),
);
const [tags, setTags] = useQueryState(
  "tags",
  parseAsArrayOf(parseAsString).withDefault([]),
);
```

### Clearing

Set a value to `null` to remove it from the URL. With `.withDefault()`, the param clears but reads return the default.

```typescript
setSearch(null);

function clearFilters() {
  setSearch(null);
  setTags(null);
  setShowArchived(null);
}
```

### Deep-Linkable Dialogs

Drive dialog visibility from a URL param so it's shareable and survives back/forward. Wrap in the same Suspense pattern.

```typescript
import { Suspense } from "react";

type DeleteDialogProps = { onDelete: (id: string) => Promise<void> };

export function DeleteDialog(props: DeleteDialogProps) {
  return (
    <Suspense fallback={null}>
      <DeleteDialogClient {...props} />
    </Suspense>
  );
}
```

```typescript
"use client";

import { useQueryState, parseAsString } from "nuqs";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";

function DeleteDialogClient({ onDelete }: DeleteDialogProps) {
  const [deleteId, setDeleteId] = useQueryState("delete", parseAsString);

  async function handleDelete() {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  }

  return (
    <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
      <AlertDialogContent>
        <Button onClick={handleDelete}>Delete</Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Open it from anywhere by setting the param — `setDeleteId("item-123")` yields the deep link `/items?delete=item-123`.

```typescript
function ItemRow({ item }: { item: Item }) {
  const [, setDeleteId] = useQueryState("delete", parseAsString);
  return (
    <Button variant="ghost" onClick={() => setDeleteId(item.id)}>
      Delete
    </Button>
  );
}
```

---

## References

- [nuqs Documentation](https://nuqs.47ng.com/)
- [nuqs Parsers](https://nuqs.47ng.com/docs/parsers)
