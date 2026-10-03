-- #592 / ADR-0056 "existing values are discarded"; founder decision on #354
-- (option A). Before ADR-0081 a Listing's contact phone was free text, so a
-- stored value may be a number nobody confirmed. Clear every Listing contact
-- phone that is neither its seller's sign-in phone nor a number the seller
-- holds a verified_contact_phones row for.
--
-- * Idempotent at deploy time: a second run straight after the first finds
--   nothing to clear. Prisma applies it once; re-running it later could clear a
--   seller's former sign-in phone, which a Listing keeps under ADR-0081.
-- * A Listing keeps its status and updatedAt. A cleared Listing still shows,
--   takes chat if enabled and takes edits; republish answers
--   CONTACT_PHONE_REQUIRED until the seller sets a number.
-- * Draft payloads are not touched; a draft is checked when it is published.
UPDATE "listings" l
SET "contactPhone" = NULL
WHERE l."contactPhone" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "users" u
    WHERE u."id" = l."sellerId" AND u."phone" = l."contactPhone"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "verified_contact_phones" v
    WHERE v."sellerId" = l."sellerId" AND v."phone" = l."contactPhone"
  );
