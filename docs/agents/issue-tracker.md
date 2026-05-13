# Issue tracker — GitHub Issues

This repo tracks all issues in **GitHub Issues**, using the `gh` CLI.

Skills that read this file: `to-issues`, `triage`, `to-prd`, `qa`, `request-refactor-plan`.

## Operations

### Create an issue

```bash
gh issue create --title "<concise title>" --body "<markdown body>" --label "needs-triage,<area-label>"
```

For longer bodies, pipe a heredoc:

```bash
gh issue create --title "..." --body "$(cat <<'EOF'
## Summary
...

## Repro / context
...

## Acceptance criteria
- [ ] ...
EOF
)"
```

### Find issues

```bash
gh issue list --label "ready-for-agent" --state open
gh issue list --search "is:open is:issue label:needs-triage"
gh issue view <number>
```

### Update issue state

```bash
gh issue edit <n> --add-label "ready-for-human" --remove-label "needs-triage"
gh issue comment <n> --body "<update>"
gh issue close <n>
```

## Body template

```markdown
## Summary
<one or two sentences — what + why>

## Context
<what we know, what we don't know, links to ADRs / PRD>

## Acceptance criteria
- [ ] ...
- [ ] ...

## Out of scope
- ...

## Notes for the implementer
- ...
```

## Labels used

See `triage-labels.md` for the canonical five-role vocabulary plus per-area labels (`api`, `mobile`, `web`, `admin`, `sms-gateway`, `infra`).
