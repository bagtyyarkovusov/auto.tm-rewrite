---
name: run-batch
description: Implement several issues in this cache-warm orchestrator session on one batch branch and PR, with one batch-reviewer round (ADR-0094 trial).
argument-hint: "[issue numbers, or the founder's batch description]"
arguments:
  - batch
disable-model-invocation: true
---

# Run a batch

This session is the implementer and the orchestrator. [ADR-0094](../../../docs/adr/0094-one-orchestrator-implements-batched-pull-requests-trial.md) governs the trial; [AGENTS.md](../../../AGENTS.md) and the [coding workflow](../../../docs/agents/coding-workflow.md) apply where this skill is silent. Keep the context **lean**: every turn rereads all of it.

## 1. Fix the batch

1. Take the founder's issues, or select from a founder-delegated outcome ([ADR-0087](../../../docs/adr/0087-founder-delegated-outcome-orchestration.md)). Read each issue, its comments, dependencies and any branch or PR. Skip and report an issue that is closed, owned by another open branch or PR, or blocked on a human.
2. Split by risk: a migration, an authentication or authorization change, or a published API contract change gets its own batch. Estimate size, and keep each batch near 800 to 1,000 changed lines excluding tests.
3. Record measurement start: `mcp__ccd_session_mgmt__get_usage` (5-hour and weekly percentages) and the time. This read measures; it never decides whether to start.

Done when every selected issue is in exactly one batch, with its order and a reason it belongs.

## 2. Reserve

1. From `origin/main`, create `agent/batch-<n>-<slug>`, where `<n>` counts trial batches from 1, and push it before editing.
2. After the first checkpoint, open one draft PR. Its body has a `Closes #<N>` line per issue, then one `Execution state` in the [usual shape](../run-issue/EXECUTION-STATE.md) with a row per issue (status, last commit, acceptance evidence) and a `Measurement` line.
3. Comment the PR link on each issue.

## 3. Implement, issue by issue

For each issue in order:

1. Follow [acceptance evidence](../run-issue/VERIFICATION.md#acceptance-evidence): the failing test first, then the smallest complete change.
2. Commit with the issue number in the message, run the focused checks, push, and update the issue's row.
3. Hand heavy, isolated exploration (a native build investigation, a wide search) to a subagent when it would flood this context.

Keep output lean: send builds, test runs and logs to a file and read them with `tail` or `grep`; read the file ranges you need.

Done when every row shows its criteria met with evidence, or the issue is moved out of the batch with the reason recorded.

## 4. Verify and document

1. Run the [verification gates](../run-issue/VERIFICATION.md) for the whole batch.
2. Put docs changes in the batch. Run the docs checks and affected lint locally, then push docs together with code in one push.
3. Record the final verified SHA.

## 5. Review once

1. Launch one fresh `batch-reviewer` agent, pinned to the verified SHA, with the PR number and the issue list. Never a fork of this session.
2. Post its report in one PR comment, in the [review comment shape](../run-issue/FINALIZATION.md#independent-review) with one combined `Standards + Spec` section.
3. Read the reviewer's fix commits. Confirm each stays within its finding, and rerun the affected local gates.
4. Fix the findings it left, in one round, yourself. Send a product or architecture question to the founder.
5. Record each finding in `Execution state` as `fixed in <sha>`, `deferred to <issue>` or `rejected: <reason>`. Nothing re-reviews.

## 6. Merge and measure

1. Write the [ready PR body](../run-issue/FINALIZATION.md#ready-pr), then follow [checks and merge](../run-issue/FINALIZATION.md#checks-and-merge).
2. After the merge, confirm every issue closed through its `Closes` line, then follow the [integrity and sync](../run-issue/FINALIZATION.md#integrity-and-sync) steps.
3. Record measurement end in the PR body: plan usage, and the tokens of this session and the reviewer since batch start, summed from their transcript JSONL `message.usage` fields and de-duplicated by `message.id` (input, cache write, cache read, output).

Done when the batch is merged, its issues are closed, and the `Measurement` line is filled.

## Session lifecycle

- At a batch boundary, or once earlier context has stopped being useful, suggest `/compact` to the founder. Warn before auto-compaction would start.
- When the 5-hour plan limit reaches 95 percent, stop at a checkpoint and write a handoff into the PR's `Execution state` and `tmp/handoff-<slug>.md`.
- Other sessions work only in areas an open batch does not touch.

## Trial end

After batch 3, compare tokens per merged issue with ADR-0085's baseline (about 750,000 tokens for PRs #704 and #708) and list escaped defects: bugs found after merge in code a batch touched. Report to the founder for the follow-up ADR.
