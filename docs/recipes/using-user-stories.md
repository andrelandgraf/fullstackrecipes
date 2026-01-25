User stories document what features should do and track implementation status. AI agents can read stories to understand requirements and mark progress.

---

## Workflow

1. **Create story** with `passes: false` before building
2. **Implement** until the feature works
3. **Mark `passes: true`** after verifying

---

## The `passes` Field

The `passes` field tracks implementation status:

- **`false`**: Feature not yet implemented, test failing, or regression discovered
- **`true`**: Feature works and has been verified

When a regression is discovered, either flip the existing entry to `false` or add a new scenario describing the edge case with `passes: false`.

---

## One Behavior Per Entry

Split features into one entry per distinct behavior. Don't combine multiple behaviors into one story.

Bad:

```json
{
  "description": "User can sign in and manage account",
  "steps": ["Sign in with email", "Change password", "Sign out"],
  "passes": false
}
```

Good:

```json
[
  {
    "description": "User signs in with email and password",
    "steps": [
      "Navigate to /sign-in page",
      "Enter email and password",
      "Submit the form",
      "Verify redirect to /chats"
    ],
    "passes": false
  },
  {
    "description": "Sign in shows error for invalid credentials",
    "steps": [
      "Navigate to /sign-in page",
      "Enter invalid email or password",
      "Submit the form",
      "Verify error toast appears"
    ],
    "passes": false
  }
]
```

---

## Writing Effective Steps

Steps should be **verifiable**, **imperative**, and **specific**.

Bad:

```json
{ "steps": ["Change the password"] }
```

Good:

```json
{
  "steps": [
    "Enter current password",
    "Enter new password",
    "Confirm new password",
    "Submit the form"
  ]
}
```

Include error cases and default states:

```json
{
  "description": "Change password validates requirements",
  "steps": [
    "Enter password shorter than 8 characters",
    "Verify minimum length error",
    "Enter mismatched passwords",
    "Verify passwords do not match error"
  ],
  "passes": false
}
```

---

## Verifying Stories

Run the verification script to check format:

```bash
bun run user-stories:verify
```
