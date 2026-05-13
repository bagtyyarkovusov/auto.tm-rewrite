import { z } from "zod";

export const BrandSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().url().nullable(),
});
export type BrandSummary = z.infer<typeof BrandSummarySchema>;
