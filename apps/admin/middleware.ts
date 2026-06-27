import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_RETURN_TO_HEADER,
  validateReturnTo,
} from "./src/lib/validators";

const PROTECTED_PREFIXES = ["/reports", "/audit", "/listings", "/users"];

function getAccessCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-auto_tm_admin_access"
    : "auto_tm_admin_access";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const safeReturnTo = validateReturnTo(`${pathname}${request.nextUrl.search}`);

  // Skip static files, API routes, login page, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccessCookie = request.cookies.has(getAccessCookieName());
  if (!hasAccessCookie) {
    const loginUrl = new URL("/login", request.url);
    if (safeReturnTo) {
      loginUrl.searchParams.set("returnTo", safeReturnTo);
    }
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  if (safeReturnTo) {
    requestHeaders.set(ADMIN_RETURN_TO_HEADER, safeReturnTo);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next|api|login|favicon.ico).*)"],
};
