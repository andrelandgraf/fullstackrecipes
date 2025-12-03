## AI Coding Agent Configuration

This guide helps you configure AI coding agents (like Cursor, GitHub Copilot, or similar tools) to follow consistent patterns when working with your codebase.

### Step 1: Create an agents.md file

Create an `agents.md` file in your project root. This file provides coding guidelines and patterns for AI assistants to follow.

```markdown
# Patterns

- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.

# Coding Guidelines

## TypeScript

- Only create an abstraction if it's actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression would suffice
- Don't use emojis
- No barrel index files - just export from the source files instead
- No type.ts files, just inline types or co-locate them with their related code
- Don't unnecessarily add `try`/`catch`
- Don't cast to `any`

## React

- Avoid massive JSX blocks and compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed

## Tailwind

- Mostly use built-in values, occasionally allow dynamic values, rarely globals
- Always use v4 + global CSS file format + shadcn/ui

## Next

- Prefer fetching data in RSC (page can still be static)
- Use next/font + next/script when applicable
- next/image above the fold should have `sync` / `eager` / use `priority` sparingly
- Be mindful of serialized prop size for RSC → child components
```

### Step 2: Configure your AI assistant

Most AI coding tools will automatically pick up files named `agents.md` or similar convention files in your project root. Check your specific tool's documentation for the exact configuration:

- **Cursor**: Uses `.cursor/rules/` directory or `agents.md` at project root
- **GitHub Copilot**: Can be configured with `.github/copilot-instructions.md`
- **Other tools**: Typically support project-level instruction files

The patterns in this file align with the structure used throughout fullstackrecipes, making it easier for AI assistants to generate consistent code.

---

## References

- [Cursor Rules Documentation](https://docs.cursor.com/context/rules-for-ai)
- [GitHub Copilot Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
