import { z } from "zod";

import { Locale } from "../enums";

export const BlogPostSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  locale: z.nativeEnum(Locale),
  publishedAt: z.string().datetime().nullable(),
});
export type BlogPostSummary = z.infer<typeof BlogPostSummarySchema>;
