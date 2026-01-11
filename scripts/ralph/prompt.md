# Ralph Agent Task

Implement features from user stories until all are complete.

## Workflow Per Iteration

1. Read `scripts/ralph/log.md` to understand what previous iterations completed.

2. Search `docs/user-stories/` for features with `"passes": false`.

3. If no features remain with `"passes": false`:
   - Output: <promise>FINISHED</promise>

4. Pick ONE feature - the highest priority non-passing feature based on dependencies and logical order.

5. Implement the feature following TDD:
   - Write/update tests for the feature
   - Implement until all acceptance criteria pass
   - Generate and migrate DB schema if needed: `bun run db:generate && bun run db:migrate`
   - Format code: `bun run fmt`

6. Verify the feature:
   - Run typecheck: `bun run typecheck`
   - Run build: `bun run build`
   - Run tests: `bun run test`
   - Use Playwright MCP to interact with the app at `http://localhost:3000`

7. If verification fails, debug and fix. Repeat until passing.

8. Once verified:
   - Update the user story's `passes` property to `true`
   - Append to `scripts/ralph/log.md` (keep it short but helpful)
   - Commit with a descriptive message

9. The iteration ends here. The next iteration will pick up the next feature.

## Notes

- Dev server should be running on `http://localhost:3000`. Start with `bun run dev` if needed.
- Connected to test database - use migrate commands freely.
- Avoid interacting with database directly.

## Completion

When ALL user stories have `"passes": true`, output:

<promise>FINISHED</promise>
