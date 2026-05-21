// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";

import { useRemoveMedia } from "./useRemoveMedia";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() =>
    Promise.resolve({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: { id: "u1", phone: "+99361000000", displayName: null, role: "buyer" },
      storedAt: new Date().toISOString(),
    }),
  ),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRemoveMedia", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("returns success on remove", async () => {
    server.use(
      http.delete("*/listings/:id/media/:mediaId", () =>
        HttpResponse.json({ success: true }),
      ),
    );

    const { result } = renderHook(() => useRemoveMedia("550e8400-e29b-41d4-a716-446655440000"), {
      wrapper,
    });

    result.current.mutate("550e8400-e29b-41d4-a716-446655440001");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.success).toBe(true);
  });

  it("surfaces a contract violation when API returns garbage", async () => {
    server.use(
      http.delete("*/listings/:id/media/:mediaId", () =>
        HttpResponse.json({ wrong: "shape" }),
      ),
    );

    const { result } = renderHook(() => useRemoveMedia("550e8400-e29b-41d4-a716-446655440000"), {
      wrapper,
    });

    result.current.mutate("550e8400-e29b-41d4-a716-446655440001");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });
});
