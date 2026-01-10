# Ralph Agent Instructions

**CRITICAL: You must implement EXACTLY ONE feature per session. Never attempt to implement multiple features. After completing one feature, stop and let the next agent session handle the next feature.**

1. The dev server should be running on `http://localhost:3000`. If not, start it with `bun run dev`.

2. Read `scripts/ralph/log.md` file to understand what previous agents have completed.

3. Research `docs/user-stories/` directory for features that have not been implemented yet by searching for `"passes": false`.

4. Pick ONE feature - the highest priority non-passing feature based on your own judgement of what should be implemented next logically. Order is determined by dependencies and your judgement - it does not need to be top to bottom.

5. Implement that single feature until all acceptance criteria pass.

Make sure to generate and migrate the db schema if needed:

```bash
bun run db:generate
bun run db:migrate
```

You're connected to a test database, so make use of the migrate command. Avoid interacting with the database directly.

6. Write tests for the feature. Follow the current test file structure and write tests for the feature.

7. Format the code: `bun run fmt`

8. Verify the feature by doing the following steps:

- Run typecheck: `bun run typecheck`
- Run build: `bun run build`
- Run tests: `bun run test`

9. Use the Playwright MCP server to interact with the application and verify the feature.

10. Once it passes, update the user story file's `passes` property to `true`.

11. Append to `scripts/ralph/log.md` with your changes to inform the next agent what you did - keep it short but helpful.

12. Commit your changes with a descriptive commit message summarizing the feature you implemented.

13. **STOP HERE.** Do not continue to implement more features. Go through all user stories. If there are no more files with `"passes": false`, respond with exactly:

```
FINISHED ALL FEATURE WORK
```

Otherwise, stop and let the next agent session pick up the next feature.
