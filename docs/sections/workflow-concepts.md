## Workflow Key Concepts

Understanding the core concepts behind resumable workflows.

### How Resumability Works

1. **Workflow starts** - `workflowRunId` is generated and returned in response header
2. **Message created** - Assistant message is created with `runId` before streaming
3. **Client stores runId** - `WorkflowChatTransport` captures it from header
4. **Connection lost** - Client detects disconnect
5. **Auto-reconnect** - Transport calls resume endpoint with `runId` and `startIndex`
6. **Stream resumes** - Workflow SDK returns stream from where client left off
7. **Page reload** - Server detects incomplete message by checking for `runId`, passes to client to resume

### The `"use step"` Directive

Marks functions as durable workflow steps:

```typescript
async function myStep(input: string): Promise<string> {
  "use step";
  // Result is persisted and replayed on restart
  return await someOperation(input);
}
```

- Each step is persisted and can be replayed if the workflow is interrupted
- Only works in standalone functions, not class methods
- Enables exactly-once semantics for database operations

### The `"use workflow"` Directive

Marks the main workflow function:

```typescript
export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const writable = getWritable();
  // ...
}
```

Provides access to:

- `getWorkflowMetadata()` - Get the run ID and other metadata
- `getWritable()` - Get the writable stream for sending chunks

### Stream Ordering

- UUID v7 IDs ensure chronological ordering of message parts
- `startIndex` parameter allows resuming from a specific chunk
- Parts are sorted by ID when loading from database

### Tool Loops

Agents continue executing until `finishReason !== "tool-calls"`:

```typescript
while (shouldContinue && stepCount < maxSteps) {
  const result = await executeAgentStep(modelMessages, stepConfig);
  shouldContinue = result.finishReason === "tool-calls";
  stepCount++;
}
```

This allows models to call tools multiple times before responding.

### Why Tools Are Referenced by Key

Workflow runtimes serialize step inputs/outputs. Function references can't be serialized, so tools are stored in a lookup object:

```typescript
const toolSets = {
  research: researchTools,
  drafting: draftingTools,
} as const;

// Inside step executor:
const tools = toolSets[config.stepOptions.tools];
```

### Why Step Executors Are Separate

The `"use step"` directive only works in standalone functions:

```typescript
// This works:
async function executeAgentStep(...) {
  "use step";
  // ...
}

// This does NOT work:
class Agent {
  async executeStep(...) {
    "use step"; // Error: directive not supported in methods
  }
}
```

### Progress Updates

Use progress updates to keep users informed during long operations:

```typescript
await writeProgress("Researching topic...", chatId, messageId);
```

Progress updates are:

- Streamed to the client immediately
- Persisted to the database for history

---

## References

- [Workflow Development Kit Documentation](https://useworkflow.dev/docs)
- [DurableAgent API Reference](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent)
- [AI SDK streamText](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext)
