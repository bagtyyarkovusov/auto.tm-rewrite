# Creation reference

Use GitHub-returned identifiers. Predicted issue numbers are display hints at most, never dependencies. The transaction-like sequence is canonical in `docs/agents/sprint-transitions.md`; this reference gives `create-sprint-issues`-specific execution notes.

## Before mutation

- Confirm the proposal in the current conversation.
- Recheck that labels exist, the Sprint plan is still mutable, and no competing sprint parent appeared.
- Record a local transition ledger under `/tmp` with planned items, result numbers, external boundaries, and verification state.

## Transaction-like sequence

Run the Sprint-start sequence from `docs/agents/sprint-transitions.md`. Keep `CREATION.md` out of the business of redefining status transitions, tasklist semantics, or dependency-label rules.

On failure, stop creating new items. Do not close or rewrite successfully created issues automatically. Show the ledger and propose the smallest repair.

## Roadmap start

Only after the GitHub issue set verifies:

- create a focused docs branch from current `main`;
- update the allowed Sprint-plan status metadata and the roadmap current-sprint block/sprint row to `🟡` with the actual date, parent, children, milestone, and sprint-doc link in one commit;
- do not change Sprint DoD, scope, risks, or acceptance criteria;
- stage only the Sprint plan and roadmap files;
- commit and push the docs branch; and
- open the already-authorized roadmap PR.

Do not merge without a separate user decision. If the roadmap PR cannot be opened, the issues remain valid; report the incomplete start transition explicitly with the ledger path and the exact repair.
