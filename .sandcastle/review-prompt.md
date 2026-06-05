# TASK

Review the changes on branch `{{BRANCH}}` against this repo's standards and the
issue's acceptance criteria. Improve clarity/correctness while preserving
behavior; fix real problems you find.

# CONTEXT

## Branch diff
!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits on this branch
!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW

1. **Intent + AC:** re-read the issue (`gh issue view <N>` — the number is in the
   branch name) and confirm the diff satisfies its `## Acceptance criteria`.
2. **House rules** (`.sandcastle/CODING_STANDARDS.md` + `CLAUDE.md`): no
   cross-context imports, domain framework-free, Prisma only in `infrastructure/`,
   one use-case per file, air-gap, no magic strings, UTC in DB.
3. **CONTEXT.md (ADR-0019):** if the diff changed a Prisma field / port /
   use-case / event / route, the relevant `CONTEXT.md` must be updated on this
   branch. If it isn't, add it.
4. **Library usage (Context7):** for any library touched, verify the API against
   current docs via `resolve-library-id` / `query-docs`; flag deprecated or
   incorrect usage.
5. **Correctness:** edge cases, unsafe casts / `any`, injection or credential
   leaks, unchecked assumptions.
6. **Clarity:** reduce needless complexity/nesting; avoid nested ternaries;
   prefer explicit code. Do NOT over-abstract or change what the code does.

# EXECUTION

If you make changes, run the gate for the touched workspaces:

```
pnpm exec turbo run typecheck lint test:unit --filter=<workspace>
```

then commit the refinements (end the message with
`Co-Authored-By: Kimi <noreply@kimi.com>`). If the code is already clean and
correct, do nothing.

Output `<promise>COMPLETE</promise>` when done.
