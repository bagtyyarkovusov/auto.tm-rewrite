import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ZodSchema } from "zod";

import {
  loadAuthSession,
  storeAuthSession,
  clearAuthSession,
} from "../auth/session";

import { apiClient, ApiError } from "./client";

vi.mock("../auth/session", () => ({
  loadAuthSession: vi.fn(),
  storeAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
}));

const mockedLoadAuthSession = vi.mocked(loadAuthSession);
const mockedStoreAuthSession = vi.mocked(storeAuthSession);
const mockedClearAuthSession = vi.mocked(clearAuthSession);

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("auth header attachment", () => {
    it("attaches Authorization header when session exists", async () => {
      mockedLoadAuthSession.mockResolvedValue({
        accessToken: "token-123",
        refreshToken: "refresh-123",
        user: {
          id: "u1",
          phone: "+99361000000",
          displayName: null,
          role: "buyer" as const,
        },
        storedAt: new Date().toISOString(),
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

      await apiClient.get("/test");

      const call = fetchSpy.mock.calls[0];
      const reqInit = call?.[1] as RequestInit | undefined;
      const reqHeaders = reqInit?.headers as Record<string, string>;
      expect(reqHeaders?.Authorization).toBe("Bearer token-123");
    });

    it("skips Authorization header when auth: false", async () => {
      mockedLoadAuthSession.mockResolvedValue({
        accessToken: "token-123",
        refreshToken: "refresh-123",
        user: {
          id: "u1",
          phone: "+99361000000",
          displayName: null,
          role: "buyer" as const,
        },
        storedAt: new Date().toISOString(),
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

      await apiClient.get("/test", undefined, { auth: false });

      const call = fetchSpy.mock.calls[0];
      const reqInit = call?.[1] as RequestInit | undefined;
      const reqHeaders = reqInit?.headers as Record<string, string>;
      expect(reqHeaders?.Authorization).toBeUndefined();
    });
  });

  describe("401 refresh-retry", () => {
    it("refreshes token on 401 and retries the request", async () => {
      mockedLoadAuthSession.mockResolvedValue({
        accessToken: "old-token",
        refreshToken: "refresh-123",
        user: {
          id: "u1",
          phone: "+99361000000",
          displayName: null,
          role: "buyer" as const,
        },
        storedAt: new Date().toISOString(),
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHENTICATED" }, 401))
        .mockResolvedValueOnce(
          jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" }),
        )
        .mockResolvedValueOnce(jsonResponse({ data: "success" }));

      const result = await apiClient.get<{ data: string }>("/test");

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("/test");
      expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("/auth/refresh");
      expect(String(fetchSpy.mock.calls[2]?.[0])).toContain("/test");
      expect(result).toEqual({ data: "success" });
      expect(mockedStoreAuthSession).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "new-token",
          refreshToken: "new-refresh",
        }),
      );
    });

    it("shares one refresh when concurrent requests hit 401", async () => {
      mockedLoadAuthSession.mockResolvedValue({
        accessToken: "old-token",
        refreshToken: "refresh-123",
        user: {
          id: "u1",
          phone: "+99361000000",
          displayName: null,
          role: "buyer" as const,
        },
        storedAt: new Date().toISOString(),
      });

      let refreshResolve: (() => void) | undefined;
      const refreshPromise = new Promise<void>((resolve) => {
        refreshResolve = resolve as () => void;
      });

      let callCount = 0;
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (url) => {
          callCount++;
          if (String(url).includes("/auth/refresh")) {
            await refreshPromise;
            return jsonResponse({
              accessToken: "new-token",
              refreshToken: "new-refresh",
            });
          }
          // First two calls (the initial requests) return 401
          if (callCount <= 2) {
            return jsonResponse({ code: "UNAUTHENTICATED" }, 401);
          }
          // Retry calls return success
          return jsonResponse({ ok: true });
        });

      const p1 = apiClient.get("/a");
      const p2 = apiClient.get("/b");

      // Give both initial requests time to hit 401 and queue on refresh
      await new Promise((r) => setTimeout(r, 10));

      // At this point both initial requests should have fired
      expect(callCount).toBeGreaterThanOrEqual(2);

      if (refreshResolve) refreshResolve();

      const [r1, r2] = await Promise.all([p1, p2]);

      const refreshCalls = fetchSpy.mock.calls.filter((call) =>
        String(call[0]).includes("/auth/refresh"),
      );
      expect(refreshCalls).toHaveLength(1);
      expect(r1).toEqual({ ok: true });
      expect(r2).toEqual({ ok: true });
    });

    it("throws UNAUTHENTICATED when refresh itself returns 401", async () => {
      mockedLoadAuthSession.mockResolvedValue({
        accessToken: "old-token",
        refreshToken: "refresh-123",
        user: {
          id: "u1",
          phone: "+99361000000",
          displayName: null,
          role: "buyer" as const,
        },
        storedAt: new Date().toISOString(),
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHENTICATED" }, 401))
        .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHENTICATED" }, 401));

      const error = await apiClient.get("/test").catch((e: ApiError) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: "UNAUTHENTICATED",
        status: 401,
      });
      expect(mockedClearAuthSession).toHaveBeenCalled();
    });
  });

  describe("non-401 errors", () => {
    it("passes through without retry", async () => {
      mockedLoadAuthSession.mockResolvedValue(null);

      vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        Promise.resolve(
          jsonResponse({ code: "RATE_LIMITED", message: "Slow down" }, 429),
        ),
      );

      const error = await apiClient.get("/test").catch((e: ApiError) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: "RATE_LIMITED",
        status: 429,
      });
    });

    it("throws CONTRACT_VIOLATION when schema parse fails", async () => {
      mockedLoadAuthSession.mockResolvedValue(null);

      vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        Promise.resolve(jsonResponse({ unexpected: "shape" })),
      );

      const schema = {
        parse: () => {
          throw new Error("bad");
        },
        safeParse: () =>
          ({ success: false as const, error: { format: () => ({}) } }),
      };

      const error = await apiClient
        .get("/test", schema as unknown as ZodSchema<unknown>)
        .catch((e: ApiError) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: "CONTRACT_VIOLATION",
        status: 502,
      });
    });
  });
});
