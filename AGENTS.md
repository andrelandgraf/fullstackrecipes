# Patterns

- Strictly follow the Functional Core, Imperative Shell pattern: separate application logic into two parts: a functional core with pure, side-effect-free functions for business rules and data transformation, and an imperative shell that handles impure actions like database I/O, network requests, or user input, making the core logic easily testable and modular
- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.
- Use the web platform: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

# Coding Guidelines

## Runtime and Package Manager

- Use Bun instead of Node.js, npm, pnpm, or vite.
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`.
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`.

## TypeScript

- Avoid `export default` in favor of `export` whenever possible.
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

# Dev Workflow

Follow these steps for every feature. Do not skip verification steps. Repeat the full verification flow for every additional code change.

1. Start on the latest `main` unless instructed otherwise (`git checkout main && git pull`).
2. Create a new feature branch.
3. Make the changes.
4. Run `bun run typecheck` and `bun run fmt`. Fix all type errors before moving on.
5. Verify code health with `bun run fallow`. Fix every issue (dead code, duplication, complexity, etc.) or add a `fallow-ignore` suppression if you judge the warning a false positive. Verify the codebase is clean before moving on.
6. Verify the changes with `agent-browser`. Address all UI/UX concerns before moving on. Confirm everything looks great and works.
7. Commit and push to the remote.
8. Check deployment logs. Fix any issues and redeploy via follow-up commits if anything breaks.
9. Check production with `agent-browser` to verify the changes shipped and look good in production too. Debug any issues via app logs and fix with follow-up commits.
10. For every additional code change, go through all verification steps again.
11. Once production looks good, report all changes.

## Using Fallow

Use Fallow for code health: identifying dead code, unused exports/dependencies, duplication, circular dependencies, and complexity hotspots.

After every code change, run `bun run fallow` to verify the codebase is healthy. If Fallow warns, investigate and judge the warnings. Fix them, iterate, or—if you decide to ignore one—add the appropriate `fallow-ignore` comment (or update the Fallow config) so the suppression is tracked.
