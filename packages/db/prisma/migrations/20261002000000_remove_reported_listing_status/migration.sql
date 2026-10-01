-- #328 / #497: `reported` was added for a later sprint, but moderation was built
-- with separate ContentReport rows and `banned`, and nothing writes `reported`.
-- Postgres cannot drop one enum value, so the type is recreated without it.
--
-- There is deliberately no UPDATE. The column cast below raises
-- `invalid input value for enum "ListingStatus_new": "reported"` and aborts the
-- transaction if any row still holds `reported`, so the migration itself checks
-- the data. Do not edit rows by hand to get past it; report the failure.

-- AlterEnum
BEGIN;
CREATE TYPE "ListingStatus_new" AS ENUM ('draft', 'pending_review', 'active', 'sold', 'archived', 'rejected', 'banned');
ALTER TABLE "listings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "listings" ALTER COLUMN "status" TYPE "ListingStatus_new" USING ("status"::text::"ListingStatus_new");
ALTER TYPE "ListingStatus" RENAME TO "ListingStatus_old";
ALTER TYPE "ListingStatus_new" RENAME TO "ListingStatus";
DROP TYPE "ListingStatus_old";
ALTER TABLE "listings" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;
