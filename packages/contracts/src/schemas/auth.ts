import { z } from "zod";

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
});
export type OtpVerifyRequest = z.infer<typeof OtpVerifyRequestSchema>;

export const OtpVerifyResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    phone: PhoneTm,
    displayName: z.string().nullable(),
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
