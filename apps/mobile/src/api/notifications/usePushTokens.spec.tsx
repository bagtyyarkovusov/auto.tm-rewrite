// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { usePushTokens } from "./usePushTokens";

const mockGet = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public status: number,
      message?: string,
    ) {
      super(message ?? code);
      this.name = "ApiError";
    }
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function makeTokenSummary(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    token: `token-${id}`,
    platform: "android",
    createdAt: "2026-06-01T12:00:00.000Z",
    lastSeenAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("usePushTokens", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns the parsed token list", async () => {
    mockGet.mockResolvedValue({
      items: [makeTokenSummary("t1"), makeTokenSummary("t2", { platform: "ios" })],
    });

    const { result } = renderHook(() => usePushTokens(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items[1]?.platform).toBe("ios");
    expect(mockGet).toHaveBeenCalledWith(
      "/notifications/tokens",
      expect.any(Object),
    );
  });

  it("surfaces contract violation on bad response", async () => {
    mockGet.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Response did not match expected schema");
          this.name = "ApiError";
        }
        code = "CONTRACT_VIOLATION";
        status = 502;
      })(),
    );

    const { result } = renderHook(() => usePushTokens(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });
});
