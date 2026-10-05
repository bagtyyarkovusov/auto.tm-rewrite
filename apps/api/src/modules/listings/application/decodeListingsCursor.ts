import { BadRequestException } from "@nestjs/common";

import { ErrorCode, ListingsSchemas } from "@auto-tm/contracts";

import { LISTING_ERROR_CODES } from "../domain/types";

/**
 * Decodes a `{ timestamp, id }` keyset cursor. A malformed or forged token is a
 * client error, never a 500: this helper translates the `SyntaxError` or
 * `ZodError` that `decodeCursor` raises into a 400 `VALIDATION_FAILED`.
 */
export function decodeListingsCursor(token: string): { timestamp: string; id: string } {
  try {
    return ListingsSchemas.decodeCursor(token);
  } catch {
    throw new BadRequestException({
      code: ErrorCode.ValidationFailed,
      message: "Invalid cursor",
      details: { reason: LISTING_ERROR_CODES.INVALID_CURSOR },
    });
  }
}
