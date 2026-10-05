import { BadRequestException } from "@nestjs/common";

import { ListingsSchemas } from "@auto-tm/contracts";

import { LISTING_ERROR_CODES } from "../domain/types";

/**
 * Decodes a `{ timestamp, id }` keyset cursor. A malformed or forged token is a
 * client error, never a 500: `decodeCursor` raises a bare `SyntaxError` or
 * `ZodError`, which the shared validation shape translates to a 400.
 */
export function decodeListingsCursor(token: string): { timestamp: string; id: string } {
  try {
    return ListingsSchemas.decodeCursor(token);
  } catch {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Invalid cursor",
      details: { reason: LISTING_ERROR_CODES.INVALID_CURSOR },
    });
  }
}
