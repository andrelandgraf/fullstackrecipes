## Create a Next.js App

Start with a fresh Next.js application using the latest version.

### Initialize the project

```bash
bunx create-next-app@latest my-app
```

Recommended options to select during the setup:

- **TypeScript**: Yes
- **Linter**: No
- **React Compiler**: Yes
- **Tailwind CSS**: Yes
- **src/ directory**: Yes
- **App Router**: Yes
- **Customize `@/*` alias**: No

### Configure Bun runtime on Vercel (Optional)

Create a `vercel.json` file in your project root to configure Bun as the runtime on Vercel:

```json
{
  "bunVersion": "1.x"
}
```

This is optional but using Bun both as the package manager and runtime is a great development experience.
