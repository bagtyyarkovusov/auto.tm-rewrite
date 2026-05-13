# Triage labels — canonical five-role vocabulary

The `triage` skill moves issues through a state machine using these labels. The strings below are the *exact* label names this repo uses on GitHub.

## The five canonical roles

| Label | Meaning |
|---|---|
| `needs-triage` | Maintainer needs to evaluate. Default state for new issues. |
| `needs-info` | Waiting on reporter for more details. |
| `ready-for-agent` | Fully specified and AFK-ready. An agent can pick this up cold with no human context. |
| `ready-for-human` | Needs human implementation (judgment call, design decision, security-sensitive). |
| `wontfix` | Will not be actioned. |

An issue should have **exactly one** of these labels at a time.

## Area labels (orthogonal to triage state)

Apply *in addition* to the triage label, to indicate which part of the system:

| Label | Area |
|---|---|
| `api` | `apps/api` (NestJS) |
| `admin` | `apps/admin` (Next.js) |
| `web` | `apps/web` (Next.js) |
| `mobile` | `apps/mobile` (Expo) |
| `sms-gateway` | `apps/sms-gateway` + `apps/phone-agent` |
| `worker` | `apps/worker` |
| `db` | `packages/db` (Prisma schema, migrations) |
| `contracts` | `packages/contracts` (Zod, OpenAPI) |
| `ui` | `packages/ui` (tokens, components) |
| `infra` | `infra/`, Docker, CI, deployment |
| `docs` | ADRs, PRD, CONTEXT.md, README |

## Type labels

| Label | Type |
|---|---|
| `bug` | Defect — something broken |
| `feature` | New capability |
| `enhancement` | Improvement to existing capability |
| `task` | Chore / maintenance |
| `security` | Security issue (high priority) |
| `perf` | Performance issue |

## Phase labels

| Label | Phase |
|---|---|
| `phase-1` | Marketplace MVP (current focus) |
| `phase-2` | Inspection reports + PDF + tier system |
| `phase-3` | 360° + comparisons + polish |

## Creating labels in a fresh repo

```bash
# Triage states
gh label create "needs-triage"     --color "FBCA04" --description "Maintainer needs to evaluate"
gh label create "needs-info"       --color "D4C5F9" --description "Waiting on reporter"
gh label create "ready-for-agent"  --color "0E8A16" --description "AFK-ready, fully specified"
gh label create "ready-for-human"  --color "1D76DB" --description "Needs human implementation"
gh label create "wontfix"          --color "CCCCCC" --description "Will not be actioned"

# Areas
gh label create "api"          --color "5319E7"
gh label create "admin"        --color "5319E7"
gh label create "web"          --color "5319E7"
gh label create "mobile"       --color "5319E7"
gh label create "sms-gateway"  --color "5319E7"
gh label create "worker"       --color "5319E7"
gh label create "db"           --color "5319E7"
gh label create "contracts"    --color "5319E7"
gh label create "ui"           --color "5319E7"
gh label create "infra"        --color "5319E7"
gh label create "docs"         --color "5319E7"

# Types
gh label create "bug"         --color "D73A4A"
gh label create "feature"     --color "A2EEEF"
gh label create "enhancement" --color "84B6EB"
gh label create "task"        --color "C2E0C6"
gh label create "security"    --color "B60205"
gh label create "perf"        --color "FBCA04"

# Phases
gh label create "phase-1"     --color "0052CC"
gh label create "phase-2"     --color "0052CC"
gh label create "phase-3"     --color "0052CC"
```
