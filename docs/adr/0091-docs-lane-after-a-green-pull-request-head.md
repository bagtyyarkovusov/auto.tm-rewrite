# ADR-0091: Docs lane after a green pull request head

- **Status**: Accepted
- **Date**: 2026-10-08
- **Deciders**: AutoTM founder, recorded in [issue #753](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/753)

## Context

A pull request that changes only Markdown or files under `docs/` already runs the short docs lane. A pull request with code changes runs the full pipeline again when an agent later pushes documentation or evidence. Merging `main` also restarts that pipeline when the only file resolved by hand was documentation.

The founder decided on 2026-10-08 that documentation work should not spend another full hosted run. The full pipeline runs when code it tests has changed since the last green check.

## Decision

The required `pr` job keeps running on every pull request update. Its existing all-docs rule stays in place. On a `pull_request` synchronize event, it also takes the docs lane when the event's previous head is an ancestor of the new head, its latest `pr` check succeeded for the same pull request, and every path changed by hand since that head is documentation.

For ordinary commits, inspect each commit's changes. For a two-parent merge, require the other parent to be on `main`. Reconstruct the automatic merge of the parents with `git merge-tree --write-tree`, then compare that tree with the committed tree. Code arriving unchanged from `main` does not count as a hand change. Conflicted files count even when the automatic tree kept one side, as can happen with binary files. A hand change or conflict in any non-docs path requires the full lane.

The workflow reads the previous head from the synchronize payload's top-level `before` field. It adds only `checks: read` to its existing `contents: read` permission. It checks the GitHub API result for the exact previous head and pull request. A failed, cancelled, running, missing, unreadable or ambiguous check requires the full lane.

The checkout remains GitHub's synthetic merge commit at depth 2. That depth includes the PR head but leaves its own parents shallow. The script fetches the exact event SHAs and deepens history only until it can prove ancestry and reconstruct merges. It stops after at most 255 extra history levels. Missing history, a fetch failure, a force-push, an unsupported event, a merge from outside `main`, or an octopus merge requires the full lane. Fork inputs use the full lane unless the existing all-docs rule applies.

A green docs run can support the next docs update in the same way. Each update proves its hand changes against a previous head that was itself green.

## Consequences

### Positive

- Documentation, evidence and Execution-state commits after a green code head use the short lane.
- Resolving documentation while merging `main` uses the short lane when code arrives unchanged from that branch.
- The required check still runs and verifies the lane script and documentation.

### Negative / accepted costs

- After a merge from `main`, the combined code is not tested before merge. This is already true for non-conflicting pull requests because branch protection does not require an up-to-date branch, with `strict: false`.
- Turning on strict up-to-date branches reverses this decision. Before enabling `strict`, remove the merge-from-main shortcut so the combined code receives the required full test run.
- Unavailable checks or history can spend a full run on documentation. That cost is preferable to skipping code tests without proof.

### Neutral

- This decision changes neither branch protection nor the `pr` job name.
- Agents push documentation, evidence and Execution-state commits separately from code, after the code head is green.

## Alternatives considered

- **Always inspect the whole PR diff**: repeats the full pipeline for documentation added after tested code.
- **Trust a docs-only last-commit diff**: cannot prove an earlier pushed commit or a merge resolution left code unchanged.
- **Skip the required check entirely**: loses the required check and documentation validation.

## References

- [Founder decision and acceptance criteria, issue #753](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/753)
- [ADR-0075: Hosted container-test evidence](0075-railway-pr-backends-for-agent-native-sessions.md)
- [Coding workflow](../agents/coding-workflow.md)
- [GitHub pull request workflow and synthetic merge behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)
- [GitHub's synchronize payload schema, `webhook-pull-request-synchronize`](https://github.com/github/rest-api-description/blob/main/descriptions/api.github.com/api.github.com.json)
- [GitHub check-runs API and read permission](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference)
- [Git automatic merge output and conflict status](https://git-scm.com/docs/git-merge-tree)
