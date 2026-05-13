import { z } from "zod";
import { ListingStatus, Currency } from "../enums";

export const ListingSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priceAmount: z.number(),
  priceCurrency: z.nativeEnum(Currency),
  thumbnailUrl: z.string().url().nullable(),
  status: z.nativeEnum(ListingStatus),
  publishedAt: z.string().datetime().nullable(),
});
export type ListingSummary = z.infer<typeof ListingSummarySchema>;
