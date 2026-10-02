# Issue 536 real storage proof

This is executable HTTP evidence for PR #546 at final application commit `b7ce7568b9a447cb9b109e6bf5b0063dfbf303b2`. The earlier run at `152befd62451d11ad9dee7c620107f15e48a7351` stays readable at evidence commit `e2e81d76e81025236442b870dc670197bbb52a89`. This evidence branch is separate from the application PR and changes no application source or migration.

The run is restricted to Railway environment `auto.tm-rewrite-pr-546`, ID `6f951120-4ee3-4b03-8520-b64e12e8b354`. It requires the coordinator to confirm exact-commit readiness and completed seed first. It does not seed, reset the environment, access Railway credentials or write to existing fixture Listings. It publishes new private proof Listings belonging to two fixture callers, creates its own uploads and removes only its own attached media and rejected draft. Successful proof Listings remain for inspection until the PR environment is retired.

## Run

Obtain fixture authentication through the PR API's mock Sign-in Code flow. Store authentication in an owner-only file outside the repository. Never paste authentication, Sign-in Codes or signed URLs into terminal output, Git or PR comments.

The configuration file has `readyConfirmed` and `seedConfirmed` set to `true` only after coordinator confirmation, `commitSha`, `environmentId`, `apiDeploymentId`, `workerDeploymentId`, `ownerToken`, and `foreignToken`. The callers must be different Users. Run without optimized Python, so startup assertions remain enabled:

```sh
python3 docs/research/evidence/issue-536-storage/prove.py /tmp/private-pr546-config.json /tmp/pr546-storage-evidence.json
```

The script uses Python's standard library and the checked-in valid JPEG. Each HTTP operation has a 60-second timeout, and writes are never retried. On failure it preserves partial sanitized evidence and stops. The output contains harmless User, Listing, draft and media IDs, storage keys, HTTP statuses and public HEAD metadata. Signed PUT URLs remain in memory only. Network exception text is omitted because it can contain signed URLs.

## Contracts and evidence boundaries

The script follows the pinned published request schemas in `packages/contracts/src/schemas/listings.ts` and HTTP presentation controllers. Presign binds to the User; attachment and publication bind to the Listing. A fresh owner draft is published after the attachment run using another freshly presigned and uploaded image. Real public HEAD confirms original metadata and derivative existence; successful adoption and the missing-object rejection exercise the API's private `HeadObjectCommand` path. This is direct HTTP storage proof, not native UI evidence or a substitute for hosted concurrency tests.

The script reads `/readyz` before and after the run and records both bodies with timestamps. For the second fix round, it checks that every proof key has the exact `pending/<UUID v4>/original.(jpg|webp|mp4)` cleanup shape. It also checks that removing one Listing photo leaves a same-Listing sibling original and its four derivatives in place. Three rounds fire publication and attachment of the same upload concurrently, with attachment starting 0, 0.25 or 0.6 seconds after publication. Each round requires exactly one 201, a 409 `UPLOAD_ALREADY_ATTACHED` for the loser and no 5xx. The attach winners are then removed, and their originals must return 404. HTTP cannot make the interleaving deterministic or show which publication branch produced the 409.

The object guard checks stored content type and a positive size within the kind cap. The original HEAD evidence also records that the bytes uploaded match the fixture size. The application does not require stored size to exactly equal the presign declaration.

Context7 `/websites/aws_amazon_awsjavascriptsdk_v3` confirmed `HeadObjectCommand` metadata semantics and HEAD permissions. The initial `/websites/aws_amazon_s3` lookup had insufficient operation detail. [Official HEAD documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/HeadObjectCommand) confirms stored `ContentType` and `ContentLength`; missing-object HEAD can be 404 or 403 depending on permissions. The PR MinIO behavior is measured by the run.

For expected absent objects, anonymous HEAD accepts and records 403 or 404. A 403 alone cannot distinguish missing data from access denial. Original and variant reads before removal, surviving foreign/fresh originals after removal, and the authenticated API missing-object rejection provide the surrounding evidence.

Results, deployment metadata and remaining limitations are in `evidence.json` after execution. No readiness-only or mocked-storage result is counted as successful adoption.

## Result at b7ce756

The live run passed all 118 recorded checks on 2026-10-02, from 15:35:01 to 15:41:34 UTC. There were no failures and 3 states not exercised. The API deployment was `1f81f0df-8a3d-4307-90b6-ca2dea1129f3` and the worker deployment `3d763955-afaa-4d4e-a5a6-f56019de3472`. `/readyz` before and after reported `ready`, postgres/redis/minio `ok`, commit `b7ce756` and environment `auto.tm-rewrite-pr-546`.

All 81 states from the 152befd run passed again. Original HEAD returned `image/jpeg` and 709 bytes. The missing original, and the removed original with its four JPEG derivatives, returned 404, so the permitted 403 ambiguity did not occur. Removal deleted only that original and its derivatives. The same-Listing sibling original, its derivatives, and the foreign and freshly published originals all survived.

The race went both ways. In round 1 attachment won and publication got 409 `UPLOAD_ALREADY_ATTACHED`. In rounds 2 and 3 publication won, attachment got 409 `UPLOAD_ALREADY_ATTACHED`, and the published Listing held exactly one media row for the key. No request returned 5xx.

Not exercised, with reasons in `evidence.json`:

- Legacy chat-namespace cleanup needs a database fixture mutation.
- HTTP cannot tell which publication branch produced the 409.
- mp4 cleanup needs a real video fixture.

Hosted `pr` run 37017439151 covers all three, including the deterministic real-Postgres race on the PrismaPg P2002 branch. This evidence does not establish a passing review or permission to merge. Exact timestamps are authoritative in `evidence.json`.
