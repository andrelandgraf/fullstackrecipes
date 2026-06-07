# Coding Guidelines

- Strictly follow the Functional Core, Imperative Shell pattern: separate application logic into two parts: a functional core with pure, side-effect-free functions for business rules and data transformation, and an imperative shell that handles impure actions like database I/O, network requests, or user input, making the core logic easily testable and modular
- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.
- Use the web platform: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

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
- Avoid `enum` and other TypeScript features that fail type stripping (e.g. namespaces, parameter properties); prefer `as const` objects/unions instead

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
2. Make the changes.
3. Run `bun run typecheck` and `bun run fmt`. Fix all type errors before moving on.
4. Verify code health with `bun run fallow`. Fix every issue (dead code, duplication, complexity, etc.) or add a `fallow-ignore` suppression if you judge the warning a false positive. Verify the codebase is clean before moving on.
5. Verify the changes with `agent-browser`. Address all UI/UX concerns before moving on. Confirm everything looks great and works.
6. Commit and push to `main`. Pushing to `main` triggers the production deploy.
7. Check deployment logs. Fix any issues and redeploy via follow-up commits if anything breaks.
8. Check production with `agent-browser` to verify the changes shipped and look good in production too. Debug any issues via app logs and fix with follow-up commits.
9. For every additional code change, go through all verification steps again.
10. Once production looks good, report all changes.

## Delegating to Subagents

The orchestrating agent owns the intent-heavy, stateful, and destructive steps; delegate the noisy, verifiable, context-light steps to subagents with fresh context windows. This keeps the main context focused and avoids filling it with throwaway tokens (reports, screenshots, logs).

- **Keep in the main agent:** making the changes (step 2), committing and pushing (step 6), driving the per-change verification loop (step 9), and the final report (step 10). These hold the design intent or are deliberate/destructive actions that must be owned, not fired and forgotten.
- **Delegate to a "code health" subagent:** typecheck, format, and Fallow (steps 3–4). Hand it the diff; it fixes or suppresses issues and reports clean/dirty. This work is self-contained and burns tokens reading reports.
- **Delegate to a "verification" subagent:** `agent-browser` UI/UX checks against acceptance criteria (steps 5 and 8). It returns pass/fail plus screenshots instead of dumping navigation noise into the main window.
- **Delegate to a "deploy investigator" subagent:** reading deployment logs and diagnosing failures (step 7). It returns a root-cause summary rather than raw logs.

Give each subagent a self-contained brief with clear acceptance criteria, since it does not share the main conversation's history. Launch independent subagents in parallel when their tasks don't depend on each other.

## Dev Tooling

- Use `agent-browser` for interacting with browsers
- Use `fallow` to identify dead code and general code health. Don't blindly fix everything - if something seems fine you can always update the `.fallowrc.json` file or just ignore that specific report item.
