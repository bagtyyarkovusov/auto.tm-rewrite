import { z } from "zod";

export const CursorPaginationRequestSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorPaginationRequest = z.infer<
  typeof CursorPaginationRequestSchema
>;

export const CursorPaginationResponseSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type CursorPaginationResponse = z.infer<
  typeof CursorPaginationResponseSchema
>;

export const OffsetPaginationRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
});
export type OffsetPaginationRequest = z.infer<
  typeof OffsetPaginationRequestSchema
>;

export const OffsetPaginationResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(10).max(200),
  totalPages: z.number().int().nonnegative(),
});
export type OffsetPaginationResponse = z.infer<
  typeof OffsetPaginationResponseSchema
>;
