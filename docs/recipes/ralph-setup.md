{% registry items="ralph" /%}

Ralph is a pattern for automated agent-driven development. It runs AI coding agents in a loop, where each agent picks up a user story, implements it, verifies it passes, and logs what it did for the next agent.

## Background & References

- [Ralph - Geoffrey Huntley](https://ghuntley.com/ralph/) - Original concept and implementation
- [Effective Harnesses for Long-Running Agents - Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Engineering patterns for agent loops
- [Matt Pocock on Ralph](https://www.youtube.com/watch?v=_IK18goX4X8) - Video walkthrough

---

### Step 1: Add npm Script

Add a script to `package.json` to run Ralph:

```json
{
  "scripts": {
    "ralph": "bun run scripts/ralph/runner.ts"
  }
}
```

### Step 2: Install Claude Code CLI

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

## Story Categories

Add a `category` field to help Ralph prioritize work:

```json
{
  "category": "functional",
  "description": "User signs in with email and password",
  "steps": ["Navigate to /sign-in", "Enter credentials", "Verify redirect"],
  "passes": false
}
```

Categories:

- `functional` - Core feature behavior (highest priority)
- `edge-case` - Error handling and boundary conditions
- `integration` - Features that span multiple systems
- `ui` - Visual and interaction requirements
