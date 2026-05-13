import { z } from "zod";

import { NotificationCategory } from "../enums";

export const NotificationSummarySchema = z.object({
  id: z.string().uuid(),
  category: z.nativeEnum(NotificationCategory),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});
export type NotificationSummary = z.infer<typeof NotificationSummarySchema>;
