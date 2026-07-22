# Creation reference

Use GitHub-returned identifiers. Predicted issue numbers are display hints at most, never dependencies.

## Before mutation

- Confirm the proposal in the current conversation.
- Recheck that labels exist and no competing sprint parent appeared.
- Record a local creation ledger with planned item, result number, and verification state under `/tmp`.

## Transaction-like sequence

1. Create the parent with phase + feature labels and capture its URL/number.
2. Create dependency-free children first.
3. Continue in topological order. Use actual blocker numbers in each `## Depends on` section.
4. Apply `ready-for-agent` or `ready-for-human`; add `blocked` only for open issue dependencies.
5. Update the parent tasklist with actual child numbers.
6. Re-fetch every created issue and verify the rendered body and labels.
7. If a dependent body could not know a later sibling number, patch it only after that sibling exists and verify again.

On failure, stop creating new items. Do not close or rewrite successfully created issues automatically. Show the ledger and propose the smallest repair.

## Roadmap start

Only after the GitHub issue set verifies:

- create a focused docs branch from current `main`;
- update the roadmap current-sprint block and the sprint row to `🟡` with the actual date, parent, children, milestone, and sprint-doc link;
- do not change the now-locked sprint plan;
- stage only the roadmap;
- commit and push the docs branch; and
- open the already-authorized roadmap PR.

Do not merge without a separate user decision. If the roadmap PR cannot be opened, the issues remain valid; report the incomplete start transition explicitly.
