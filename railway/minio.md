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
