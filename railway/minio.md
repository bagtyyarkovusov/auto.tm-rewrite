# Railway MinIO Contract

Sprint 11 issue #272 defines the repository-owned MinIO contract. Provisioning
the Railway service and volume remains a later human-in-the-loop task.

## Runtime Shape

- One MinIO service per environment.
- One persistent data mount at `/data`; on Railway this must be a single
  persistent volume mounted at `/data`.
- S3 API listens on `9000`.
- Console listens on `9001` but is not exposed publicly.
- `api` and future media workers use `MINIO_ENDPOINT` over private networking
  for administrative S3 operations.
- `MINIO_PUBLIC_URL` is the public S3 API origin used only for anonymous media
  reads and presigned direct client PUT URLs.

`APP_ENV=staging|production` rejects unsafe API configs where
`MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` resolve to the same host, where the
public URL is internal/private, or where production media is not HTTPS.

## Buckets

The bucket set is explicit and idempotently bootstrapped by:

```sh
MINIO_ENDPOINT=http://localhost:9000 \
MINIO_ACCESS_KEY=minioadmin \
MINIO_SECRET_KEY=minioadmin \
MINIO_REGION=us-east-1 \
pnpm minio:bootstrap
```

Buckets:

- `listing-photos`
- `listing-videos`
- `chat-attachments`
- `catalog-assets`: anonymous reads cover only `brands/*`, including imported `imp-<hash>-<uuid>` and admin `v<epoch-ms>-<uuid>` activation directories (legacy `imp-<hash>` and `v<n>` directories stay readable while active). Replacing, removing or deleting a logo deletes its whole activation directory, best effort ([ADR-0072](../docs/adr/0072-imported-logo-cleanup-coordination.md)); whole-prefix deletion must not be enabled until every old API logo writer and deterministic importer process has stopped. Admin uploads under `pending/` are private. Confirmation deletes them; abandoned uploads are eligible for lifecycle expiration after one day. MinIO scanning is asynchronous, so deletion can occur later than that threshold.

When a bucket is added to this list, re-run `pnpm minio:bootstrap` against each
environment's MinIO before deploying the API that uses it. Until then, requests
that write to the missing bucket fail. `catalog-assets` was added for brand logos.

Each bucket receives an anonymous policy for `s3:GetObject` only. The catalog grant is restricted to `brands/*`; the other buckets retain their full object read scope. Bootstrap reapplies the catalog pending-only lifecycle on every run. Re-run it in each environment before deploying this change, through the environment's authorized operator. Anonymous
`s3:PutObject` is not granted; uploads use short-lived signed PUT URLs produced
by the API.

## Backup And Restore

Backups capture object bytes, bucket policies, and a SHA-256 manifest. Catalog backups must contain the scoped `brands/*` policy. Legacy whole-bucket catalog policies are rejected, so re-bootstrap before creating a new backup. Lifecycle settings are repository-owned rather than captured in the v1 manifest; restore reestablishes the one-day pending rule during bootstrap:

```sh
pnpm minio:backup /tmp/autotm-minio-backup
```

Restores are safe to rerun against isolated/non-production data. The restore
path bootstraps the bucket, reapplies the captured policy, verifies every local
object checksum before upload, uploads the object, reads it back, and verifies
the restored checksum:

```sh
pnpm minio:restore /tmp/autotm-minio-backup
```

Do not run restore over production as a drill. Restore into isolated data first
and record the evidence in the deployment runbook.

## Direct upload length

Brand-logo and listing-media presigned PUTs bind the declared `sizeBytes` as `Content-Length`. Uploaders send the exact binary body; their HTTP transport supplies its length. No client-set Content-Length header is required. A different length fails signature verification before the upload is accepted. Brand confirmation still checks HEAD and downloaded byte length and validates image content. Signing length does not establish MIME type or image safety.
