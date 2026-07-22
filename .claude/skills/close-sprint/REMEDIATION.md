# Remediation and delivery

Apply only proposals the user approved after seeing the audit and draft.

## Allowed writes

- New retro at the canonical sprint-retro path when none exists.
- A dated append-only addendum to an existing retro when explicitly approved.
- Factual `CONTEXT.md` or `CONTEXT-MAP.md` corrections that match code today.
- Factual roadmap closure metadata or shipped-log corrections.
- Mutable feature/flow/UI docs when evidence shows their target/current mirror is factually stale and the change does not alter capability.

## Forbidden writes

- Merged ADRs; write a new ADR instead.
- `GRILL-OUTCOME.md`; charter revision requires its own grill.
- A sprint plan after its row became `🟡`.
- Existing retro history other than an appended dated correction.
- GitHub issue/PR/label state.

## Delivery gates

1. Show the exact file plan and receive write approval.
2. Write, validate links/format, and show the diff.
3. Receive branch/commit approval; create one focused docs branch and logical commits.
4. Receive push approval.
5. Receive PR-creation approval; open a reviewable PR with the audit evidence.
6. Receive merge approval after checks. Never self-approve or fall back to an immediate merge.

Preserve the branch and report exact state on any failure.
