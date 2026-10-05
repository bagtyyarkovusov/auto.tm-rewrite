import { z } from "zod";

import { type Locale, UserRole } from "../enums";

export const GENERATED_NAME_PREFIX: Record<Locale, string> = { en: "", ru: "", tk: "" };

export const AVATAR_COUNT = 0;

export function formatDisplayName(
  _user: { displayName: string | null; nameNumber: number },
  _locale: string,
): string {
  throw new Error("Not implemented");
}

export const UserSummarySchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  displayName: z.string().nullable(),
  role: z.nativeEnum(UserRole),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const BlockUserRequestSchema = z.object({
  userId: z.string().uuid(),
});
export type BlockUserRequest = z.infer<typeof BlockUserRequestSchema>;

export const BlockUserResponseSchema = z.object({
  blocked: z.literal(true),
});
export type BlockUserResponse = z.infer<typeof BlockUserResponseSchema>;

export const UnblockUserResponseSchema = z.object({
  unblocked: z.literal(true),
});
export type UnblockUserResponse = z.infer<typeof UnblockUserResponseSchema>;

export const IsBlockedResponseSchema = z.object({
  blocked: z.boolean(),
});
export type IsBlockedResponse = z.infer<typeof IsBlockedResponseSchema>;
