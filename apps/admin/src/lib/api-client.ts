import { redirect } from "next/navigation";

import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "./cookies";

const API_BASE_URL =
  process.env["API_BASE_URL"] ||
  process.env["NEXT_PUBLIC_API_URL"] ||
  "http://localhost:3006/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly responseBody: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function doFetch(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const body =
    options.body != null && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : (options.body as BodyInit | null | undefined);

  const { body: _ignoredBody, ...rest } = options;
  void _ignoredBody;
  const fetchInit: RequestInit = { ...rest, headers };
  if (body != null) {
    fetchInit.body = body;
  }

  return fetch(url, fetchInit);
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await doFetch("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });

    if (!response.ok) return false;

    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    await setAuthCookies(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Server-side API fetch wrapper.
 * Forwards Authorization: Bearer header from the access cookie.
 * On API 401: attempts refresh once using the refresh cookie,
 * rotates cookies on success, and retries the original request once.
 * On refresh failure: clears cookies and redirects to /login.
 * Never leaks token material in rendered props or error messages.
 */
export async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const accessToken = await getAccessToken();

  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await doFetch(path, { ...options, headers });

  // Refresh-on-401: attempt once
  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newAccessToken = await getAccessToken();
      const retryHeaders = new Headers(options.headers);
      if (newAccessToken) {
        retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
      }
      response = await doFetch(path, { ...options, headers: retryHeaders });
    } else {
      await clearAuthCookies();
      redirect("/login");
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new ApiError(
      response.status,
      body.code ?? "UNKNOWN",
      body,
      body.message ?? `HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Server-side API fetch wrapper for GET requests that returns null on 401
 * instead of redirecting. Useful for optional auth checks in layouts.
 */
export async function apiFetchOptional<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T | null> {
  const accessToken = await getAccessToken();

  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await doFetch(path, { ...options, headers });

  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newAccessToken = await getAccessToken();
      const retryHeaders = new Headers(options.headers);
      if (newAccessToken) {
        retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
      }
      response = await doFetch(path, { ...options, headers: retryHeaders });
    } else {
      return null;
    }
  }

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}
