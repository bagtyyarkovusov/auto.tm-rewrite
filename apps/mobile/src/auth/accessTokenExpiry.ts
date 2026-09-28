/** Refresh this long before `exp` so a token does not lapse in flight. */
const EXPIRY_SKEW_MS = 30_000;

/**
 * Whether a JWT access token is past (or within the skew of) its `exp` claim.
 * An unreadable token counts as not expired, which leaves the server's 401 as
 * the only signal, as before.
 */
export function isAccessTokenExpired(token: string, nowMs: number = Date.now()): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof claims.exp === "number" && claims.exp * 1000 <= nowMs + EXPIRY_SKEW_MS;
  } catch {
    return false;
  }
}
