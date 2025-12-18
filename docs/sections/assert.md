## Assertion Helper

A TypeScript assertion function for runtime type narrowing with descriptive error messages.

{% registry items="assert" /%}

### Why This Pattern?

- **Type narrowing**: TypeScript understands the assertion and narrows types after the check
- **Descriptive errors**: Know exactly what assertion failed and why
- **Lazy messages**: Defer expensive message construction until failure occurs

### Usage

The `assert` function throws if the condition is falsy, and narrows the type when it passes:

```typescript
import assert from "@/lib/common/assert";

function processUser(user: User | null) {
  assert(user, "User must exist");
  // TypeScript now knows `user` is `User`, not `User | null`
  console.log(user.name);
}
```

### Lazy Message Evaluation

For expensive message construction, pass a function that only runs on failure:

```typescript
assert(
  TOOL_TYPES.includes(part.type as ToolType),
  () => `Invalid tool type: ${part.type}`,
);
```

---

### Attribution

This implementation is based on [tiny-invariant](https://www.npmjs.com/package/tiny-invariant).

---

## References

- [TypeScript Assertion Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [tiny-invariant](https://www.npmjs.com/package/tiny-invariant)
