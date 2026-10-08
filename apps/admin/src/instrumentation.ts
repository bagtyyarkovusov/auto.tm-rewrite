import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { getApiBaseUrl } from "./lib/api-config";

/** Fail before accepting requests, including the dependency-free health check. */
export function register(): void {
  if (process.env["NEXT_PHASE"] === PHASE_PRODUCTION_BUILD) return;
  try {
    getApiBaseUrl();
  } catch (error) {
    // Next otherwise keeps its listener alive after instrumentation rejection.
    if (process.env.NODE_ENV === "production" && process.env["NEXT_RUNTIME"] === "nodejs") {
      console.error("API_BASE_URL must be configured as an http(s) URL.");
      process.exit(1);
    }
    throw error;
  }
}
