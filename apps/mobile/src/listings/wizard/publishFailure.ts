import { ListingsSchemas } from "@auto-tm/contracts";
import type { TFunction } from "i18next";

import { ApiError } from "../../api/client";

/** Why a publish did not go through, as Check and publish words it. */
export type PublishFailure = "offline" | "rateMissing" | "server";

/**
 * Sorts a publish error into the three failures Check and publish explains. The
 * server's own message is never shown.
 *
 * Seam for the contact phone (#593, ADR-0056): `CONTACT_PHONE_NOT_CONFIRMED` and
 * `CONTACT_PHONE_REQUIRED` are not sorted here. The route is to catch them before
 * calling this and send the seller to Contact; until then they read as "server".
 */
export function publishFailureOf(error: unknown): PublishFailure {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR" || error.status === 0) return "offline";
    if (error.code === ListingsSchemas.ListingsErrorCode.ExchangeRateMissing) return "rateMissing";
  }
  return "server";
}

/** The line shown above Publish. `currency` is the draft's, for the missing-rate message. */
export function publishFailureMessage(t: TFunction, failure: PublishFailure | null, currency = "USD"): string {
  if (failure === "offline") return t("publishErrorOffline");
  if (failure === "rateMissing") return t("publishErrorRateMissing", { currency });
  return t("publishErrorServer");
}
