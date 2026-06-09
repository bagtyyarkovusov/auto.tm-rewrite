-- AlterTable
ALTER TABLE "users" ADD COLUMN "deletionScheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "archivedByDeletion" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "users_deletionScheduledAt_idx" ON "users"("deletionScheduledAt");
