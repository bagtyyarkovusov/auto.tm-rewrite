/** Resolve at runtime so a standalone image uses its deployment's address. */
export function getApiBaseUrl(): string {
  const configured = process.env["API_BASE_URL"];
  const address = process.env.NODE_ENV === "production"
    ? configured
    : configured || process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3006/api/v1";

  try {
    if (!address) throw new Error();
    const url = new URL(address);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("API_BASE_URL must be configured as an http(s) URL.");
  }

  const base = address.replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}
