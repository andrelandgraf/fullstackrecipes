{% registry items="ralph" /%}

Ralph is a pattern for automated agent-driven development. It runs AI coding agents in a loop, where each agent picks up a user story, implements it, verifies it passes, and logs what it did for the next agent.

## Background & References

- [Ralph - Geoffrey Huntley](https://ghuntley.com/ralph/) - Original concept and implementation
- [Effective Harnesses for Long-Running Agents - Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Engineering patterns for agent loops
- [Matt Pocock on Ralph](https://www.youtube.com/watch?v=_IK18goX4X8) - Video walkthrough

---

### Step 1: Create the User Stories Directory

Create a `docs/user-stories/` directory to store acceptance criteria for features. Each user story is a JSON file containing test scenarios:

```json
[
  {
    "category": "functional",
    "description": "User signs in with email and password",
    "steps": [
      "Navigate to /sign-in page",
      "Enter email and password",
      "Submit the form",
      "Verify successful login",
      "Verify redirect to /chats"
    ],
    "passes": false
  }
]
```

Each user story file can contain multiple scenarios. The `passes` field tracks whether the feature has been implemented and verified.

### Step 2: Add npm Script

Add a script to `package.json` to run Ralph:

```json
{
  "scripts": {
    "ralph": "bun run scripts/ralph/runner.ts"
  }
}
```

### Step 3: Install Claude Code CLI

Ralph uses the Claude Code CLI to spawn agent sessions. Install it globally:

```bash
npm install -g @anthropic-ai/claude-code
```

---

## Running Ralph

Start the dev server in one terminal, then run Ralph:

```bash
bun run dev
```

```bash
bun run ralph
```

Ralph will:

1. Read the prompt instructions
2. Check the log for previous work
3. Find a user story with `"passes": false`
4. Implement and verify the feature
5. Update the story to `"passes": true`
6. Log what it did
7. Repeat until all stories pass

To provide additional context or corrections:

```bash
bun run ralph --prompt "Focus on authentication features first"
```

---

## Writing User Stories

Each user story file should cover a single feature area. Group related scenarios together:

```json
[
  {
    "category": "functional",
    "description": "Chat is automatically named after first message",
    "steps": [
      "Create a new chat",
      "Send the first message",
      "Wait for AI response to complete",
      "Navigate to /chats list",
      "Verify chat has a descriptive title based on first message"
    ],
    "passes": false
  },
  {
    "category": "edge-case",
    "description": "Empty message does not trigger naming",
    "steps": [
      "Create a new chat",
      "Submit empty message",
      "Verify chat title remains 'New Chat'"
    ],
    "passes": false
  }
]
```

Categories help agents prioritize:

- `functional` - Core feature behavior
- `edge-case` - Error handling and boundary conditions
- `integration` - Features that span multiple systems
- `ui` - Visual and interaction requirements

---

## Best Practices

1. **Atomic stories**: Each scenario should test one specific behavior
2. **Clear steps**: Write steps that an agent can verify programmatically
3. **Independent stories**: Stories should not depend on execution order
4. **Descriptive filenames**: Use kebab-case names that describe the feature area (e.g., `chat-auto-naming.json`, `authentication-sign-in.json`)
