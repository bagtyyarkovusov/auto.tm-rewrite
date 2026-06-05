# TASK

Merge these branches into the current branch (`{{SOURCE_BRANCH}}`):

{{BRANCHES}}

For each branch, in order:
1. `git merge <branch> --no-edit`
2. Resolve any conflicts by reading both sides and choosing the correct
   resolution (respect `CLAUDE.md` + each context's `CONTEXT.md`).
3. After resolving, run `pnpm exec turbo run typecheck --filter=<affected>` to
   confirm the merge still typechecks.

**Do NOT run the Testcontainers e2e suite or build images here.** The full
`pnpm test` (e2e included) runs on CI (`pr-checks.yml` / `ci.yml`, self-hosted
`tm-proxy` runner) once the merge reaches GitHub — that is the e2e gate (D1).

After all merges, make a single commit summarizing the merge (end the message
with `Co-Authored-By: Kimi <noreply@kimi.com>`).

# CONTEXT.md CHECK (ADR-0019)

Before closing each issue, confirm its branch updated the relevant `CONTEXT.md`
to reflect what shipped. If a merged branch added a Prisma field / port /
use-case / event / route without updating `CONTEXT.md`, patch it now.

# CLOSE ISSUES

Close ONLY the child issues that were merged — **never a parent PRD or
`Sprint <N> —` dashboard issue** (those are closed by a separate sprint-final
wiring issue, not by sandcastle):

`gh issue close <child-ID> --comment "Completed by Sandcastle (branch <branch>)."`

Merged issues:

{{ISSUES}}

# MOBILE

If any merged branch touched `apps/mobile`, note in the merge commit (or an
issue comment) that those screens still need the **human Expo simulator gate**
(`docs/agents/mobile-expo.md`) — it cannot run in a headless sandbox (D2).

Output `<promise>COMPLETE</promise>` once everything mergeable is merged.
