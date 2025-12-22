## Create the Next.js App

Initialize a new Next.js application:

```bash
bunx create-next-app@latest my-app --ts --tailwind --react-compiler --no-linter --src-dir --app --use-bun
cd my-app
```

This command uses the following recommended options: TypeScript and Tailwind CSS for type safety and utility-first styling, enables the React Compiler for automatic optimizations, skips linter configuration (can be added later if needed), organizes code inside a `src/` directory for cleaner project structure, uses the App Router, and bootstraps with Bun as the package manager.

## Setup Vercel Configuration

Install the Vercel config package to programatically configure the Vercel project:

```bash
bun add -D @vercel/config
```

Create the `vercel.ts` file:

```typescript
// vercel.ts
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {};
```

## Configure Bun as the Runtime on Vercel (Optional)

Using Bun both as the package manager and runtime provides a consistent development experience. To configure Bun as the runtime on Vercel, add the following to the `vercel.ts` file:

```typescript
// vercel.ts
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  bunVersion: "1.x",
};
```

Add Bun types for better TypeScript support:

```bash
bun add -D @types/bun
```

## Install GitHub CLI

Install the GitHub CLI to manage your GitHub repositories:

```bash
brew install gh
```

Login to your GitHub account:

```bash
gh auth login
```

## Create GitHub Repository

Initialize git and create a new GitHub repository inside the project root:

```bash
# Create GitHub repository and push
gh repo create my-app --public --source=. --push
```

The `gh repo create` command:

- Creates a new repository on GitHub
- Sets the remote origin
- Pushes your local code

Use `--private` instead of `--public` for a private repository.

## Install Vercel CLI

Install the Vercel CLI globally to manage your Vercel projects:

```bash
bun add -g vercel
```

Authenticate with Vercel:

```bash
vercel login
```

## Deploy to Vercel

Link your project to Vercel and deploy:

```bash
# Deploy to Vercel (creates project on first run)
vercel
```

On first run, you'll be prompted to:

- Set up and deploy the project
- Link to an existing project or create a new one
- Configure project settings

### Connect Git for Automatic Deployments

Connect your GitHub repository to enable automatic deployments on push:

```bash
vercel git connect
```

This links your local Git repository to your Vercel project, enabling:

- Automatic deployments on push to main branch
- Preview deployments for pull requests
- Deployment status checks on GitHub

## Deployment Workflow

After initial setup, your workflow is:

1. **Develop locally**: `bun run dev`
2. **Commit and push**: `git push origin main`
3. **Automatic deployment**: Vercel deploys on push
