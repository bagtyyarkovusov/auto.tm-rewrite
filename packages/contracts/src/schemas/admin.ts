import { z } from "zod";

export const AuditLogEntrySummarySchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  action: z.string(),
  target: z.string(),
  createdAt: z.string().datetime(),
});
export type AuditLogEntrySummary = z.infer<typeof AuditLogEntrySummarySchema>;
