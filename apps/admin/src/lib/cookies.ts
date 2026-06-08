import { cookies } from "next/headers";

const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAccessCookieName(): string {
  return isProduction()
    ? "__Host-auto_tm_admin_access"
    : "auto_tm_admin_access";
}

export function getRefreshCookieName(): string {
  return isProduction()
    ? "__Host-auto_tm_admin_refresh"
    : "auto_tm_admin_refresh";
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();
  const accessName = getAccessCookieName();
  const refreshName = getRefreshCookieName();
  const commonOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(accessName, accessToken, {
    ...commonOptions,
    maxAge: ACCESS_MAX_AGE,
  });
  cookieStore.set(refreshName, refreshToken, {
    ...commonOptions,
    maxAge: REFRESH_MAX_AGE,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  const accessName = getAccessCookieName();
  const refreshName = getRefreshCookieName();
  const commonOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(accessName, "", { ...commonOptions, maxAge: 0 });
  cookieStore.set(refreshName, "", { ...commonOptions, maxAge: 0 });
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getAccessCookieName())?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getRefreshCookieName())?.value;
}
