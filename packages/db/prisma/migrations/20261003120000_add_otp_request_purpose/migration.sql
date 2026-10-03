-- #591 / ADR-0081: every Sign-in Code stores why it was issued, and each
-- verify accepts only codes of its own purpose.
--
-- The CreateEnum statement comes from `prisma migrate diff` (schema to schema).
-- The column is added nullable, backfilled, then made required, by hand.
--
-- Backfill rule (ADR-0081): every existing row becomes `sign_in`. A Sign-in
-- Method change or web deletion code still in flight when this runs (phone
-- codes live 5 minutes, email codes 10) therefore fails closed under strict
-- binding and must be requested again. Old rows still count toward the shared
-- per-destination, per-IP and backoff limits, which read every purpose.

-- CreateEnum
CREATE TYPE "CodePurpose" AS ENUM ('sign_in', 'sign_in_method', 'account_deletion', 'listing_contact_phone');

-- AlterTable
ALTER TABLE "otp_requests" ADD COLUMN "purpose" "CodePurpose";

-- Backfill
UPDATE "otp_requests" SET "purpose" = 'sign_in' WHERE "purpose" IS NULL;

-- AlterTable
ALTER TABLE "otp_requests" ALTER COLUMN "purpose" SET NOT NULL;
