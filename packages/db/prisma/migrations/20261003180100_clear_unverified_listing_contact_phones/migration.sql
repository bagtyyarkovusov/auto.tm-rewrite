-- #592 / ADR-0056 "existing values are discarded"; founder decision on #354
-- (option A). Before ADR-0081 a Listing's contact phone was free text, so a
-- stored value may be a number nobody confirmed. Clear every Listing contact
-- phone that is neither its seller's sign-in phone nor a number the seller
-- holds a verified_contact_phones row for.
--
-- * Safe to run twice: a second run finds nothing to clear.
-- * A Listing keeps its status and updatedAt. A cleared Listing still shows and
--   takes chat if enabled; republish or a contact change answers
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
