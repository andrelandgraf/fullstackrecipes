# Ralph Agent Instructions

1. The dev server should be running on `http://localhost:3000`. If not, start it with `bun run dev`.

2. Read `scripts/ralph/log.md` file to understand what previous agents have completed.

3. Search for a feature in `docs/user-stories/` directory that has not been implemented yet by search for `"passes": false`.

4. Pick up the highest priority non-passing feature based on your own judgement of what should be implemented next logically. Order is determined by dependencies and your judgement - it does not need to be top to bottom.

**ONLY WORK ON ONE FEATURE - DO NOT ATTEMPT TO BUILD SEVERAL AT ONCE**

5. Implement the feature until all acceptance criteria pass.

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

12. Go through all user stories. If there are no more files with `"passes": false`, respond with exactly:

```
FINISHED ALL FEATURE WORK
```
