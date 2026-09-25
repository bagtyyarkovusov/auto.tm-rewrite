// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";

import { useRequestSignInMethodChange } from "./useRequestSignInMethodChange";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() =>
    Promise.resolve({ accessToken: "access", refreshToken: "refresh" }),
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

describe("useRequestSignInMethodChange", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("requests a code for the new phone on the signed-in User", async () => {
    let requestBody: unknown;
    server.use(
      http.post("*/me/sign-in-methods/request", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            requestId: "550e8400-e29b-41d4-a716-446655440000",
            resendInSeconds: 60,
          },
          { status: 201 },
        );
      }),
    );

    const { result } = renderHook(() => useRequestSignInMethodChange(), {
      wrapper,
    });

    result.current.mutate({ phone: "+99361000000" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestBody).toEqual({ phone: "+99361000000" });
    expect(result.current.data?.resendInSeconds).toBe(60);
  });

  it("surfaces a rate limit as an ApiError code", async () => {
    server.use(
      http.post("*/me/sign-in-methods/request", () =>
        HttpResponse.json(
          { code: "RATE_LIMITED", message: "Too many code requests." },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderHook(() => useRequestSignInMethodChange(), {
      wrapper,
    });

    result.current.mutate({ email: "buyer@example.com" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "RATE_LIMITED",
    );
  });
});
