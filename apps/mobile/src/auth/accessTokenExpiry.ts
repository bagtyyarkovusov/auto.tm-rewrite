import type { StoredAuthSession } from "./session";

/** Refresh this long before expiry so a token does not lapse in flight. */
const EXPIRY_SKEW_MS = 30_000;

/**
 * Whether the stored access token is past (or within the skew of) its expiry.
 *
 * The token's lifetime (`exp - iat`, both minted by the server) is counted from
 * `storedAt`, when this device received it, rather than comparing `exp` with the
 * device clock. A phone whose clock is wrong would otherwise refresh before
 * every request, or never. An unreadable token, a missing `exp`/`iat`, or an
 * unparseable `storedAt` counts as not expired, which leaves the server's 401
 * as the only signal, as before.
 */
export function isAccessTokenExpired(
  session: Pick<StoredAuthSession, "accessToken" | "storedAt">,
  nowMs: number = Date.now(),
): boolean {
  const payload = session.accessToken.split(".")[1];
  const storedAtMs = Date.parse(session.storedAt);
  if (!payload || Number.isNaN(storedAtMs)) return false;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { exp?: unknown; iat?: unknown };
    if (typeof claims.exp !== "number" || typeof claims.iat !== "number") return false;

    const expiresAtMs = storedAtMs + (claims.exp - claims.iat) * 1000;
    return expiresAtMs <= nowMs + EXPIRY_SKEW_MS;
  } catch {
    return false;
  }
}
