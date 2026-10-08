/** Resolve at runtime so a standalone image uses its deployment's address. */
export function getApiBaseUrl(): string {
  const configured = process.env["API_BASE_URL"];
  const address = (process.env["NODE_ENV"] === "production"
    ? configured
    : configured || process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3006/api/v1")?.trim();

  try {
    if (!address) throw new Error();
    const url = new URL(address);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || address.includes("?") || address.includes("#")) throw new Error();
    const base = `${url.origin}${url.pathname}`.replace(/\/+$/, "");
    return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
  } catch {
    throw new Error("API_BASE_URL must be configured as an http(s) URL without credentials, query or fragment.");
  }
}
