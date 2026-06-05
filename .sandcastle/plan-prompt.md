# ISSUES

Open issues that are ready for autonomous work (already filtered to
`ready-for-agent` and NOT `blocked`):

<issues-json>

!`gh issue list --state open --label "ready-for-agent" --search "-label:blocked" --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# TASK

You are the **planner**. Read the issues above **once** and reason about them. Do
NOT re-run `gh`, `git log`, or other discovery commands in a loop — everything you
need is above. Produce one `<plan>` block and stop.

**Exclude parent PRD / dashboard issues.** A parent issue is titled like
`Sprint <N> — <name>` (e.g. "Sprint 4 — Listings CRUD") and has a `## Sub-issues`
checklist with no implementable prompt. Never put a parent in the plan — only
actionable vertical-slice (child) issues.

Build a dependency graph. Issue **B is blocked by** issue **A** if any of:
- B's `## Depends on` section lists A;
- B needs code/infrastructure that A introduces;
- B and A modify overlapping files/modules (concurrent work would conflict);
- B depends on an API shape or decision A establishes.

An issue is **unblocked** when it has zero blocking dependencies on other issues
in the list above. (The `blocked` label is already filtered out; still honor any
`## Depends on` references to issues that appear open in the list.)

For each unblocked issue, assign a branch named `sandcastle/issue-{number}-{slug}`
(`{slug}` = short kebab-case of the title).

# OUTPUT

Output the plan as JSON wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "94", "title": "S4: mobile — feed + detail", "branch": "sandcastle/issue-94-mobile-feed-detail"}]}
</plan>

Include only unblocked, actionable child issues. If every actionable issue is
blocked, include the single best candidate (fewest/weakest dependencies). If
there are none, output `<plan>{"issues": []}</plan>`.
