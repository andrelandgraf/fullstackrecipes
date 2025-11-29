## Agent API Route

Expose the agent through an API endpoint that accepts tasks and returns results.

```typescript
// app/api/agent/route.ts
import { runAgent } from "@/lib/agent";

export async function POST(request: Request) {
  const { task } = await request.json();

  try {
    const result = await runAgent(task);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: "Agent execution failed" }, { status: 500 });
  }
}
```

Clients can POST a task and receive the agent's final result along with metadata about iterations.
