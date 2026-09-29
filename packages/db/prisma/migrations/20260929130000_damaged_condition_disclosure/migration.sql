-- ADR-0052: the seller condition disclosure is "Damaged / needs repair" plus
-- Known issues. No data is migrated; every environment is reseeded.
ALTER TABLE "listings" DROP COLUMN "accidentReported",
DROP COLUMN "mileageAccurate",
DROP COLUMN "ownerCount",
DROP COLUMN "serviceHistoryAvailable",
ADD COLUMN "damaged" BOOLEAN;
