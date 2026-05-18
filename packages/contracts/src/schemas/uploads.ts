import { z } from "zod";

export const PresignKindSchema = z.enum(["image", "video"]);
export type PresignKind = z.infer<typeof PresignKindSchema>;

export const PresignRequestSchema = z.object({
  kind: PresignKindSchema,
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
});
export type PresignRequest = z.infer<typeof PresignRequestSchema>;

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
  maxSizeBytes: z.number().int().positive(),
});
export type PresignResponse = z.infer<typeof PresignResponseSchema>;
