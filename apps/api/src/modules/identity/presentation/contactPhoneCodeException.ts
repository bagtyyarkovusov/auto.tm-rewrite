import type { BadRequestException } from "@nestjs/common";

/**
 * Turns a refused contact-phone code request or confirmation into the HTTP
 * error ADR-0081 names. Returns null for any other error.
 */
export function contactPhoneCodeException(_error: unknown): BadRequestException | null {
  throw new Error("not implemented");
}
