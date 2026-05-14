import { AuthSchemas } from "@auto-tm/contracts";
import * as SecureStore from "expo-secure-store";

const AUTH_SESSION_KEY = "auto_tm_auth_session";

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

  return {
    ...session.data,
    storedAt: String((parsed as { storedAt: unknown }).storedAt),
  };
}

export function clearAuthSession(): Promise<void> {
  return SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}
