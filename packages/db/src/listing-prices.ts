import type { PrismaClient } from "../generated/prisma/client/client";

type RawExecutor = Pick<PrismaClient, "$executeRaw">;

/**
 * Rewrites `listings.priceTmt` from `priceAmount` and the stored `<currency> -> TMT`
 * exchange rates. Run it after any exchange-rate change. A non-TMT price without a
 * positive rate becomes NULL. Only rows whose value changes are written, and
 * `updatedAt` is left alone because a rate change is not a Listing edit.
 *
 * Keep the expression identical to the backfill in migration
 * `20260928000000_add_listing_price_tmt`.
 *
 * @returns the number of Listings whose `priceTmt` changed
 */
export async function recomputeListingPricesTmt(db: RawExecutor): Promise<number> {
  return db.$executeRaw`
    UPDATE "listings" AS l
    SET "priceTmt" = computed."priceTmt"
    FROM (
      SELECT
        src."id",
        CASE
          WHEN src."priceCurrency" = 'TMT' THEN src."priceAmount"
          ELSE src."priceAmount" * r."rate"
        END AS "priceTmt"
      FROM "listings" AS src
      LEFT JOIN "exchange_rates" AS r
        ON r."fromCurrency" = src."priceCurrency"
       AND r."toCurrency" = 'TMT'
       AND r."rate" > 0
    ) AS computed
    WHERE computed."id" = l."id"
      AND l."priceTmt" IS DISTINCT FROM computed."priceTmt"
  `;
}
