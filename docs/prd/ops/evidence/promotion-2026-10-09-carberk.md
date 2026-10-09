# Production promotion of `6796c845` (Carberk), 2026-10-09

Promotion of the first commit that carries the Carberk name ([ADR-0093](../../../adr/0093-carberk-is-the-public-product-name.md)) to reviewer-only production, following [Step 4 of the deployment runbook](../80-deployment-runbook.md). The founder gave the go-ahead in the release session. No credential, phone number or code appears in this file.

## Revision

| | |
|---|---|
| Commit | `6796c8457b8ee8be4213d93a1550a959d4aa5d09` (main, PR #788) |
| Hosted `pr` check | Passed on the PR head, full pipeline |
| Staging | api, web and admin `/healthz` reported the commit at 02:08 UTC; `/readyz` ready |
| Staging smoke | `scripts/staging-reviewer-flow-smoke.mjs`: 8 of 8 checks passed |

## Production before the promotion

Read at 01:53 UTC. api ran `6d062c61` (deployed 2026-10-07 12:48 UTC); web, admin and worker ran `ee2d7f24` (deployed 2026-10-07 11:30 UTC). Both are the promotions of 7 October. Nothing was pending and no deployment had been created since. One replica per service.

Variable names on api, worker, admin and web matched staging (worker also carries the APNS names). Flags read without secrets: `SIGNUPS_ENABLED=false`, `SMS_DRIVER=mock`, `REVIEW_DEMO_ACCOUNT_ENABLED=true`.

## Backup

Logical dump taken inside the Postgres container before the deploy:

- File: `/var/lib/postgresql/data/backups/pre-carberk-6796c845-20261009.dump`, custom format, 226,130 bytes, 38 table-data entries listed by `pg_restore --list`
- Database at that moment: 45 users, 49 listings, 27 migrations applied

The file is on the database's own volume. It covers a bad migration, not the loss of that volume.

## Deploy

Each service was deployed with `serviceInstanceDeployV2(serviceId, environmentId, commitSha)`, api first.

| Service | Deployment | Created (UTC) | Result |
|---|---|---|---|
| api | `858a021d-61fb-4da4-bf72-36a06249fc62` | 02:09:16 | **Failed in the image build.** `pnpm install --frozen-lockfile` stopped with `ERR_PNPM_ENOENT` on a file in the package store. Pre-deploy never ran, the previous deployment kept serving, and no other service was deployed. |
| api | `d0295a3b-36b2-4b88-8f24-fde9f74170f5` | 02:29:41 | Success. `/healthz` reported the commit at 02:36:32; `/readyz` ready with postgres, redis and minio ok |
| worker | `62589340-7f0b-4eed-9580-773ded4b02e0` | 02:36:37 | Success; log shows `Worker started (BullMQ consumer)` |
| admin | `a67da901-c2c2-4928-b6ff-76a342ff60a6` | 02:36:38 | Success; `/healthz` reports the commit; `/login` returns 200 with the title "Carberk Admin" |
| web | `6842c247-9a97-4cd6-8615-c16983470254` | 02:36:40 | Success; `/healthz` reports the commit |

The first api build failure was not reproduced: the same commit built on staging and on the second attempt.

## Migrations

api's pre-deploy applied two migrations at 02:35:56 UTC, taking the count from 27 to 29:

- `20261007130000_exclusive_upload_adoption`
- `20261007130100_backfill_upload_adoption_state`

Users (45) and listings (49) were unchanged after the migration.

## Variable changed

`EMAIL_FROM` on the worker now has the display name "Carberk" with the same address, in production and in staging. In production it was set without a redeploy and took effect with the worker deployment above.

## Checks after the deploy

- **Reviewer smoke on production:** 5 of 6 checks passed: two reserved accounts sign in, feed and anonymous listing detail, listing creation through signed upload, chat text and image over WebSocket and HTTP, report and block. The smoke listing was archived by the script's cleanup.
- **Not run:** the sixth check, admin moderation and public enforcement. Production has no admin identity yet, so the credentials file has no admin entry.
- **One retry:** the first smoke run stopped at the feed check with a network-level `fetch failed` after 5 seconds. The same request answered 200 in about 1 second by hand, and the second run passed.
- **Web:** `/en`, `/tk`, `/en/legal/privacy`, `/ru/legal/terms` and `/en/account/delete` return 200 and say Carberk. The home page shows the Alpha Motors line.
- **Accounts:** 30 tester users are present and the API's tester list has 30 entries. 33 buyers, 12 sellers, no admin.

## Not checked

- A sign-in email as delivered with the new sender name.
- The SMS text: production uses the mock SMS driver.
- Push delivery.
- The store build against production; it has not been built yet.

## Open

- Create the founder's production admin identity (ADR-0045), then run the sixth smoke check.
- The backup file can be deleted from the volume once the release is stable.
