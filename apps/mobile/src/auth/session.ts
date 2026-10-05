import { AuthSchemas } from "@auto-tm/contracts";
import * as SecureStore from "expo-secure-store";

const AUTH_SESSION_KEY = "auto_tm_auth_session";
const sessionListeners = new Set<() => void>();
const userChangeListeners = new Set<() => void>();
// The last User signed in on this device since the app started. Their data may
// still be in memory after their session ends, so it outlives the session.
let lastUserId: string | null = null;

export type StoredAuthSession = AuthSchemas.OtpVerifyResponse & {
  storedAt: string;
};

export async function storeAuthSession(
  session: AuthSchemas.OtpVerifyResponse,
): Promise<void> {
  const value: StoredAuthSession = {
    ...session,
    storedAt: new Date().toISOString(),
  };

  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(value));
  const previousUserId = lastUserId;
  lastUserId = session.user.id;
  // Before the session listeners, so no screen renders the new User as signed
  // in while the previous User's data is still held.
  if (previousUserId !== null && previousUserId !== session.user.id) {
    userChangeListeners.forEach((listener) => listener());
  }
  notifySessionChanged();
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const value = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  if (!value) {
    return null;
  }

  const parsed = JSON.parse(value) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("storedAt" in parsed)
  ) {
    await clearAuthSession();
    return null;
  }

  const session = AuthSchemas.OtpVerifyResponseSchema.safeParse(parsed);
  if (!session.success) {
    await clearAuthSession();
    return null;
  }

  lastUserId = session.data.user.id;
  return {
    ...session.data,
    storedAt: String((parsed as { storedAt: unknown }).storedAt),
  };
}

/**
 * Keeps the stored session's copy of the User's Sign-in Methods in step with
 * the server after one is added or replaced. Tokens are left untouched.
 */
export async function updateStoredSessionUser(
  user: Pick<AuthSchemas.OtpVerifyResponse["user"], "phone" | "email">,
): Promise<void> {
  const session = await loadAuthSession();
  if (!session) return;

  const value: StoredAuthSession = {
    ...session,
    user: { ...session.user, phone: user.phone, email: user.email },
  };

  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(value));
  notifySessionChanged();
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
  notifySessionChanged();
}

export function subscribeAuthSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/**
 * Calls the listener when a session is stored for a User other than the last
 * one signed in on this device since the app started, however that User's
 * session ended. It runs before the `subscribeAuthSession` listeners. The
 * first sign-in after the app starts signed out, the same User signing in
 * again, and a token refresh do not call it.
 */
export function subscribeAuthUserChange(listener: () => void): () => void {
  userChangeListeners.add(listener);
  return () => {
    userChangeListeners.delete(listener);
  };
}

function notifySessionChanged(): void {
  sessionListeners.forEach((listener) => listener());
}
