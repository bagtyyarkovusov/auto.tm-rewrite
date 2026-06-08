-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "adminTotpExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "suspendedById" TEXT;
ALTER TABLE "users" ADD COLUMN "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "totp_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "totp_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "totp_backup_codes" (
    "id" TEXT NOT NULL,
    "totpEnrollmentId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "totp_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "totp_enrollments_userId_key" ON "totp_enrollments"("userId");

-- CreateIndex (AuditLog S7 additions)
CREATE INDEX "audit_logs_createdAt_id_idx" ON "audit_logs"("createdAt", "id");
CREATE INDEX "audit_logs_action_createdAt_id_idx" ON "audit_logs"("action", "createdAt", "id");
CREATE INDEX "audit_logs_targetType_targetId_createdAt_id_idx" ON "audit_logs"("targetType", "targetId", "createdAt", "id");

-- CreateIndex (ContentReport)
CREATE INDEX "content_reports_status_createdAt_id_idx" ON "content_reports"("status", "createdAt", "id");
CREATE INDEX "content_reports_targetType_targetId_status_idx" ON "content_reports"("targetType", "targetId", "status");
CREATE INDEX "content_reports_reporterUserId_createdAt_id_idx" ON "content_reports"("reporterUserId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "totp_enrollments" ADD CONSTRAINT "totp_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "totp_backup_codes" ADD CONSTRAINT "totp_backup_codes_totpEnrollmentId_fkey" FOREIGN KEY ("totpEnrollmentId") REFERENCES "totp_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
