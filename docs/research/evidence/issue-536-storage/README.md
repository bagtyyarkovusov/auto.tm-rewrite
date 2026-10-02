# Issue 536 real storage proof

This is executable HTTP evidence for PR #546 at application commit `152befd62451d11ad9dee7c620107f15e48a7351`. This evidence branch is separate from the application PR and changes no application source or migration.

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

The object guard checks stored content type and a positive size within the kind cap. The original HEAD evidence also records that the bytes uploaded match the fixture size. The application does not require stored size to exactly equal the presign declaration.

Context7 `/websites/aws_amazon_awsjavascriptsdk_v3` confirmed `HeadObjectCommand` metadata semantics and HEAD permissions. The initial `/websites/aws_amazon_s3` lookup had insufficient operation detail. [Official HEAD documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/HeadObjectCommand) confirms stored `ContentType` and `ContentLength`; missing-object HEAD can be 404 or 403 depending on permissions. The PR MinIO behavior is measured by the run.

For expected absent objects, anonymous HEAD accepts and records 403 or 404. A 403 alone cannot distinguish missing data from access denial. Original and variant reads before removal, surviving foreign/fresh originals after removal, and the authenticated API missing-object rejection provide the surrounding evidence.

Results, deployment metadata and remaining limitations are in `evidence.json` after execution. No readiness-only or mocked-storage result is counted as successful adoption.

## Result at 152befd

The live run passed all 81 recorded checks on 2026-10-02, from 13:42:08 to 13:45:07 UTC. Original HEAD returned `image/jpeg` and 709 bytes. The missing original and removed original plus four JPEG derivatives returned 404, so the permitted 403 ambiguity was not encountered in this run.

Publication before and after attachment, same-Listing retry, foreign attachment and publication rejection, forged and missing keys, cross-Listing reuse, owner removal and surviving unrelated originals passed. The API deployment was `f9dd9f9b-a48e-48de-b6df-30cba07ce50b`; worker deployment was `82bc4485-6eb6-4589-9479-f06d57acd9a0`. Exact timestamps are authoritative in `evidence.json`.

Cloud Standards found new defects during this run in [comment 5953656322](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/546#issuecomment-5953656322). This transport evidence does not test the legacy chat namespace cleanup case or concurrent publication with PrismaPg driver-adapter constraint metadata. It does not establish a passing review or permission to merge. Repeat against the final application SHA after source fixes.
