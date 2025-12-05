## Create a Next.js App

Start with a fresh Next.js application using the latest version.

### Step 1: Initialize the project

```bash
bunx create-next-app@latest my-app
cd my-app
```

During setup, select:

- **TypeScript**: Yes
- **ESLint**: No
- **Tailwind CSS**: Yes
- **App Router**: Yes

### Step 2: Add Prettier and scripts

We use Prettier for code formatting and TypeScript for typechecking (no linter).

```bash
bun add -D prettier
```

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "fmt": "prettier --write ."
  }
}
```

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Bun Package Manager](https://bun.sh)
