---
description: Pre-implementation design phase for UI-heavy issues. Foundation check → wireframe + hi-fi via two design subagents collaborating with a read-only oracle subagent → handoff → auto-merge docs PR → user runs /run-issue next.
---

# AutoTM — Design grill (pre-implementation)

> **Invocation:** `/design-grill [ISSUE_NUMBER]` — `$ARGUMENTS` is the issue number.
>
> - If `$ARGUMENTS` is a valid issue number, use it as **N**.
> - If `$ARGUMENTS` is empty, list ready-for-agent UI-shipping issues and ask the user to pick.
>
> You (the assistant in this Claude Code session) are the orchestrator. You will dispatch four subagent roles via the `Task` tool. You do NOT write design specs or PRD edits yourself — the subagents do. Your job is to drive the loop, collect outputs, and decide when to advance phases.

---

## 0. Hard rules (non-negotiable)

- **Never edit:** `GRILL-OUTCOME.md`, `docs/adr/*` (immutable after merge), `.env`, `*.pem`, `*.key`, `*-private-key.json`. `.env.template` and `.env.example` ARE editable.
- **Never** open a PR before the docs PR step (§6). The grill phase commits only on the grill branch.
- **Never** dispatch the oracle subagent with anything other than `subagent_type: Explore` — this enforces read-only by tool construction.
- **Never** continue past the foundation evaluator's "needs NEW foundation issue" verdict — halt and ask the user to run `/to-issues` for the foundation, then re-run `/design-grill` after it lands.
- **Never** modify labels on any issue other than #N during this run.

---

## 1. Read these first

You don't read source code in this command — you orchestrate subagents. Read only what you need to invoke them well:

1. `CLAUDE.md` — repo policy (so your subagent prompts inherit it)
2. `docs/agents/issue-tracker.md` — issue body conventions
3. `docs/prd/ui/70-design-principles.md` — design classification heuristics
4. `.claude/commands/wireframe.md` — the existing wireframe skill (your wireframer subagent will lean on this)
5. `.claude/commands/hifi-design.md` — the existing hi-fi skill (your hi-fi subagent will lean on this)

If any of these are missing, stop and tell the user.

---

## 2. Pick the issue / resolve N

**Branch A — `$ARGUMENTS` is a number:** use it as **N**. Skip to verify-state.

**Branch B — `$ARGUMENTS` is empty:** list ready-for-agent UI-shipping candidates:

```bash
gh issue list \
  --label "ready-for-agent" \
  --search "is:open" \
  --json number,title,labels \
  --jq '.[] | select(.labels | map(.name) | any(. == "mobile" or . == "web" or . == "admin"))
        | "#\(.number)  [\(.labels | map(.name) | join(","))]  \(.title)"'
```

Print the list. Ask: *"Which issue should I grill? Reply with the number."* Wait for the reply.

**Verify state:**

```bash
gh issue view $N --json state,labels,body,title > /tmp/issue-$N.json
```

Confirm:
- `state == "OPEN"`
- `labels` contains at least one of `mobile`, `web`, `admin` (this command is for UI-shipping issues)
- `body` has `## Files to create / modify`, `## Acceptance criteria`, `## Read first`

If the issue doesn't ship UI, tell the user `/design-grill` is for UI issues and suggest `/run-issue` directly.

---

## 3. Foundation evaluation (Explore subagent)

Dispatch ONE Explore subagent to evaluate whether the issue's foundation is in place. Explore is read-only by tool construction (no Edit, Write, NotebookEdit, or Agent).

```
Task tool:
  description: "Foundation evaluation for #<N>"
  subagent_type: Explore
  prompt: |
    You are evaluating whether the foundation for AutoTM issue #<N> is in place.

    ## Issue body

    [paste the full body from /tmp/issue-<N>.json]

    ## Your job

    Inspect the repo (read-only) and decide ONE of three outcomes:

    1. NO_FOUNDATION_NEEDED — every dep, scaffold, primitive, port, type, and config
       the issue references already exists in tree (or in another open issue's `##
       Files to create / modify` that the issue lists in `## Depends on`).

    2. FOUNDATION_IN_FLIGHT — the foundation is being built in another open issue
       (#X) that is correctly listed in the issue body's `## Depends on`. The design
       phase can proceed in parallel (designs are pure docs); the IMPLEMENTATION
       phase via /run-issue must wait for #X to merge. Identify #X.

    3. NEEDS_NEW_FOUNDATION — there's a real prerequisite that's NOT yet captured
       as an issue. Examples: a new mobile area with no deps installed, no RNR
       primitives, no apiClient wrapper; a new API context with no module
       scaffold; a contracts package that doesn't exist yet.
       Apply this verdict CONSERVATIVELY: only when unambiguous. Default to one
       of the first two if you're unsure.

    ## Verdict criteria (be specific)

    - For mobile UI: check apps/mobile for RNR primitives (Button, Input, Select,
      Switch), check package.json for required Expo deps, check
      apps/mobile/src/api/client.ts existence, check apps/mobile/src/listings/api
      shape, check that the wizard scaffolding from earlier issues exists.
    - For API: check apps/api/src/modules/<ctx> existence, check ports under
      domain/ports/, check Prisma schema fields referenced in ACs.
    - For web/admin: check page directory shape, shared components in
      packages/ui, contracts package types.

    ## Output (machine-readable at end)

    Print human-readable analysis, then end with EXACTLY ONE of these blocks:

    ```
    <verdict>NO_FOUNDATION_NEEDED</verdict>
    ```

    or

    ```
    <verdict>FOUNDATION_IN_FLIGHT</verdict>
    <blocker-issue>#<number></blocker-issue>
    ```

    or

    ```
    <verdict>NEEDS_NEW_FOUNDATION</verdict>
    <proposed-issue-title><title></proposed-issue-title>
    <proposed-issue-summary>
    <2-3 sentence summary of what the foundation issue needs to ship>
    </proposed-issue-summary>
    ```

    ## Report format

    Status: DONE | NEEDS_CONTEXT | BLOCKED
    Verdict: <one of the three>
    Reasoning: <1-2 paragraphs of why>
    Evidence: <file:line citations supporting the verdict>
```

Parse the verdict from the subagent's report.

**Handle the verdict:**

- `NO_FOUNDATION_NEEDED` → proceed to §4.
- `FOUNDATION_IN_FLIGHT` → print a notice to the user: *"Foundation is in flight on #X. Design grill can proceed (pure docs); implementation will wait for #X to merge before /run-issue can pick this up."* Then proceed to §4.
- `NEEDS_NEW_FOUNDATION` → print the proposed issue title + summary to the user. Ask: *"Should I scaffold this foundation issue via `/to-issues`? (yes / no / let me write it myself)"*
  - If `yes` — invoke `/to-issues` with the proposed body. After it returns the new issue number, halt this command and tell the user: *"Foundation issue #M created. Re-run `/design-grill $N` after #M is closed."*
  - If `no` or `let me write it myself` — halt this command. Don't open a grill branch.

---

## 4. Grill branch + design specs (multi-agent loop)

### 4.1 Identify the screen(s) that need design

From the issue body's `## Files to create / modify`, identify every distinct screen this issue ships. Use the heuristic from `run-issue.md` §3.5.2 (slugify by file path).

For each screen, classify with the decision tree from `docs/prd/ui/70-design-principles.md` (or `run-issue.md` §3.5.4). Skip screens classified as "SKIP design step." For the remaining, list:
- `<slug>` (kebab-case)
- `wireframe needed: yes/no` (always yes if classified at all)
- `hi-fi needed: yes/no` (per decision tree)

If zero screens need design, tell the user `/design-grill` has nothing to do and they should `/run-issue $N` directly. Stop.

### 4.2 Create the grill branch

```bash
git checkout main
git pull origin main
git checkout -b design/issue-$N
```

If `design/issue-$N` already exists (resume case), `git checkout design/issue-$N` and continue.

### 4.3 Wireframe phase (one designer subagent, internally calling the oracle)

Dispatch ONE general-purpose subagent as the wireframe designer. It has full Write access to `docs/prd/ui/wireframes/**` and `docs/prd/**` PRD edits, but is INSTRUCTED to dispatch the oracle subagent (Explore) for any gap it can't answer from its own reading.

```
Task tool:
  description: "Wireframe phase for #<N>"
  subagent_type: general-purpose
  prompt: |
    You are the WIREFRAME DESIGNER for AutoTM issue #<N>: <title>.

    ## Working directory
    /Users/bagtyyar/Projects/auto.tm-rewrite (currently on branch design/issue-<N>)

    ## Issue body
    [paste the full body]

    ## Screens you must wireframe (from §4.1 above)
    - <slug-1>: <path>
    - <slug-2>: <path>
    - ...

    ## Your job

    Produce a wireframe spec at `docs/prd/ui/wireframes/<slug>.md` per screen using the
    existing `.claude/commands/wireframe.md` skill as a template. Run the wireframe
    skill ONCE PER SCREEN — invoke it via Skill tool with the screen slug as the
    argument. The skill is mobile-first, brand-aware, and anti-pattern-free.

    ## The grill loop (this is the important part)

    Before/while writing each wireframe, identify GAPS — questions you can't answer
    from your own reading of the issue body + linked docs. Examples:

    - "What's the loading state of the photo gallery when the network is slow?"
    - "Should the price display animate when the FX rate changes mid-session?"
    - "Is there a 'sold' indicator on the listing card in My Listings, or just in
       the detail page?"

    For EACH gap, dispatch ONE Explore subagent (read-only) to answer it:

    ```
    Task tool:
      description: "Oracle: <one-line question>"
      subagent_type: Explore
      prompt: |
        You are the ORACLE for AutoTM issue #<N>. You answer design questions
        from documentation only. You have read-only access by tool construction.

        ## Your scope (whitelist — refuse to grep outside)
        - docs/prd/**
        - docs/adr/**
        - docs/agents/**
        - GRILL-OUTCOME.md
        - apps/*/CONTEXT.md
        - apps/api/src/modules/*/CONTEXT.md

        Do NOT read application source (apps/*/src/**, packages/*/src/**). If a
        question requires source-code knowledge to answer, say so — the
        wireframer must NOT inherit today's implementation as truth.

        ## Issue context (for grounding)
        [issue body]

        ## The question (verbatim)

        <single specific gap question>

        ## How to answer

        Cite file:line evidence for every claim. If the docs are silent or
        contradictory, say "DOC_GAP: <what the docs need to say>" — the
        wireframer will then propose a doc edit to fill the gap.

        ## Output

        Plain prose answer (≤200 words) with file:line citations. End with:
          <oracle-verdict>ANSWERED|DOC_GAP|UNANSWERABLE</oracle-verdict>
    ```

    Use the oracle's answer to inform the wireframe. If `DOC_GAP`, propose a
    minimal edit to the relevant PRD/CONTEXT.md/sprint file. Commit the doc edit
    separately from the wireframe so the PR history reads cleanly.

    ## Editing rules

    - Write to `docs/prd/ui/wireframes/<slug>.md` per screen.
    - You MAY edit PRDs in `docs/prd/**` to fix DOC_GAPs you identify — but only
      additions / clarifications, never deletions of merged decisions.
    - You MAY edit relevant `CONTEXT.md` files if the wireframe implies a UI
      invariant change.
    - You MAY NOT edit anything under §0 hard rules (ADRs, GRILL-OUTCOME.md,
      etc.) — comment a TODO and surface in your report instead.

    ## Commits

    Make TWO commits if both apply:
    1. `docs(prd): clarify <gap> in <prd-file>` — for any DOC_GAP fixes
    2. `docs(wireframe): <screen-slug>` — for the wireframe spec itself

    Use the repo's Conventional Commit style. Include `Co-Authored-By: Claude
    Opus 4.7 <noreply@anthropic.com>`.

    ## Loop termination

    Iterate (oracle call → wireframe section → oracle call → ...) until every
    screen has a complete wireframe AND your "open questions" list is empty.

    ## Report format

    Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Files created: <list with line counts>
    - Commits made: <SHAs and one-line messages>
    - Oracle calls: <count + brief summary of each>
    - Open questions: <any unresolved — should be empty for DONE>
    - DOC_GAPs filled: <list of PRD edits made>
```

After the wireframer reports DONE, verify:
- Every classified screen has a wireframe file
- `git log --oneline design/issue-$N` shows the expected commits
- `git diff main..design/issue-$N --stat` is the expected set of changes

If anything's off, dispatch a fix subagent (general-purpose) with the specifics.

### 4.4 Hi-fi phase (second designer subagent)

Only run for screens classified as "needs hi-fi." Dispatch ONE general-purpose subagent as the hi-fi designer:

```
Task tool:
  description: "Hi-fi phase for #<N>"
  subagent_type: general-purpose
  prompt: |
    You are the HI-FI DESIGNER for AutoTM issue #<N>: <title>.

    ## Working directory
    /Users/bagtyyar/Projects/auto.tm-rewrite (on branch design/issue-<N>)

    ## Issue body
    [paste]

    ## Screens needing hi-fi
    - <slug-1>: existing wireframe at docs/prd/ui/wireframes/<slug-1>.md
    - <slug-2>: existing wireframe at docs/prd/ui/wireframes/<slug-2>.md

    ## Your job

    Produce a hi-fi spec at `docs/prd/ui/hifi/<slug>.md` per screen using
    `.claude/commands/hifi-design.md` as your template. Read the corresponding
    wireframe FIRST — your hi-fi is downstream of it.

    ## The grill loop

    Same pattern as the wireframer: identify gaps, dispatch the oracle (Explore
    subagent, read-only, whitelist scope), fold answers into the hi-fi.

    Hi-fi-specific gaps you should grill on:
    - Exact token names from @auto-tm/ui/tokens for colors/spacing
    - Motion specs (durations, easings)
    - Accessibility (contrast ratios, focus rings, screen reader labels)
    - Dark mode behavior (token mapping)
    - Trilingual copy (English/Russian/Turkmen) when the brand voice doc covers it
    - Empty/loading/error/offline states

    ## Editing rules (identical to wireframer)

    Write to `docs/prd/ui/hifi/<slug>.md` per screen. May fix DOC_GAPs in PRDs.
    Hard rules (§0) still apply.

    ## Commits

    1. `docs(prd): clarify <gap>` — for any DOC_GAP fixes
    2. `docs(hifi): <screen-slug>` — for the hi-fi spec

    ## Report format

    Same as wireframer's. Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT.
```

### 4.5 Sanity check

After both phases:
```bash
git -C /Users/bagtyyar/Projects/auto.tm-rewrite log --oneline main..design/issue-$N
git -C /Users/bagtyyar/Projects/auto.tm-rewrite diff main..design/issue-$N --stat
```

Confirm every screen has both wireframe and hi-fi (where required). Confirm no protected files were touched.

---

## 5. Handoff

Invoke the `handoff` skill via the Skill tool with this argument summary:

```
/handoff Design grill complete for #<N>: <title>.

Wireframes: <list of slugs>
Hi-fi specs: <list of slugs>
Doc updates: <list of PRD edits made>

Next: /run-issue $N picks up implementation in subagent-driven mode
(specs now in tree). Branch agent/issue-$N will be created from
updated main after this docs PR merges.
```

The handoff skill produces a context dump file. Save the path; pass it to the user.

---

## 6. Docs PR + auto-merge

```bash
git -C /Users/bagtyyar/Projects/auto.tm-rewrite push -u origin design/issue-$N
gh -R <owner>/<repo> pr create \
  --base main \
  --head design/issue-$N \
  --title "docs(design): wireframes + hi-fi for #$N" \
  --body "$(cat <<'EOF'
Design grill output for #$N. Pure docs — no code changes.

## Wireframes
- <list of wireframe file paths>

## Hi-fi specs
- <list of hi-fi file paths>

## Doc updates
- <list of PRD/CONTEXT.md edits with one-line rationale each>

## Next
After this merges, run `/run-issue $N` to implement against these specs.
The run-issue command auto-detects design specs and switches to
subagent-driven mode for UI work.
EOF
)"
```

Capture the PR URL. Then auto-merge if all checks are green:

```bash
gh pr merge --squash --auto --delete-branch "$PR_URL" || \
  echo "Auto-merge couldn't enable (probably no required checks). Falling back to immediate merge."
gh pr merge --squash --delete-branch "$PR_URL"
```

After merge, sync local main:

```bash
git checkout main
git pull origin main
git branch -D design/issue-$N
```

---

## 7. Next step

Print a single concise block to the user:

```
Design grill for #<N> complete.

Wireframes:
  - docs/prd/ui/wireframes/<slug-1>.md
  - docs/prd/ui/wireframes/<slug-2>.md
Hi-fi specs:
  - docs/prd/ui/hifi/<slug-1>.md
  - docs/prd/ui/hifi/<slug-2>.md

Foundation: <NO_FOUNDATION_NEEDED | FOUNDATION_IN_FLIGHT on #X>
Docs PR: <merged | URL>
Handoff: <path to handoff file>

Next: run /run-issue <N> when ready.
  - If FOUNDATION_IN_FLIGHT on #X, wait for #X to merge first.
  - /run-issue will auto-detect the design specs and use
    subagent-driven implementation.
```

Then stop. Don't invoke /run-issue automatically — the user decides timing.

---

## 8. Bail conditions

Stop and tell the user when:

- Foundation evaluator returns `NEEDS_NEW_FOUNDATION` and the user declines to create the foundation issue.
- A designer subagent reports `BLOCKED` after a fix re-dispatch.
- A protected file would be touched.
- `gh pr create` or `gh pr merge` fails — leave the grill branch pushed, tell the user the PR URL (or branch name) and bail.

On bail:
```bash
gh issue comment $N --body "$(cat <<'EOF'
## Design grill bailed

**Reason:** <one sentence>

**State left behind:**
- Branch: `design/issue-$N` (preserved <locally | on remote>)
- Files touched: <list>
- Last failing step: <step name>

**Suggested next step:** <one sentence — what a human should check>
EOF
)"
```

Print a `BAILED` summary to the user. Stop.

---

## Tooling reference (what you, the orchestrator, use)

- `Bash` for every `git`, `gh` invocation
- `Task` for dispatching the 4 subagent roles:
  - Foundation evaluator → `subagent_type: Explore`
  - Wireframe designer → `subagent_type: general-purpose`
  - Hi-fi designer → `subagent_type: general-purpose`
  - Oracle (dispatched BY the designer subagents) → `subagent_type: Explore`
- `Skill` for `/handoff`

The oracle's read-only nature is enforced by `Explore`'s tool restrictions (no Edit, Write, NotebookEdit, Agent). Do NOT use `general-purpose` for the oracle even if a designer subagent asks you to — that would break the isolation guarantee.

End of prompt.
