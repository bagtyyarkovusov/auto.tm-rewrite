import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authCookieSettings, SESSION_EXPIRED_HEADER } from "./src/lib/auth-cookie-options";
import { hasCurrentAccessToken, renewSession } from "./src/lib/session-renewal";
import { ADMIN_RETURN_TO_HEADER, validateOrigin, validateReturnTo } from "./src/lib/validators";

const PROTECTED_PREFIXES = ["/reports", "/audit", "/listings", "/users", "/catalog"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  request.headers.delete(SESSION_EXPIRED_HEADER);
  const settings = authCookieSettings();
  const refreshToken = request.cookies.get(settings.refreshName)?.value;

  // Login GET never renews: rejected sessions must end here without a loop.
  if (request.method === "GET" && pathname === "/login" && request.nextUrl.searchParams.get("reason") === "session-expired") {
    const response = NextResponse.next({ request: { headers: request.headers } });
    clearCookies(response);
    return response;
  }

  const protectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  // TOTP/logout Server Actions run on /login too. Ordinary sign-in without
  // a refresh cookie stays public and can request/verify a Sign-in Code.
  const loginAction = pathname === "/login" && request.method === "POST" && Boolean(refreshToken || request.cookies.get(settings.accessName)?.value);
  if (!protectedRoute && !loginAction) return NextResponse.next({ request: { headers: request.headers } });

  if (request.method === "POST" && !validateOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const safeReturnTo = validateReturnTo(`${pathname}${request.nextUrl.search}`);
  let tokens: Awaited<ReturnType<typeof renewSession>> = null;
  if (!hasCurrentAccessToken(request.cookies.get(settings.accessName)?.value)) {
    if (refreshToken) tokens = await renewSession(refreshToken);
    if (!tokens) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "session-expired");
      if (safeReturnTo) loginUrl.searchParams.set("returnTo", safeReturnTo);
      if (request.method === "POST" && request.headers.has("next-action")) {
        // A proxy HTTP redirect alone returns HTML to the action fetch. Delegate
        // to the action's first guard so Next emits a native client redirect.
        request.cookies.delete(settings.accessName);
        request.cookies.delete(settings.refreshName);
        const headers = new Headers(request.headers);
        headers.set(SESSION_EXPIRED_HEADER, "1");
        headers.delete(ADMIN_RETURN_TO_HEADER);
        if (safeReturnTo) headers.set(ADMIN_RETURN_TO_HEADER, safeReturnTo);
        const response = NextResponse.next({ request: { headers } });
        clearCookies(response);
        return response;
      }
      // Cancel an ordinary mutation. 303 follows with GET, never POST to login.
      const response = NextResponse.redirect(loginUrl, 303);
      clearCookies(response);
      return response;
    }
    request.cookies.set(settings.accessName, tokens.accessToken);
    request.cookies.set(settings.refreshName, tokens.refreshToken);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(ADMIN_RETURN_TO_HEADER);
  if (safeReturnTo) requestHeaders.set(ADMIN_RETURN_TO_HEADER, safeReturnTo);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (tokens) {
    response.cookies.set(settings.accessName, tokens.accessToken, { ...settings.common, maxAge: settings.accessMaxAge });
    response.cookies.set(settings.refreshName, tokens.refreshToken, { ...settings.common, maxAge: settings.refreshMaxAge });
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

function clearCookies(response: NextResponse): void {
  const settings = authCookieSettings();
  for (const name of [settings.accessName, settings.refreshName]) {
    response.cookies.set(name, "", { ...settings.common, maxAge: 0 });
  }
  response.headers.set("Cache-Control", "private, no-store");
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
