-- Add structured condition disclosure fields to listings (S9a)
ALTER TABLE "listings"
    ADD COLUMN "accidentReported" BOOLEAN,
    ADD COLUMN "mileageAccurate" BOOLEAN,
    ADD COLUMN "ownerCount" INTEGER,
    ADD COLUMN "serviceHistoryAvailable" BOOLEAN,
    ADD COLUMN "knownIssuesText" TEXT;

-- ownerCount should be between 1 and 20 when present
ALTER TABLE "listings" ADD CONSTRAINT "listings_ownerCount_check" CHECK ("ownerCount" IS NULL OR ("ownerCount" >= 1 AND "ownerCount" <= 20));
