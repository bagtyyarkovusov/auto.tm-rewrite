// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";
import { useRequestOtp } from "./useRequestOtp";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() => Promise.resolve(null)),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRequestOtp", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("returns parsed OTP request response", async () => {
    server.use(
      http.post("*/auth/otp/request", () =>
        HttpResponse.json({
          requestId: "550e8400-e29b-41d4-a716-446655440000",
          resendInSeconds: 60,
        }),
      ),
    );

    const { result } = renderHook(() => useRequestOtp(), { wrapper });

    result.current.mutate({ phone: "+99361000000" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.requestId).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(result.current.data?.resendInSeconds).toBe(60);
  });

  it("surfaces a contract violation when API returns garbage", async () => {
    server.use(
      http.post("*/auth/otp/request", () =>
        HttpResponse.json({ wrong: "shape" }),
      ),
    );

    const { result } = renderHook(() => useRequestOtp(), { wrapper });

    result.current.mutate({ phone: "+99361000000" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });
});
