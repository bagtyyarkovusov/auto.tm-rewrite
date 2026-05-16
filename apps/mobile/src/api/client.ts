import type { ZodSchema } from "zod";

import {
  clearAuthSession,
  loadAuthSession,
  storeAuthSession,
} from "../auth/session";
import { AuthSchemas } from "@auto-tm/contracts";

const BASE_URL = process.env["EXPO_PUBLIC_API_URL"];

if (!BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set — check apps/mobile/.env");
}

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

interface RequestOptions<TResponse> {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  schema?: ZodSchema<TResponse>;
  // If false, do not attach Authorization header (used for OTP request/verify pre-login)
  auth?: boolean;
}

let refreshInFlight: Promise<void> | null = null;

async function refreshOnce(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const session = await loadAuthSession();
    if (!session) {
      throw new ApiError("UNAUTHENTICATED", 401, "No session to refresh");
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

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
    "Content-Type": "application/json",
  };

  if (opts.auth !== false) {
    const session = await loadAuthSession();
    if (session) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && opts.auth !== false && !isRetry) {
    await refreshOnce();
    return rawRequest(path, opts, true);
  }

  if (res.status === 204) {
    return undefined as TResponse;
  }

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const errorBody = json as { code?: string; message?: string; details?: unknown } | null;
    throw new ApiError(
      errorBody?.code ?? "UNKNOWN_ERROR",
      res.status,
      errorBody?.message,
      errorBody?.details,
    );
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
  get<T>(path: string, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "GET", schema, ...opts }, false);
  },
  post<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "POST", body, schema, ...opts }, false);
  },
  patch<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "PATCH", body, schema, ...opts }, false);
  },
  delete<T>(path: string, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "DELETE", schema, ...opts }, false);
  },
};
