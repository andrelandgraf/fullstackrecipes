## Next.js on Vercel

Complete setup guide for creating a Next.js app, initializing a GitHub repository, and deploying to Vercel with automatic deployments.

### Prerequisites

Install the required CLI tools:

```bash
# Install GitHub CLI
brew install gh

# Install Vercel CLI globally
bun add -g vercel
```

Authenticate with both services:

```bash
# Login to GitHub
gh auth login

# Login to Vercel
vercel login
```

### Create the Next.js App

Initialize a new Next.js application:

```bash
bunx create-next-app@latest my-app --ts --tailwind --react-compiler --no-linter --src-dir --app --use-bun
cd my-app
```

This command uses the following recommended options: TypeScript and Tailwind CSS for type safety and utility-first styling, enables the React Compiler for automatic optimizations, skips linter configuration (can be added later if needed), organizes code inside a `src/` directory for cleaner project structure, uses the App Router, and bootstraps with Bun as the package manager.

### Configure Bun Runtime (Optional)

Create a `vercel.json` file to configure Bun as the runtime on Vercel:

```json
{
  "bunVersion": "1.x"
}
```

Add Bun types for better TypeScript support:

```bash
bun add -D @types/bun
```

Using Bun both as the package manager and runtime provides a consistent development experience.

### Create GitHub Repository

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

### Deploy to Vercel

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

### Pull Environment Variables

After setting up environment variables in the Vercel dashboard, add these scripts to your `package.json`:

```json
{
  "scripts": {
    "env:pull": "vercel env pull .env.development --environment=development",
    "env:push": "vercel env push .env.development --environment=development"
  }
}
```

Then pull your environment variables:

```bash
bun run env:pull
```

We write to `.env.development` (not `.env.local`) so that local overrides in `.env.local` aren't deleted when pulling from Vercel. See the [Environment Variable Management](/recipes/env-config) recipe for the full setup.

### Deployment Workflow

After initial setup, your workflow is:

1. **Develop locally**: `bun run dev`
2. **Commit and push**: `git push origin main`
3. **Automatic deployment**: Vercel deploys on push
