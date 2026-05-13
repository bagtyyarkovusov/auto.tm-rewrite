import { z } from "zod";

import { UserRole } from "../enums";

export const UserSummarySchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  displayName: z.string().nullable(),
  role: z.nativeEnum(UserRole),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;
