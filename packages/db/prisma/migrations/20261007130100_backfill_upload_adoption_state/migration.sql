-- ADR-0088 backfill: an upload a Listing media row already adopted is ADOPTED
-- by that Listing. Unclaimed uploads stay AVAILABLE, and no write protocol
-- changes, so an existing unconditional upload is never upgraded. Idempotent;
-- touches no media row and no storage.
UPDATE "media_uploads" AS u
SET "state" = 'ADOPTED', "claimTargetType" = 'listing', "claimTargetId" = m."listingId"
FROM "listing_media" AS m
WHERE m."uploadId" = u."id" AND u."state" = 'AVAILABLE';
