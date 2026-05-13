import { z } from "zod";

// Phase 2 stub — full schema lands in S11
export const InspectionReportSummarySchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  inspectorId: z.string().uuid(),
  completedAt: z.string().datetime().nullable(),
});
export type InspectionReportSummary = z.infer<
  typeof InspectionReportSummarySchema
>;
