import { z } from "zod";

import { Locale, UserRole } from "../enums";

/**
 * The prefix of a Generated Name in each app locale: "Driver 4821". RU and TK
 * are drafts awaiting a native-speaker pass (#353, slicing answer 4).
 */
export const GENERATED_NAME_PREFIX: Readonly<Record<Locale, string>> = {
  en: "Driver",
  ru: "Водитель",
  tk: "Sürüji",
};

/**
 * Number of car avatars bundled in the app. `avatarIndex` points into this
 * set; the order is fixed and may only grow at the end. An app that receives
 * an index it does not have takes it modulo its own set size.
 */
export const AVATAR_COUNT = 12;

const DEFAULT_LOCALE: Locale = Locale.Ru;

function isLocale(value: string): value is Locale {
  return Object.prototype.hasOwnProperty.call(GENERATED_NAME_PREFIX, value);
}

/**
 * The name to show for a User: their Display Name, trimmed, when they set
 * one; otherwise the Generated Name in the reader's locale. An unknown locale
 * falls back to the app default, Russian.
 */
export function formatDisplayName(
  user: { displayName: string | null; nameNumber: number },
  locale: string,
): string {
  const displayName = user.displayName?.trim() ?? "";
  if (displayName.length > 0) {
    return displayName;
  }
  const prefix = GENERATED_NAME_PREFIX[isLocale(locale) ? locale : DEFAULT_LOCALE];
  return `${prefix} ${user.nameNumber}`;
}

/**
 * What one User may see of another (#644): the name they set or null, the
 * number and car avatar index for their Generated Name and Assigned Avatar,
 * and the profile photo key, null until photos ship. `deleted` is true for a
 * User purged after account deletion: no name and no photo, and the app keeps
 * its deleted-User wording and person icon. Never carries a Sign-in Method,
 * the role or an upload id. Compose the name with `formatDisplayName`.
 */
export const PublicIdentitySchema = z.object({
  displayName: z.string().nullable(),
  nameNumber: z.number().int().min(1000).max(9999),
  avatarIndex: z.number().int().nonnegative(),
  avatarKey: z.string().nullable(),
  deleted: z.boolean(),
});
export type PublicIdentity = z.infer<typeof PublicIdentitySchema>;

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
