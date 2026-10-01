# Issue 481 verification evidence

PR: [488](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/488). This folder is the remote proof for acceptance criterion 3: the native PR seed re-proven on this PR's own Railway environment, with the shared guard and without local mode. The orchestrator ran the commands; the files are the unedited captures.

## Source and deployment

| Item | Value |
|---|---|
| Deployed source | `bdf13faadd001ffca47b5f73944b28af92a763fe` |
| Project | `176ddec0-dd65-4087-b82c-798599fc2ebe` |
| PR environment | `auto.tm-rewrite-pr-488` = `6b6b8a0c-74ac-4e01-ae77-47ba71850b1a` |
| API service | `6db6f1b1-5c7a-4033-88d0-53f5f315bfc0` |

`/readyz` reported that SHA and `environment: auto.tm-rewrite-pr-488` with postgres, redis and minio `ok` in three captures: before any variable change ([before](readyz-before.json)), after the variable change and API redeploy described under Environment change, before the successful runs ([before seed](readyz-before-seed.json)), and after them ([after](readyz-after.json)). The captures carry no timestamps. The worker was not changed and not used.

## Command

Every run used explicit Railway IDs:

```
railway ssh --project 176ddec0-dd65-4087-b82c-798599fc2ebe --environment 6b6b8a0c-74ac-4e01-ae77-47ba71850b1a --service 6db6f1b1-5c7a-4033-88d0-53f5f315bfc0 sh -c 'node /app/scripts/native-pr-seed.mjs --remote; echo "exit=$?"'
```

The refusal runs below used the same form with the arguments and environment named in each item.

## Refusals

1. **Local mode removed** ([log](local-mode-refusal.txt)): `node /app/scripts/native-pr-seed.mjs` with no arguments exits 1 with `Local native:seed mode was removed because it could not be bound to the PR environment database ...` and runs no step.
2. **Production-name override** ([log](production-name-refusal.txt)): `--remote` with `RAILWAY_ENVIRONMENT_NAME=production` exits 1 with `Native seed requires an auto.tm-rewrite-pr-<number> PR environment`. No `Native PR seed:` step line is printed, so no seed step ran.
3. **Inherited media URL refused, twice** ([run 1](remote-run-1.txt), [run 2](remote-run-2.txt)): two plain `--remote` runs exit 1 with `Native seed requires the MinIO public endpoint of this PR`. The PR environment had inherited staging's media URL, so the shared guard refused before any step. This is guard evidence, not a failed proof. In run 2 the `exit=` line precedes the message only because the two streams interleave.

## Environment change

Sequence, as the files support it:

1. `readyz-before.json`, captured before any variable change, already reported `bdf13fa`. The local-mode and production-name refusals ran against that deployment.
2. The two plain `--remote` runs were refused for the MinIO public endpoint (Refusals, item 3).
3. The orchestrator then set `MINIO_PUBLIC_URL` on the API service in this PR environment and redeployed the API with `railway redeploy --from-source` to apply it. This applied the API half of [`docs/agents/mobile-expo.md`](../../agents/mobile-expo.md) step 4 only; the worker was not changed because the seed does not use it.
4. `readyz-before-seed.json` and `readyz-after.json` report `bdf13fa`.

The variable is the reference `https://${{MinIO.RAILWAY_PUBLIC_DOMAIN}}`. The host it resolved to is in [media-host.txt](media-host.txt) and carries this PR's number.

The worker service and every other environment were not changed. The only resolved value recorded is the public media host in `media-host.txt`; no credentials appear.

## Successful runs

Two `--remote` runs, both exit 0, each showing the steps `buckets`, `catalog`, `native fixtures` and `brand logos` in order ([run 1](remote-success-1.txt), [run 2](remote-success-2.txt)):

- **Run 1** (2026-10-01T15:58:44Z) on an unseeded environment: the four buckets `listing-photos`, `listing-videos`, `chat-attachments`, `catalog-assets` `created`; reference catalog seeded; 11 active listings with photos plus 1 without media; 2 conversations and 3 favourites for the buyer; 64 brand logos `imported`, 66 `no-source`.
- **Run 2** (2026-10-01T16:00:02Z) on the seeded environment: buckets `verified`, new-row counts for body types, colors and engine types `0`, the same fixtures, and all 64 logos `unchanged`. It converges without error on a seeded environment. As recorded for [issue 477](../issue-477/README.md), a rerun deletes and recreates the fixture listings and users, so it is not a no-op.

The brand-logo step reports target `postgres.railway.internal:5432/railway` and bucket `catalog-assets` on `minio.railway.internal:9000`, the private origins of this environment. The fixtures print only the fixture phone numbers, which are not real accounts.

## Limits

- The refusal and `readyz` captures carry no timestamps; the successful runs carry theirs. Identity rests on the explicit IDs in the command and on `/readyz` naming `auto.tm-rewrite-pr-488`.
- The proof is on this environment only. Nothing was run against staging or production.
- Hosted `pr` at `bdf13fa` and the Delta review are tracked in the PR body, not here.
