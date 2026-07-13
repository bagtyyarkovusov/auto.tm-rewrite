import { z } from "zod";

import { NotificationCategory, PushPlatform } from "../enums";

export const NotificationCategorySchema = z.nativeEnum(NotificationCategory);
export type NotificationCategoryType = z.infer<
  typeof NotificationCategorySchema
>;

export const PushPlatformSchema = z.nativeEnum(PushPlatform);
export type PushPlatformType = z.infer<typeof PushPlatformSchema>;

export const NotificationSummarySchema = z.object({
  id: z.string().uuid(),
  category: NotificationCategorySchema,
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});
export type NotificationSummary = z.infer<typeof NotificationSummarySchema>;

// ── Direct-message push-token registration (native FCM/APNS tokens) ──

export const RegisterPushTokenRequestSchema = z.object({
  token: z.string().min(1),
  platform: PushPlatformSchema,
  deviceId: z.string().optional(),
});
export type RegisterPushTokenRequest = z.infer<
  typeof RegisterPushTokenRequestSchema
>;

export const RegisterPushTokenResponseSchema = z.object({
  registered: z.boolean(),
  invalidatedPrevious: z.boolean().optional(),
});
export type RegisterPushTokenResponse = z.infer<
  typeof RegisterPushTokenResponseSchema
>;

// ── Per-category opt-outs (direct_messages is not globally disableable) ──

export const NotificationPreferenceOptOut = {
  Push: "push",
  Digest: "digest",
  None: "none",
} as const;
export type NotificationPreferenceOptOut =
  (typeof NotificationPreferenceOptOut)[keyof typeof NotificationPreferenceOptOut];

export const NotificationPreferenceOptOutSchema = z.enum(
  Object.values(NotificationPreferenceOptOut) as [
    NotificationPreferenceOptOut,
    ...NotificationPreferenceOptOut[],
  ],
);
export type NotificationPreferenceOptOutType = z.infer<
  typeof NotificationPreferenceOptOutSchema
>;

export const NotificationPreferencesSchema = z.object({
  optOuts: z.record(NotificationCategorySchema, NotificationPreferenceOptOutSchema),
});
export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;

export const UpdateNotificationPreferencesRequestSchema =
  NotificationPreferencesSchema;
export type UpdateNotificationPreferencesRequest = z.infer<
  typeof UpdateNotificationPreferencesRequestSchema
>;

export const UpdateNotificationPreferencesResponseSchema =
  NotificationPreferencesSchema;
export type UpdateNotificationPreferencesResponse = z.infer<
  typeof UpdateNotificationPreferencesResponseSchema
>;
