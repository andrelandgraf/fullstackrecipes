---
name: user-stories
description: Manages user stories in JSON format for feature development tracking. Use when implementing features to create/update user stories, verify implementation steps, and mark features as passing once tests confirm functionality.
---

# User Stories

## Format

User stories live in `docs/user-stories/<story-name>.json` as arrays of features:

```json
[
  {
    "description": "User creates a loop with custom config",
    "steps": [
      "POST to /loops with config object",
      "Verify loop is created with merged config",
      "GET /loops/:id/detail and verify config values"
    ],
    "passes": true
  }
]
```

## Fields

- **description**: What the user does/expects
- **steps**: Verification steps (imperative)
- **passes**: `true` if verified working with passing tests, `false` otherwise

## Workflow

When prompted to work on a feature:

1. **Author/Update**: Create or modify user story features before building
2. **Build & Test**: Implement until tests pass
3. **Mark Passing**: Set `passes: true` when verified
