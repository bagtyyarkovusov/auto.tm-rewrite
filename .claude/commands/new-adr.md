---
description: Scaffold a new Architecture Decision Record at docs/adr/. Auto-numbers from the highest existing ADR, slugifies the topic from $ARGUMENTS, fills in the standard template (Context / Decision / Consequences / Alternatives / References), and offers to open a PR (ADRs are immutable after merge — PRs are the right rhythm).
---

# AutoTM — New ADR

> **Invocation:** `/new-adr <short-name-or-topic>` — `$ARGUMENTS` is the topic (free text). Examples:
>
> - `/new-adr media variant strategy`
> - `/new-adr fcm fallback transport`
> - `/new-adr saved-search match algorithm`
>
> If `$ARGUMENTS` is empty, ask the user for a short topic. **Do not invent one.**
>
> You are a Claude Code agent running in `/Users/bagtyyar/Projects/auto.tm-rewrite`. The user wants to capture an architectural decision **before** code lands that depends on it. Your job is to write the file with maximum signal in the Context + Decision sections, then hand off to the user to fill in remaining details and either commit directly or open a PR.

---

## 0. Hard rules (non-negotiable)

- **Never edit an existing ADR.** ADRs are immutable after merge (per `CLAUDE.md`). If `$ARGUMENTS` matches an existing ADR's topic, refuse and tell the user to write a superseding ADR instead.
- **Never assign a status other than `Proposed`** at scaffold time. The user flips it to `Accepted` (or `Rejected` / `Superseded`) when the ADR is reviewed.
- **Never auto-fill Decision content if you don't have enough conversation context.** A blank `Decision` section with explicit `<TODO>` markers is better than an invented decision.
- **Never commit + push without an explicit user `yes`.** ADRs land via PR — even from a solo maintainer, the PR is the artifact that proves "this was reviewed" in the audit trail.

---

## 1. Read these first

1. `CLAUDE.md` — agent policy
2. `docs/adr/README.md` (if it exists) — ADR conventions for this repo
3. `docs/adr/` directory listing — to know the next number and the format conventions
4. The most recent ADR (e.g., `docs/adr/0011-version-deltas.md`) — to mirror its shape exactly

---

## 2. Resolve the topic

**If `$ARGUMENTS` is non-empty:** treat it as the topic.

**If `$ARGUMENTS` is empty:** ask: *"What's the topic? (short noun phrase, e.g., 'media variant strategy')"* Wait for the answer.

Slugify the topic into a filename component:

- Lowercase
- Spaces → `-`
- Strip non-alphanumeric except `-`
- Trim leading/trailing `-`
- Truncate to 60 chars

Examples:
- `Media Variant Strategy` → `media-variant-strategy`
- `FCM fallback transport` → `fcm-fallback-transport`
- `Saved-search match algorithm (v1)` → `saved-search-match-algorithm-v1`

Refuse to proceed if the slug ends up empty or only contains numbers.

---

## 3. Determine the next ADR number

```bash
ls docs/adr/ | grep -oE '^[0-9]+' | sort -n | tail -1
```

Pad with `printf '%04d'` to four digits. The next ADR is `<that + 1>`.

```bash
NEXT_NUM=$(printf '%04d' $(($(ls docs/adr/ | grep -oE '^[0-9]+' | sort -n | tail -1) + 1)))
FILENAME="docs/adr/${NEXT_NUM}-${SLUG}.md"
```

Verify the filename doesn't already exist (would be a numbering bug if so):

```bash
test ! -e "$FILENAME" && echo "OK — will create $FILENAME" || (echo "Filename collision: $FILENAME" && exit 1)
```

If collision, halt and tell the user.

---

## 4. Check for topic collision

If `$ARGUMENTS` looks similar to an existing ADR's topic, refuse. Cheap heuristic:

```bash
ls docs/adr/ | grep -iE "$(echo "$SLUG" | tr - ' ')" | head -5
```

If any match is found, print it and ask: *"Existing ADR(s) cover similar ground: <list>. Are you intending to **supersede** one of them (recommended), write a **complement** (rare), or did you not realize? (supersede / complement / cancel)"*

- `supersede <existing-num>` → add a note in the new ADR's frontmatter: `Supersedes: ADR-<existing-num>`
- `complement` → continue without a supersedes marker
- `cancel` → stop

---

## 5. Compose the ADR

Write `docs/adr/<NNNN>-<slug>.md` with this template — modeled on the existing `docs/adr/0011-version-deltas.md` shape.

```markdown
# ADR-<NNNN>: <Title from $ARGUMENTS, sentence case>

- Status: Proposed
- Date: <YYYY-MM-DD, today, UTC>
- Supersedes: <ADR-XXXX if applicable, else delete this line>

## Context

<TODO — describe the situation that prompted this decision. Two-to-four sentences. Reference the specific sprint, issue, or scenario that surfaced the need. Don't editorialize; just state the conditions.>

## Decision

<TODO — state the chosen approach in 1-3 sentences. Active voice. Specific. No hedging. Example: "Image variants will be generated synchronously during upload via Sharp in `apps/api`, not asynchronously in the worker, until upload latency p95 exceeds 3 seconds.">

## Consequences

### Positive
- <TODO — what this decision enables or makes cleaner>

### Negative / trade-offs
- <TODO — what gets harder, what we give up>

### Neutral
- <TODO — implications that aren't clearly good or bad>

## Alternatives considered

### <Alternative 1>
<TODO — describe, then why rejected>

### <Alternative 2>
<TODO — describe, then why rejected>

## References

- <TODO — link to the relevant sprint file, issue, or GRILL-OUTCOME.md section that motivated this>
- <TODO — link to any prior ADR this builds on>

---

*This ADR was scaffolded by `/new-adr` on <date>. Fill in the `<TODO>` sections, set Status to `Accepted` (or another final state), then open a PR.*
```

**Tone**: terse, factual, dated, decision-not-discussion. ADRs read by future agents in 6 months — they should answer "what did we decide and why" not "how did we argue about it."

If the conversation that triggered `/new-adr` contains enough context to fill some `<TODO>` sections, do it — but mark anything you inferred (vs. knew explicitly from this conversation) with a `[verify]` tag so the user catches assumptions.

---

## 6. Show the file to the user

After writing, print:

```
==============================================
ADR scaffolded: docs/adr/<NNNN>-<slug>.md
==============================================

<file content here>

==============================================

Sections with <TODO> markers — fill these in:
  - Context: <empty | partial>
  - Decision: <empty | partial>
  - Consequences: <empty | partial>
  - Alternatives: <empty | partial>
  - References: <empty | partial>
```

Ask: *"Want to fill in the TODOs interactively now, or save as-is for you to finish later? (fill / save / cancel)"*

---

## 7. Optionally fill TODOs interactively

If the user picks `fill`:

For each `<TODO>` section, ask one focused question, capture the answer, replace the marker with the answer via `Edit`. Walk in order: Context → Decision → Consequences (positive, then negative, then neutral) → Alternatives → References.

After all TODOs are filled, ask: *"Set status to Accepted? (yes / leave as Proposed)"*. If `yes`, replace `Status: Proposed` with `Status: Accepted`.

---

## 8. Commit + PR

Whether the user picked `fill` or `save`:

Ask: *"Open a PR for this ADR? (recommended) — yes / commit-direct-to-main / cancel"*

**`yes` (PR path — recommended):**

```bash
git checkout -b docs/adr-<NNNN>-<slug>
git add docs/adr/<NNNN>-<slug>.md
git commit -m "docs: ADR-<NNNN> <Title>

Status: Proposed | Accepted (per user)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push -u origin docs/adr-<NNNN>-<slug>
gh pr create \
  --base main \
  --head docs/adr-<NNNN>-<slug> \
  --title "ADR-<NNNN>: <Title>" \
  --body "Proposes ADR-<NNNN>. See file for full Context / Decision / Consequences / Alternatives."
```

Self-approve + squash-merge using `/run-issue` §7 pattern, then sync main and delete the local branch.

**`commit-direct-to-main`:**

```bash
git add docs/adr/<NNNN>-<slug>.md
git commit -m "docs: ADR-<NNNN> <Title>"
git push origin main
```

Use this only if the user is sure they want zero review audit trail. Default is the PR path.

**`cancel`:**

Leave the file in the working tree, uncommitted. Tell the user the file is at `docs/adr/<NNNN>-<slug>.md` for manual handling.

---

## 9. Final summary

Print:

```
ADR-<NNNN>: <Title>
File:    docs/adr/<NNNN>-<slug>.md
Status:  <Proposed | Accepted>
Path:    <PR url | committed direct to main | uncommitted in working tree>

Sections still containing <TODO>: <count, or "none">

Suggested next:
  <if TODOs remain>  Fill in <count> remaining <TODO> sections.
  <if PR open>       Review + merge PR <url>.
  <if uncommitted>   git diff docs/adr/<NNNN>-<slug>.md && commit when ready.
```

Then stop.

---

## 10. Bail conditions

Stop and tell the user when:

- `$ARGUMENTS` is empty and the user can't or won't provide a topic
- The next ADR number can't be computed (no existing ADRs to learn the pattern from, and the user hasn't confirmed the scheme)
- Filename collision (numbering bug somewhere)
- An existing ADR appears to cover the same ground and the user picks `cancel`
- `gh pr create` fails (branch protection, missing perms, etc.)

On bail, leave the file in the working tree if it was already written. Don't silently delete the user's drafted thinking.

---

## Tooling reference

- `Read` — existing ADR for template (the most recent one is the source of truth for tone)
- `Write` — the new ADR file
- `Edit` — interactive TODO fill
- `Bash` — `ls`, `printf`, `git`, `gh`
- **No `TodoWrite`** — short enough not to need it
- **No subagents.**

End of prompt.
