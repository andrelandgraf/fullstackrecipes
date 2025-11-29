## Set up Workflow Development Kit

The [Workflow Development Kit](https://useworkflow.dev) provides resumable, durable workflows for AI agents. It enables step-level persistence, stream resumption, and agent orchestration.

### Step 1: Install the packages

```bash
bun add workflow @workflow/ai
```

### Step 2: Update Next.js config

```ts
// next.config.ts
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withWorkflow(nextConfig);
```

---

## References

- [Workflow Development Kit Documentation](https://useworkflow.dev/docs)
- [Getting Started on Next.js](https://useworkflow.dev/docs/getting-started/next)
