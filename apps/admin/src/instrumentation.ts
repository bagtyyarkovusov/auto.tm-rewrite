import { getApiBaseUrl } from "./lib/api-config";

/** Fail before accepting requests, including the dependency-free health check. */
export function register(): void {
  getApiBaseUrl();
}
