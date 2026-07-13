// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useRegisterPushToken } from "./useRegisterPushToken";

const source = readFileSync(
  resolve(__dirname, "./useRegisterPushToken.ts"),
  "utf-8",
);

const mockPost = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockPost(...args),
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

describe("useRegisterPushToken", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts native token and platform to the API", async () => {
    mockPost.mockResolvedValue({
      registered: true,
      invalidatedPrevious: false,
    });

    const { result } = renderHook(() => useRegisterPushToken(), { wrapper });

    result.current.mutate({ token: "fcm-token-1", platform: "android" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.registered).toBe(true);
    expect(mockPost).toHaveBeenCalledWith(
      "/notifications/tokens",
      { token: "fcm-token-1", platform: "android" },
      expect.any(Object),
    );
  });

  it("surfaces validation error from API", async () => {
    mockPost.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Validation failed");
          this.name = "ApiError";
        }
        code = "VALIDATION_FAILED";
        status = 400;
      })(),
    );

    const { result } = renderHook(() => useRegisterPushToken(), { wrapper });

    result.current.mutate({ token: "fcm-token-1", platform: "android" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("invalidates push token query on success", () => {
    expect(source).toContain("notificationsQueryKeys.pushTokens()");
  });
});
