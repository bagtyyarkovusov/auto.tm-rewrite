import { cookies } from "next/headers";

import { authCookieSettings } from "./auth-cookie-options";

export function getAccessCookieName(): string { return authCookieSettings().accessName; }
export function getRefreshCookieName(): string { return authCookieSettings().refreshName; }

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const store = await cookies();
  const settings = authCookieSettings();
  store.set(settings.accessName, accessToken, { ...settings.common, maxAge: settings.accessMaxAge });
  store.set(settings.refreshName, refreshToken, { ...settings.common, maxAge: settings.refreshMaxAge });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  const settings = authCookieSettings();
  for (const name of [settings.accessName, settings.refreshName]) {
    store.set(name, "", { ...settings.common, maxAge: 0 });
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(getAccessCookieName())?.value;
}
export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(getRefreshCookieName())?.value;
}
