import { BadRequestException } from "@nestjs/common";
import type { ZodError } from "zod";

import { ErrorCode } from "@auto-tm/contracts";

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
