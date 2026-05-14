import { z } from "zod";

import { UserRole } from "../enums";

export const PhoneTm = z.string().regex(
  /^\+993[67]\d{7}$/,
  "Phone must be +993[6-7]XXXXXXX (TM mobile)",
);

export const OtpRequestRequestSchema = z.object({
  phone: PhoneTm,
});
export type OtpRequestRequest = z.infer<typeof OtpRequestRequestSchema>;

export const OtpRequestResponseSchema = z.object({
  requestId: z.string().uuid(),
  resendInSeconds: z.number().int(),
  testCode: z.string().optional(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponseSchema>;

export const OtpVerifyRequestSchema = z.object({
  phone: PhoneTm,
  code: z.string().regex(/^\d{6}$/),
  deviceLabel: z.string().max(200).optional(),
});
export type OtpVerifyRequest = z.infer<typeof OtpVerifyRequestSchema>;

export const OtpVerifyResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    phone: PhoneTm,
    displayName: z.string().nullable(),
    role: z.nativeEnum(UserRole),
  }),
});
export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponseSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const LogoutRequestSchema = z.object({
  refreshToken: z.string(),
});
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

// No request body — uses bearer access token
export const LogoutAllResponseSchema = z.object({});

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  phone: PhoneTm,
  displayName: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  avatarUrl: z.string().nullable(),
  locale: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// No request body — uses bearer access token; returns 204
export const DeleteMeResponseSchema = z.object({});
