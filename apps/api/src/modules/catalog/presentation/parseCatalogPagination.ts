import { BadRequestException } from "@nestjs/common";
import { z, type ZodError } from "zod";

import { CursorPaginationRequestSchema, ErrorCode } from "@auto-tm/contracts";

// Matches what the catalog encoders write: the localized name and id of the
// last row of the previous page (the Prisma brand, model and city
// repositories), JSON-encoded as base64 by `encodeCatalogCursor`. A localized
// name may be empty, so only the id must be non-empty.
const CatalogCursorSchema = z.object({
  name: z.string(),
  id: z.string().min(1),
});

export type CatalogCursor = z.infer<typeof CatalogCursorSchema>;

export interface CatalogPagination {
  cursor?: CatalogCursor;
  limit: number;
}

/**
 * Parses a catalog query with a contracts schema. A value the schema refuses,
 * such as an unknown `locale`, is a client error, never a 500: it becomes a
 * 400 `VALIDATION_FAILED` with the flattened field errors.
 */
export function parseCatalogQuery<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    // Duck-typed: the schema's ZodError can come from another copy of zod,
    // which fails `instanceof` and would turn a bad request into a 500.
    if (err && typeof err === "object" && "issues" in err) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: "Invalid request",
        details: (err as ZodError).flatten(),
      });
    }
    throw err;
  }
}

/**
 * Parses cursor pagination for the catalog list endpoints. A malformed or
 * forged cursor and an invalid limit are client errors, never a 500: this
 * helper translates them into a 400 `VALIDATION_FAILED`.
 */
export function parseCatalogPagination(query: unknown): CatalogPagination {
  const request = parseCatalogQuery(CursorPaginationRequestSchema, query);

  if (request.cursor === undefined) {
    return { limit: request.limit };
  }

  try {
    const cursor = CatalogCursorSchema.parse(
      JSON.parse(Buffer.from(request.cursor, "base64").toString("utf-8")),
    );
    return { cursor, limit: request.limit };
  } catch {
    throw new BadRequestException({
      code: ErrorCode.ValidationFailed,
      message: "Invalid cursor",
      details: { reason: "INVALID_CURSOR" },
    });
  }
}

export function encodeCatalogCursor(cursor: CatalogCursor | undefined): string | null {
  return cursor
    ? Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64")
    : null;
}
