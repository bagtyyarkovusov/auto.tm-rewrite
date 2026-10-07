-- ADR-0088: one adopter per upload across Listing media and Profile Photos,
-- permanent retirement, and durable deletion work. Additive only.

ALTER TABLE "media_uploads"
  ADD COLUMN "state" TEXT NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN "claimToken" TEXT,
  ADD COLUMN "claimTargetType" TEXT,
  ADD COLUMN "claimTargetId" TEXT,
  ADD COLUMN "claimDeadline" TIMESTAMP(3),
  ADD COLUMN "retiredAt" TIMESTAMP(3);

ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_state_check"
  CHECK ("state" IN ('AVAILABLE', 'PREPARING', 'ADOPTED', 'RETIRED', 'DELETED')) NOT VALID;
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_claim_target_check"
  CHECK ("state" NOT IN ('PREPARING', 'ADOPTED') OR
    ("claimTargetType" IN ('listing', 'profile') AND "claimTargetId" IS NOT NULL)) NOT VALID;
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_preparation_check"
  CHECK ("state" <> 'PREPARING' OR ("claimToken" IS NOT NULL AND "claimDeadline" IS NOT NULL)) NOT VALID;
ALTER TABLE "media_uploads" VALIDATE CONSTRAINT "media_uploads_state_check";
ALTER TABLE "media_uploads" VALIDATE CONSTRAINT "media_uploads_claim_target_check";
ALTER TABLE "media_uploads" VALIDATE CONSTRAINT "media_uploads_preparation_check";

CREATE INDEX "media_uploads_state_claimDeadline_idx" ON "media_uploads"("state", "claimDeadline");
CREATE INDEX "media_uploads_claimToken_idx" ON "media_uploads"("claimToken");

ALTER TABLE "users" ADD COLUMN "avatarUploadId" TEXT;
CREATE UNIQUE INDEX "users_avatarUploadId_key" ON "users"("avatarUploadId");
ALTER TABLE "users" ADD CONSTRAINT "users_avatarUploadId_fkey"
  FOREIGN KEY ("avatarUploadId") REFERENCES "media_uploads"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE TABLE "media_upload_cleanups" (
  "uploadId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "objectKeys" TEXT[],
  "writeProtocol" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "media_upload_cleanups_pkey" PRIMARY KEY ("uploadId"),
  CONSTRAINT "media_upload_cleanups_status_check"
    CHECK ("status" IN ('PENDING', 'LEGACY_PENDING', 'DONE'))
);
CREATE INDEX "media_upload_cleanups_status_nextAttemptAt_idx"
  ON "media_upload_cleanups"("status", "nextAttemptAt");
