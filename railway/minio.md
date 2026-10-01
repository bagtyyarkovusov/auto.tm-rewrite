# Railway MinIO Contract

Sprint 11 issue #272 defines the repository-owned MinIO contract. The image and volume contract is updated by
[ADR-0074](../docs/adr/0074-digest-pinned-chainguard-minio-images.md).

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

## Image and rollout

Use the minimal image, with no shell health probe:

```text
cgr.dev/chainguard/minio@sha256:4692462f35d97d7e82c30371d82f057703c5d9489bcae726010594c812f2d285
```

Set the service start command to `/usr/bin/minio server /data --console-address
:9001` and `RAILWAY_RUN_UID=0`. The image defaults to UID 65532; Railway volumes
are root-owned, so this documented override preserves existing volume writes.
Keep the existing volume ID and `/data` mount, root credentials, domains, and
private endpoint. The console stays private. Railway's external health check
uses `/minio/health/live` on port 9000 and needs no dev image.

After repository checks and review pass, change staging first. Record its
service, volume, image, command, and deployment ID before and after. Verify
existing object reads and a write/read/delete of a disposable verification object,
then rerun the bucket bootstrap to verify all four buckets and policies.
Do not delete or replace the volume, recursively change ownership, or edit
production during the staging rollout. The production service can retain its
previous image until an operator schedules that separate rollout; its target
image and runtime configuration are the contract above.

MinIO is AGPL-3.0-or-later; inspect the image SBOM for dependency licenses.
Pinned builds require a reviewed refresh and the runtime checks listed in
ADR-0074. See [Railway volume permissions](https://docs.railway.com/volumes#permissions).

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
- `catalog-assets` (brand logos under versioned `brands/<slug>/v<n>/` keys, and admin uploads under `pending/`, which the API deletes on confirm; an upload that is never confirmed stays until removed by hand, and like every object in the bucket it is readable by anyone who knows its random key)

When a bucket is added to this list, re-run `pnpm minio:bootstrap` against each
environment's MinIO before deploying the API that uses it. Until then, requests
that write to the missing bucket fail. `catalog-assets` was added for brand logos.

Each bucket receives an anonymous policy for `s3:GetObject` only. Anonymous
`s3:PutObject` is not granted; uploads use short-lived signed PUT URLs produced
by the API.

## Backup And Restore

Backups capture object bytes, bucket policies, and a SHA-256 manifest:

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
