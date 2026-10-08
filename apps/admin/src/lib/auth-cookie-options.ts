export const SESSION_EXPIRED_HEADER = "x-admin-session-expired";

export const SESSION_EXPIRED_MESSAGE = "Сессия истекла. Войдите снова.";

export function authCookieSettings() {
  const production = process.env["NODE_ENV"] === "production";
  return {
    accessName: production ? "__Host-auto_tm_admin_access" : "auto_tm_admin_access",
    refreshName: production ? "__Host-auto_tm_admin_refresh" : "auto_tm_admin_refresh",
    common: { httpOnly: true, secure: production, sameSite: "lax" as const, path: "/" },
    accessMaxAge: 15 * 60,
    refreshMaxAge: 30 * 24 * 60 * 60,
  };
}
