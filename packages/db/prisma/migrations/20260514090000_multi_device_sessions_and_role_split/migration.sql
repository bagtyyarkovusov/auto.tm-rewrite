-- Drop User.refreshTokenHash (moved to per-session per ADR-0012)
ALTER TABLE "users" DROP COLUMN "refreshTokenHash";

-- Rebuild Session FK with ON DELETE CASCADE
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- Drop plaintext refreshToken column + index (replaced by hash per ADR-0012)
DROP INDEX IF EXISTS "sessions_refreshToken_key";
ALTER TABLE "sessions" DROP COLUMN "refreshToken";

-- Add new session columns per ADR-0012
ALTER TABLE "sessions" ADD COLUMN "refreshTokenHash" TEXT NOT NULL;
ALTER TABLE "sessions" ADD COLUMN "deviceLabel" TEXT;
ALTER TABLE "sessions" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "sessions" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Re-add FK with CASCADE + unique on refreshTokenHash + index on userId
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateEnum DealershipMemberRole per ADR-0013
CREATE TYPE "DealershipMemberRole" AS ENUM ('owner', 'sales');

-- Add role column to dealership_members
ALTER TABLE "dealership_members" ADD COLUMN "role" "DealershipMemberRole" NOT NULL DEFAULT 'sales';
ALTER TABLE "dealership_members" ALTER COLUMN "role" DROP DEFAULT;

-- Enforce at-most-one-dealership-per-user per ADR-0013
DROP INDEX IF EXISTS "dealership_members_dealershipId_userId_key";
CREATE UNIQUE INDEX "dealership_members_userId_key" ON "dealership_members"("userId");
