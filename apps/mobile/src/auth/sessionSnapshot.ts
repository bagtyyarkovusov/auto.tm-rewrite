import type { StoredAuthSession } from "./session";

/**
 * The session as this app process last read or wrote it: `undefined` until
 * the first read, then the session or `null`.
 *
 * Android can recreate the Activity while the app stays alive (a display
 * size, wallpaper colour or navigation mode change). React then mounts every
 * screen again, but this module keeps its value, so a screen can render the
 * signed-in state at once instead of waiting for SecureStore, which takes
 * seconds on a busy device. The stored session stays the source of truth:
 * every reader still loads it and corrects itself.
 */
let snapshot: StoredAuthSession | null | undefined;

export function peekAuthSession(): StoredAuthSession | null | undefined {
  return snapshot;
}

/** Only `session.ts` calls this, after each read or write of the stored session. */
export function rememberAuthSession(session: StoredAuthSession | null): void {
  snapshot = session;
}
