-- Issue #360: store every Listing price in TMT so price sort and the Results
-- price range use one currency and one index.
ALTER TABLE "listings" ADD COLUMN "priceTmt" DOUBLE PRECISION;

-- Backfill at the current rates. Keep this expression identical to
-- `recomputeListingPricesTmt` in packages/db/src/listing-prices.ts.
-- A non-TMT price without a positive `<currency> -> TMT` rate stays NULL.
UPDATE "listings" AS l
SET "priceTmt" = CASE
    WHEN l."priceCurrency" = 'TMT' THEN l."priceAmount"
    ELSE l."priceAmount" * r."rate"
END
FROM "listings" AS src
LEFT JOIN "exchange_rates" AS r
    ON r."fromCurrency" = src."priceCurrency"
   AND r."toCurrency" = 'TMT'
   AND r."rate" > 0
WHERE src."id" = l."id";

-- One index per sort key, led by status so the feed's `status = 'active'`
-- predicate and the order share one ordered index scan.
CREATE INDEX "listings_status_priceTmt_id_idx" ON "listings"("status", "priceTmt", "id");

CREATE INDEX "listings_status_year_id_idx" ON "listings"("status", "year", "id");

CREATE INDEX "listings_status_mileageKm_id_idx" ON "listings"("status", "mileageKm", "id");
