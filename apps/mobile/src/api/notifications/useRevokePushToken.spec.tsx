// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useRevokePushToken } from "./useRevokePushToken";

const source = readFileSync(
  resolve(__dirname, "./useRevokePushToken.ts"),
  "utf-8",
);

const mockDelete = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
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

describe("useRevokePushToken", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("deletes the token through the API", async () => {
    mockDelete.mockResolvedValue({ revoked: true });

    const { result } = renderHook(() => useRevokePushToken(), { wrapper });

    result.current.mutate({ token: "fcm-token-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.revoked).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(
      "/notifications/tokens/fcm-token-1",
      expect.any(Object),
    );
  });

  it("encodes the token path segment", async () => {
    mockDelete.mockResolvedValue({ revoked: true });

    const { result } = renderHook(() => useRevokePushToken(), { wrapper });

    result.current.mutate({ token: "token/with+special chars" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDelete).toHaveBeenCalledWith(
      "/notifications/tokens/token%2Fwith%2Bspecial%20chars",
      expect.any(Object),
    );
  });

  it("invalidates push token query on success", () => {
    expect(source).toContain("notificationsQueryKeys.pushTokens()");
  });
});
