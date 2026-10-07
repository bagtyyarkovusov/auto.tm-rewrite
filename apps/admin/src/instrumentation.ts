import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { getApiBaseUrl } from "./lib/api-config";

/** Fail before accepting requests, including the dependency-free health check. */
export function register(): void {
  if (process.env["NEXT_PHASE"] !== PHASE_PRODUCTION_BUILD) getApiBaseUrl();
}
