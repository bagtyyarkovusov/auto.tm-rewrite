import type { ZodSchema } from "zod";
import { AuthSchemas } from "@auto-tm/contracts";

import {
  clearAuthSession,
  loadAuthSession,
  storeAuthSession,
} from "../auth/session";

const BASE_URL = (
  process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3006/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const REFRESH_TIMEOUT_MS = 15_000;

interface RequestOptions<TResponse> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  schema?: ZodSchema<TResponse>;
  // If false, do not attach Authorization header (used for OTP request/verify pre-login)
  auth?: boolean;
  // Per-request timeout override (defaults to 30s)
  timeout?: number;
}

let refreshInFlight: Promise<void> | null = null;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  // React Native 0.83's AbortController polyfill does not reliably cancel
  // fetch requests (facebook/react-native#55247). We use Promise.race so
  // the timeout always wins even if fetch ignores the abort signal.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new ApiError("NETWORK_ERROR", 0, "Request timed out")),
      timeoutMs,
    ),
  );

  try {
    const res = await Promise.race([
      fetch(url, { ...init, signal: controller.signal }),
      timeoutPromise,
    ]);
    return res;
  } catch (err) {
    if (err instanceof ApiError && err.code === "NETWORK_ERROR") {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("NETWORK_ERROR", 0, "Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshOnce(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const session = await loadAuthSession();
    if (!session) {
      throw new ApiError("UNAUTHENTICATED", 401, "No session to refresh");
    }

    const res = await fetchWithTimeout(
      `${BASE_URL}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      },
      REFRESH_TIMEOUT_MS,
    );

    if (!res.ok) {
      await clearAuthSession();
      throw new ApiError("UNAUTHENTICATED", 401, "Refresh failed");
    }

    const json = (await res.json()) as unknown;
    const parsed = AuthSchemas.RefreshResponseSchema.safeParse(json);
    if (!parsed.success) {
      await clearAuthSession();
      throw new ApiError("CONTRACT_VIOLATION", 502, "Bad refresh response");
    }

    await storeAuthSession({
      ...parsed.data,
      user: session.user,
    });
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function rawRequest<TResponse>(
  path: string,
  opts: RequestOptions<TResponse>,
  isRetry: boolean,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (opts.auth !== false) {
    const session = await loadAuthSession();
    if (session) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }
  }

  const res = await fetchWithTimeout(
    `${BASE_URL}${path}`,
    {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    },
    opts.timeout ?? DEFAULT_TIMEOUT_MS,
  );

  if (res.status === 401 && opts.auth !== false && !isRetry) {
    await refreshOnce();
    return rawRequest(path, opts, true);
  }

  if (res.status === 204) {
    return undefined as TResponse;
  }

  let json: unknown;
  let rawText: string | undefined;

  try {
    json = (await res.json()) as unknown;
  } catch {
    rawText = await res.text().catch(() => undefined);
    json = null;
  }

  if (!res.ok) {
    const errorBody = json as { code?: string; message?: string; details?: unknown } | null;
    const code = errorBody?.code ?? "UNKNOWN_ERROR";
    const message =
      errorBody?.message ??
      (rawText ? `Non-JSON error (${res.status}): ${rawText.slice(0, 200)}` : `HTTP ${res.status}`);

    console.error("[apiClient] request failed", {
      url: `${BASE_URL}${path}`,
      status: res.status,
      code,
      rawText: rawText?.slice(0, 500),
    });

    throw new ApiError(code, res.status, message, errorBody?.details);
  }

  if (opts.schema) {
    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        "CONTRACT_VIOLATION",
        502,
        "Response did not match expected schema",
        parsed.error.format(),
      );
    }
    return parsed.data;
  }

  return json as TResponse;
}

export const apiClient = {
  get<T>(path: string, schema?: ZodSchema<T>, opts: { auth?: boolean; timeout?: number } = {}) {
    return rawRequest<T>(path, { method: "GET", schema, ...opts }, false);
  },
  post<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean; timeout?: number } = {}) {
    return rawRequest<T>(path, { method: "POST", body, schema, ...opts }, false);
  },
  patch<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean; timeout?: number } = {}) {
    return rawRequest<T>(path, { method: "PATCH", body, schema, ...opts }, false);
  },
  put<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean; timeout?: number } = {}) {
    return rawRequest<T>(path, { method: "PUT", body, schema, ...opts }, false);
  },
  delete<T>(path: string, schema?: ZodSchema<T>, opts: { auth?: boolean; timeout?: number } = {}) {
    return rawRequest<T>(path, { method: "DELETE", schema, ...opts }, false);
  },
};
