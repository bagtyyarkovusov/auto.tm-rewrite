import { BadRequestException } from "@nestjs/common";
import type { ListingsSchemas } from "@auto-tm/contracts";

import type { ContactPhoneStanding } from "../domain/ContactPhonePolicy";
import { LISTING_ERROR_CODES } from "../domain/types";

/**
 * The 400 for a contact phone that may not go on a Listing now (ADR-0081), or
 * null when it may. Either refusal sends the seller to the Contact step.
 */
export function contactPhoneRejection(
  standing: ContactPhoneStanding,
): BadRequestException | null {
  switch (standing.kind) {
    case "account":
    case "confirmed":
      return null;
    case "missing":
      return new BadRequestException({
        code: LISTING_ERROR_CODES.CONTACT_PHONE_REQUIRED,
        message: "A contact phone is required",
      });
    case "not_confirmed":
    case "expired": {
      const details: ListingsSchemas.ContactPhoneNotConfirmedDetails = {
        reason: standing.kind,
      };
      return new BadRequestException({
        code: LISTING_ERROR_CODES.CONTACT_PHONE_NOT_CONFIRMED,
        message:
          standing.kind === "expired"
            ? "Confirm this contact phone again"
            : "Confirm this contact phone first",
        details,
      });
    }
  }
}
