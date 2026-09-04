# ADR-0044: Railway deploy settings live provider-side; `railway/*.json` is a declared-state record only

- **Status**: Accepted
- **Date**: 2026-09-05
- **Deciders**: AutoTM founder + AI architect

## Context

[ADR-0039](0039-phased-cloud-first-hosting.md) put staging and reviewer-only production on Railway. Sprint 11 issue #271 shipped `railway/api.json`, `railway/worker.json`, `railway/admin.json`, and `railway/web.json` as **config as code**: one schema-valid file per deployable service, each expected to override the equivalent dashboard settings. `railway/README.md` described those files as the versioned authority for Dockerfile path, start command, pre-deploy migration, health gate, and restart policy.

Issue #278 is the first slice that actually points live Railway services at those files. Setting `railwayConfigFile` on the four staging service instances failed against the live provider API:

```
Config as Code (railway.json / railway.toml) is deprecated.
Use Infrastructure as Code (.railway/railway.ts) instead.
```

The same four `serviceInstanceUpdate` mutations succeeded when the settings were passed directly as fields (`dockerfilePath`, `preDeployCommand`, `startCommand`, `healthcheckPath`, `healthcheckTimeout`, `restartPolicyType`, `restartPolicyMaxRetries`, `sleepApplication`).

Railway's replacement, Infrastructure as Code in `.railway/railway.ts`, does not cover the settings AutoTM depends on. Its `service()` config exposes `source`, `build`, `start`, `healthcheck`, `healthcheckTimeout`, `replicas`, `env`, and `domains`. It has no Dockerfile builder or Dockerfile path, no pre-deploy command, no restart policy, and no `sleepApplication`. Adopting it wholesale would mean abandoning the Dockerfile builds that ADR-0039 and the `infra/docker/*.Dockerfile` set are built on, and dropping the API pre-deploy migration that `railway/README.md` names as the sole migration authority.

So there is no file in this repository that Railway will read for AutoTM's actual deploy contract. The `railway/*.json` files are inert. Left described as authoritative, they are a drift trap: an operator edits one, nothing changes in the environment, and the environment silently diverges from the checked-in description.

## Decision

**Railway deploy settings for AutoTM are applied provider-side through `serviceInstanceUpdate`. The `railway/*.json` files are retained as the checked-in declaration of intended state, and are explicitly not read by Railway.**

- `railway/*.json` remains the human- and agent-readable source for what each service's build, start, pre-deploy, health, and restart contract is supposed to be. It is documentation with a schema, not applied configuration.
- Applying that state to an environment is an operator step, recorded in the deployment runbook and evidenced per environment. Every provisioning slice must record which settings it applied and to which service ids.
- `.railway/railway.ts` Infrastructure as Code is **not** adopted for AutoTM while Dockerfile builds and the API pre-deploy migration are load-bearing. Revisit only if Railway IaC gains Dockerfile path, pre-deploy command, restart policy, and sleep coverage.
- Drift between `railway/*.json` and a live environment is an operator finding, not a build failure. There is no automated reconciliation.

This corrects, but does not otherwise disturb, the ADR-0039 Railway phase. Migration authority (`api` pre-deploy, forward-only, per [ADR-0004](0004-migrations.md)), the readiness gate, and the deploy ordering all stand unchanged — only the mechanism that carries those settings to the provider moves.

## Consequences

**Positive**

- The repository stops claiming an override that the provider rejects.
- The full deploy contract, including Dockerfile path and pre-deploy migration, survives; a partial IaC migration would have silently dropped both.
- Provider-side settings are applied by explicit, auditable mutations that name the service id and environment id, which is what the S11 evidence files already record.

**Negative**

- Configuration is no longer applied from git. A settings change is a two-step change: edit `railway/*.json`, then apply provider-side, and the two can diverge between those steps.
- Recreating an environment from scratch is manual. Nothing replays `railway/*.json` into a new Railway project.
- AutoTM carries a config format Railway has deprecated, so the schema URL in each file may eventually stop resolving.

**Neutral**

- Railway's own `railway config migrate` / `pull` / `apply` commands exist and work; they are declined here on coverage grounds, not availability.

## Alternatives considered

- **Migrate to `.railway/railway.ts` IaC** — rejected. Its `service()` config omits Dockerfile path, pre-deploy command, restart policy, and sleep. Adopting it would abandon `infra/docker/*.Dockerfile` builds and the API migration pre-deploy, both locked by earlier Sprint 11 work.
- **Split: IaC for what it covers, provider-side for the rest** — rejected. Two authorities for one service's settings is worse than one authority plus a written declaration; it makes "where does this setting come from" unanswerable without checking both.
- **Delete `railway/*.json` entirely** ([ADR-0041](0041-git-history-is-the-archive-for-retired-agent-tool-artifacts.md) would allow it) — rejected. The declared contract is genuinely useful to operators and agents, and nothing else in the repo states it as precisely.

## References
- [ADR-0039](0039-phased-cloud-first-hosting.md) — phased cloud-first hosting
- [ADR-0004](0004-migrations.md) — forward-only migrations
- `railway/README.md`
- `docs/prd/ops/80-deployment-runbook.md`
- `docs/prd/ops/evidence/issue-278-staging-applications.md`
