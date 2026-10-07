# GitHub operations

Use the installed `gh` CLI through `pnpm agent:github` for routine reads and file-based writes. It uses the existing `gh` authentication, no new MCP server or package. GitHub and the PR's Execution state remain authoritative. This helper does not approve, merge, close issues, reconcile labels or replace the broader automation in issue #648.

## Read the part needed

```bash
pnpm agent:github issue 723
pnpm agent:github issue 723 --full
pnpm agent:github pr 724
pnpm agent:github execution 724
pnpm agent:github queue
pnpm agent:github comments pr 724 --limit 3
```

Reads return JSON. Bodies and comment text are bounded to 1,800 characters per section or comment by default; `--max-chars N` changes that limit. `--full` removes text bounds but still respects the selected comment count or list limit. Truncated text carries `truncated: true`; comment results report omitted history. Ordinary item reads omit the complete body, comments and formal PR reviews. An empty acceptance or Execution state list means no matching Markdown heading was found, not that the issue has no requirements or the PR has completed.

The queue lists up to 20 open PRs, including non-queue PRs, with `possiblyMore: true` when the limit is reached. It is a snapshot, not an ownership or merge-readiness verdict. Missing rows do not prove merge or closure. Check states remain their actual values, including pending or failure. Read formal reviews, older governing comments, full criteria and missing evidence explicitly before implementing, reviewing or merging. GitHub mutations and decision authority still follow the coding workflow.

## Write from a body file

Save the exact Markdown in a file in your own worktree or `/tmp`, then preview:

```bash
pnpm agent:github create-issue --title "<outcome>" --body-file /tmp/issue.md --label needs-triage --label infra
pnpm agent:github comment issue 723 --body-file /tmp/update.md
pnpm agent:github comment pr 724 --body-file /tmp/review.md
```

Add `--apply` to send an authorized write. Dry-run returns the argument array and body character count; applied writes return only the resulting URL. Comments are ordinary GitHub comments, not approving PR reviews. Review records must still follow Finalization and include the pinned SHA and attribution.

Direct CLI equivalents are `gh issue create --title "<outcome>" --body-file /tmp/issue.md`, `gh issue comment 723 --body-file /tmp/update.md`, and `gh pr edit 724 --body-file /tmp/pr.md`. Avoid embedding multiline Markdown in a shell command. The helper invokes argument arrays without a shell and prints no credential values.

All helper commands accept `--repo [HOST/]OWNER/REPO`. Without it, `gh repo view` resolves the current checkout. `pnpm test:agent-github` runs fixture tests without writing to live GitHub; it is included in repository tests and the local unit gate.

Upstream references: [gh JSON formatting](https://cli.github.com/manual/gh_help_formatting), [issue creation](https://cli.github.com/manual/gh_issue_create), [issue comments](https://cli.github.com/manual/gh_issue_comment), [PR editing](https://cli.github.com/manual/gh_pr_edit), and [GraphQL requests](https://cli.github.com/manual/gh_api). Context7 verified these through `/websites/cli_github_manual` on 2026-10-07; installed CLI flags were checked with `--help`.
