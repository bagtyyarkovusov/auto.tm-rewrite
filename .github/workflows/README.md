# `.github/workflows/`

GitHub Actions workflows. Created during code scaffolding session.

## Planned workflows

| Workflow | Trigger | Runner | Purpose |
|---|---|---|---|
| `pr-checks.yml` | Pull request | self-hosted (tm-build-windows / tm-build-mac) | Lint + typecheck + unit + integration tests, contract drift check, Prisma migrate diff |
| `build.yml` | Push to main, manual dispatch | self-hosted | Build Docker images for all apps, package into `auto-tm-release-v*.tar.gz`, upload as GitHub Release asset |
| `e2e.yml` | Nightly cron + manual dispatch | self-hosted | Mobile e2e (Maestro), web/admin e2e (Playwright) against a staged build |
| `phone-agent.yml` | Path filter `apps/phone-agent/**` | self-hosted | Gradle build of the Kotlin Android APK; signs and uploads as release asset |

## Self-hosted runners

Two runners registered:

- **`tm-build-windows`** — primary, the TM Proxy PC inside Turkmenistan (legal VPN, fast Telecom link to TM servers)
- **`tm-build-mac`** — backup, the developer's machine (used when in China / abroad)

GitHub auto-routes to whichever is online. Both have label `self-hosted`.

## Secret management

Secrets are stored in GitHub Actions repository secrets:

- `RELEASE_SIGNING_KEY` — for signing release tarballs
- `ANDROID_KEYSTORE_PASSWORD` — for signing phone-agent APK
- `DOCKER_REGISTRY_PUSH_TOKEN` — if we ever push to a private registry

NO production env vars in CI — those live on the TM servers in `.env` files, never in CI.

## See also

- [ADR-0003 — Monorepo](../../docs/adr/0003-monorepo.md)
- [ADR-0005 — Hosting](../../docs/adr/0005-hosting.md)
- [ADR-0010 — Testing + observability](../../docs/adr/0010-testing-obs.md)
- [Deployment runbook](../../docs/prd/ops/80-deployment-runbook.md)
