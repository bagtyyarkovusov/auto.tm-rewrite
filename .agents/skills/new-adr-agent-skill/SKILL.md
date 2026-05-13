---
name: new-adr-agent-skill
description: Scaffolds a new Architecture Decision Record at docs/adr/ for the AutoTM project. Use when the user asks to "create an ADR", "write an ADR for X", "capture this decision", or wants to record an architectural choice in the immutable decision log. The skill auto-numbers from the highest existing ADR (zero-padded to 4 digits), slugifies the topic from the user's input, refuses topic collisions and suggests superseding the existing ADR instead, writes a fresh file at docs/adr/<NNNN>-<slug>.md filled with the standard sections (Context / Decision / Consequences / Alternatives / References) marked with <TODO> placeholders, offers interactive TODO-fill, then opens a PR (recommended since ADRs are immutable after merge) or commits direct to main.
---

# AutoTM — New ADR (agent skill)

> **Source:** Mirrors `.claude/commands/new-adr.md` adapted for cross-agent use.
>
> **Invocation:** When the user says "create an ADR for X", "write an ADR about Y", "capture the decision about Z", the topic (X/Y/Z) becomes the ADR's subject. If no topic provided, ask.
>
> The user captures an architectural decision **before** code lands that depends on it. Your job: write the file with maximum signal in Context + Decision, hand off to the user to fill remaining sections, then commit via PR.

---

## 0. Hard rules

- **Never edit an existing ADR.** ADRs are immutable after merge (per `CLAUDE.md`). If the topic matches existing, refuse and suggest superseding instead.
- **Never assign a status other than `Proposed`** at scaffold time.
- **Never auto-fill Decision content without enough context.** A blank `Decision` section with `<TODO>` is better than an invented decision.
- **Never commit + push without explicit user `yes`.** ADRs land via PR.

---

## 1. Read first

1. `CLAUDE.md`
2. `docs/adr/README.md` (if exists) — ADR conventions
3. `docs/adr/` directory listing — to know next number + format
4. Most recent ADR (e.g., `docs/adr/0011-version-deltas.md`) — mirror its shape

---

## 2. Resolve the topic

If user's input has a topic, use it. If not, ask: *"What's the topic? (short noun phrase, e.g., 'media variant strategy')"* Wait.

Slugify:
- Lowercase
- Spaces → `-`
- Strip non-alphanumeric except `-`
- Trim leading/trailing `-`
- Truncate to 60 chars

Refuse if slug is empty or only numbers.

---

## 3. Determine the next ADR number

```bash
NEXT_NUM=$(printf '%04d' $(($(ls docs/adr/ | grep -oE '^[0-9]+' | sort -n | tail -1) + 1)))
FILENAME="docs/adr/${NEXT_NUM}-${SLUG}.md"
test ! -e "$FILENAME" && echo "OK" || (echo "COLLISION: $FILENAME"; exit 1)
```

If collision, halt.

---

## 4. Check for topic collision

```bash
ls docs/adr/ | grep -iE "$(echo "$SLUG" | tr - ' ')" | head -5
```

If matches found, ask: *"Existing ADR(s) cover similar ground: <list>. Are you superseding (recommended), complementing (rare), or did you not realize? (supersede / complement / cancel)"*

- `supersede <existing-num>` → add `Supersedes: ADR-<existing-num>` in new ADR's frontmatter section
- `complement` → continue
- `cancel` → stop

---

## 5. Compose the ADR

Write `docs/adr/<NNNN>-<slug>.md`, modeled on the existing `0011-version-deltas.md`:

```markdown
# ADR-<NNNN>: <Title from input, sentence case>

- Status: Proposed
- Date: <YYYY-MM-DD, today, UTC>
- Supersedes: <ADR-XXXX if applicable, else delete this line>

## Context

<TODO — describe the situation. 2-4 sentences. Reference the sprint, issue, or scenario.>

## Decision

<TODO — state the chosen approach. 1-3 sentences. Active voice. Specific. No hedging.>

## Consequences

### Positive
- <TODO>

### Negative / trade-offs
- <TODO>

### Neutral
- <TODO>

## Alternatives considered

### <Alternative 1>
<TODO — describe, then why rejected>

### <Alternative 2>
<TODO — describe, then why rejected>

## References

- <TODO — link to sprint file, issue, or charter section that motivated this>
- <TODO — link to prior ADR this builds on>

---

*Scaffolded by new-adr-agent-skill on <date>. Fill in <TODO> sections, set Status to Accepted, then open a PR.*
```

**Tone:** terse, factual, dated, decision-not-discussion. Future agents read this in 6 months.

If the conversation has enough context to fill some `<TODO>`s, do it — but tag inferred-content with `[verify]`.

---

## 6. Show file + ask

Print:

```
==============================================
ADR scaffolded: docs/adr/<NNNN>-<slug>.md
==============================================

<file content>

==============================================

Sections with <TODO> markers — fill these in:
  - Context: <empty | partial>
  - Decision: <empty | partial>
  - ...

Want to fill TODOs interactively now, or save as-is? (fill / save / cancel)
```

---

## 7. Interactive TODO-fill (if user picked `fill`)

Walk in order: Context → Decision → Consequences (positive/negative/neutral) → Alternatives → References. Ask one focused question per section, capture answer, replace `<TODO>` via Edit.

After all filled: *"Set status to Accepted? (yes / leave as Proposed)"*

---

## 8. Commit + PR

Ask: *"Open a PR for this ADR? (recommended) — yes / commit-direct-to-main / cancel"*

**`yes` (PR — recommended):**

```bash
git checkout -b docs/adr-<NNNN>-<slug>
git add docs/adr/<NNNN>-<slug>.md
git commit -m "docs: ADR-<NNNN> <Title>

Status: Proposed | Accepted

Co-Authored-By: <agent> <noreply@anthropic.com>"
git push -u origin docs/adr-<NNNN>-<slug>
gh pr create \
  --base main \
  --head docs/adr-<NNNN>-<slug> \
  --title "ADR-<NNNN>: <Title>" \
  --body "Proposes ADR-<NNNN>. See file for full Context / Decision / Consequences / Alternatives."
```

Self-approve + squash-merge using run-issue-agent-skill §7 pattern. Sync main, delete local branch.

**`commit-direct-to-main`:**

```bash
git add docs/adr/<NNNN>-<slug>.md
git commit -m "docs: ADR-<NNNN> <Title>"
git push origin main
```

Only when user is sure they want zero review audit trail.

**`cancel`:** leave file uncommitted, tell user the path.

---

## 9. Final summary

```
ADR-<NNNN>: <Title>
File:    docs/adr/<NNNN>-<slug>.md
Status:  <Proposed | Accepted>
Path:    <PR url | direct commit | uncommitted>

Sections still containing <TODO>: <count, or "none">

Suggested next:
  <TODOs remain>  Fill remaining <TODO> sections.
  <PR open>       Review + merge PR <url>.
  <uncommitted>   Review + commit when ready.
```

---

## 10. Bail conditions

Stop when:
- Topic empty and user can't clarify
- Next ADR number not computable
- Filename collision
- Existing ADR covers the same ground and user picks `cancel`
- `gh pr create` fails

On bail, leave any drafted file in working tree.

---

## Cross-agent notes

Needs file write/edit + shell + `git` + `gh`. Standard everywhere.
