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

/** Fewest characters a Display Name may have, after normalizing. */
export const DISPLAY_NAME_MIN = 2;
/** Most characters a Display Name may have, after normalizing. */
export const DISPLAY_NAME_MAX = 30;

/**
 * The form a Display Name is stored in: spaces at the ends dropped and runs
 * of whitespace turned into one space. The app counts and saves this form.
 */
export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Why a Display Name is refused; sent as `details.reason` on INVALID_DISPLAY_NAME. */
export const DisplayNameProblem = {
  Empty: "empty",
  TooShort: "too_short",
  TooLong: "too_long",
} as const;
export type DisplayNameProblem =
  (typeof DisplayNameProblem)[keyof typeof DisplayNameProblem];

export const InvalidDisplayNameDetailsSchema = z.object({
  reason: z.nativeEnum(DisplayNameProblem),
});
export type InvalidDisplayNameDetails = z.infer<typeof InvalidDisplayNameDetailsSchema>;

/** Number of characters as a reader counts them: Unicode code points. */
export function displayNameLength(raw: string): number {
  return Array.from(normalizeDisplayName(raw)).length;
}

/**
 * The one Display Name rule, shared by the API and the app: 2 to 30 code
 * points after normalizing. Any script, digit or emoji passes; names are not
 * unique and are not moderated. Answers nothing for an acceptable name.
 */
export function displayNameProblem(raw: string): DisplayNameProblem | undefined {
  const length = displayNameLength(raw);
  if (length === 0) return DisplayNameProblem.Empty;
  if (length < DISPLAY_NAME_MIN) return DisplayNameProblem.TooShort;
  if (length > DISPLAY_NAME_MAX) return DisplayNameProblem.TooLong;
  return undefined;
}

/**
 * Body of `PATCH /api/v1/me`. Only the name can change; other fields are
 * dropped. The rule itself is checked by the server, which answers
 * INVALID_DISPLAY_NAME with the reason.
 */
export const UpdateMeRequestSchema = z.object({
  displayName: z.string(),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;

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
