# Issue 477 verification evidence

PR: [480](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/480). Railway PR environment `auto.tm-rewrite-pr-480` served a real native session with Docker absent. Independent reviews and PR480 deletion proof remain with the orchestrator.

## Source and deployment

| Item | Value |
|---|---|
| Deployed source (proof runtime) | `0821c26e6ea7e8756f6ccb1b5ed140b38d8a0dd1` |
| Integrated main | `dc85c17519b6fb3d71230c3953cc061af4b8deca` (#454) |
| Hosted PR check at deployed source | [36844769511](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/36844769511) SUCCESS |
| Project / environment | `176ddec0-dd65-4087-b82c-798599fc2ebe` / `2f202886-5a5a-49f8-be0c-1eb7b04fecdb` |
| API service / deployment used for proof | `6db6f1b1-5c7a-4033-88d0-53f5f315bfc0` / `4b4ff963-7f7a-41c2-bc10-f2951da2f05d` SUCCESS at 0821c26 (readiness reported that SHA, postgres/redis/minio ok) |
| Worker | `24aa02e0-25a9-4e80-9cc2-c1795ef82091`, SUCCESS at `369b44d` (deployment `566a53d8-12ff-4b08-8e70-802f102b615e`); the later db `dotenv` declaration does not affect worker runtime behaviour, and the worker was not used for the proof flows |
| MinIO / Postgres | `af9ecdec-433b-48f0-8457-1a13c5ab1ab7` (ADR-0074 pinned digest) / `30dda76c-1a50-457f-a08a-dce846eb9843` |

Public API `https://api-autotm-rewrite-pr-480.up.railway.app` (mobile base appends `/api/v1`); public media `https://minio-autotm-rewrite-pr-480.up.railway.app`. Web and admin were skipped by watched paths and are not needed by these criteria.

Earlier superseded deployments (for traceability): API `d4a87727-...` at 5f0edb4, API `18fbad71-dca2-47f6-b7cf-8521fa214d55` at 369b44d (seed failed in it, below), worker `72f33a18-...` at 5f0edb4.

## Remote seed

Entry: `railway ssh --project <P> --environment <E> --service <API> node /app/scripts/native-pr-seed.mjs --remote`, all IDs explicit.

1. **Production-name override refusal** on the live image: `env RAILWAY_ENVIRONMENT_NAME=production node /app/scripts/native-pr-seed.mjs --remote` exited 1 with `Native seed requires an auto.tm-rewrite-pr-<number> PR environment`; no client was constructed ([log](production-override-refusal.txt)).
2. **First attempt on 369b44d failed at catalog**: buckets were created, then `packages/db/src/seed.ts` threw `Cannot find module 'dotenv/config'`. Root cause: `seed.ts` and `ui-fixture.ts` import `dotenv/config`, but no workspace declares `dotenv`; locally it resolves through `shamefully-hoist` (`.npmrc`), which the image does not copy. Fix: declare `dotenv` (17.4.2, already in the lockfile) as a `packages/db` devDependency. Test-first red: `e263c5e` (new test requiring every bare import of the remote seed steps to be declared by the db workspace failed with `['dotenv']`); green at `0821c26` (9/9). This is one further repair in the same remote-seed packaging sequence (dockerignore, AWS resolution, undeclared dotenv), so the three-attempt cap is conservatively treated as spent.
3. **Seed run 1 and run 2 on 0821c26**, both exit 0 ([run 1](remote-seed-run1.txt), [run 2](remote-seed-run2.txt)): buckets `listing-photos`, `listing-videos`, `chat-attachments`, `catalog-assets` (verified on both; created during the failed attempt), reference catalog, 11 active listings with photos plus 1 without, 4 fixture users, 64 logos imported then all `unchanged` on run 2.
4. **Readback** ([after run 1](readback-after-run1.txt), [after run 2](readback-after-run2.txt)): 4 fixture users (3 sellers `+99361000001..3`, buyer `+99361000009`), 12 listings, 2 conversations, 8 messages, 3 favourites, 130 brands (64 with `logoKey`), 2432 models, 35 cities, 6 regions, 2 exchange rates. Photo distribution: 1 listing with 0 photos, 10 with 1, 1 with 2. Listings span TMT, USD and AED.
5. **Idempotence**: users, conversations, favourites, logo keys, deterministic media object keys and all counts are identical between runs (digests equal). Two things change by design: fixture listings are deleted and recreated with the same fixed ids, so the database `publicNumber` serial advances (1-12 became 13-24), and `listing_media` row UUIDs regenerate. A rerun also deletes and recreates fixture users, which ends their sessions. The command converges, never duplicates.
6. **Media reachability** ([result](media-reachability.txt)): a fixture photo and a logo return 200 from the public media URL with the right content types.

## Native session (Docker absent)

[`docker info` failure](docker-info.txt): the client runs, the daemon socket is absent (exit 1). No container was started.

Simulator `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13` (iPhone 17), `tm.auto.app` dev client, Metro port 8477 ([log](metro-8477.txt)) with `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`, `EXPO_PUBLIC_MEDIA_URL` set to this PR's origins. The app's stored `RCT_jsLocation` pointed at an old Metro port, so the session passed it for this launch only as `-RCT_jsLocation 127.0.0.1:8477` instead of editing the app's preference file. (An earlier `simctl spawn ... defaults write` for the same key did not change the app container's plist, which still holds the old port.)

| State | Screenshot |
|---|---|
| Feed from the PR API: 12 listings, photos from PR MinIO, 0-photo card shows `No photo` | [01](screenshots/01-feed.jpg) |
| Sign-in with buyer phone, code screen (mock OTP read from the API service's Railway logs; never recorded) | [02](screenshots/02-otp-entry.jpg) |
| Signed in as the fixture buyer | [03](screenshots/03-signed-in-cabinet.jpg) |
| Feed signed in, scrolled; favourites from the fixture rendered | [05](screenshots/05-feed-signed-in-scrolled.jpg) |
| Detail, 1 photo (`1/1`) | [04](screenshots/04-detail-1-photo.jpg) |
| Detail, 2 photos, gallery `1/2` then swipe to `2/2` | [06](screenshots/06-detail-2-photos-page1.jpg), [07](screenshots/07-detail-2-photos-page2.jpg) |
| Brand picker with imported logos and letter fallback | [08](screenshots/08-brand-picker-logos.jpg) |

[API HTTP log](api-http-native-session.txt) shows `POST /auth/otp/request` and `/auth/otp/verify` returning 201, then `/me`, `/me/listings`, listing list/detail and catalog reads returning 200 from this environment.

Not proven here: simultaneous operation of two simulators (only one device was booted; the second assigned device was not touched). Teardown: app terminated, only this session's Metro (pid 63719) stopped, simulator `38747B85-...` shut down by UUID. iPhone 16e and the second assigned simulator were never touched.

## Gates

Local, non-container (no Docker): `pnpm test:native-pr-seed` 9/9, `pnpm test:agent-docs` and `pnpm check:glossary` plus glossary tests pass, `pnpm typecheck` (11 tasks) pass, `pnpm test:unit` (api 147 files, 1165 tests; 10 tasks) pass, `@auto-tm/db` lint pass, `pnpm install --frozen-lockfile` pass. No mobile source, dependency or config changed, so the Expo install/export gates were not re-run. Container-backed tests are supplied by hosted CI.

Earlier red checkpoints: `26f3eaa` environment guard, `accea61` cross-environment media, `baffcca` private remote mode, `d3e237c` workspace bootstrap resolution, `e263c5e` declared remote seed imports. Node-only remote-steps red source stays on `codex/issue-477-remote-node-red` (`884daca25f824eafeb97c643ac1c2dde218b9319`); keep that branch.

## Scope, access and cleanup

Only PR480 environment configuration was changed (own media origins; unused TCP proxy `d10a3d5f-790b-4ced-9e92-5b5b6c1a14ee` deleted earlier). Environment-scoped project token creation returned `Not Authorized`; the [founder-delegated disposition](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/477#issuecomment-5926410525) allows coordinator CLI authentication, and ADR-0075 states that the name guard is operational while broad credentials can reach production. This session named the PR480 environment ID on every Railway command and touched no other environment. The previous registered `railway-debug` SSH key was used; no key or token was created.

Closed real PR479 environment `04697664-cbe6-4400-8a49-d028824b8bc6` was independently observed absent. PR480's own deletion after merge or close is verified by the orchestrator.
