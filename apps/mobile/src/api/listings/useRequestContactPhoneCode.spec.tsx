// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";

import { useRequestContactPhoneCode } from "./useRequestContactPhoneCode";

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

describe("useRequestContactPhoneCode", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("sends the phone and returns code_sent with the resend wait", async () => {
    let requestBody: unknown;
    server.use(
      http.post("*/me/contact-phones/request", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            status: "code_sent",
            requestId: "550e8400-e29b-41d4-a716-446655440000",
            resendInSeconds: 60,
          },
          { status: 200 },
        );
      }),
    );

    const { result } = renderHook(() => useRequestContactPhoneCode(), {
      wrapper,
    });

    result.current.mutate({ phone: "+99365123456" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestBody).toEqual({ phone: "+99365123456" });
    expect(result.current.data).toMatchObject({
      status: "code_sent",
      resendInSeconds: 60,
    });
  });

  it("returns confirmed without a code for a reusable number", async () => {
    const contactPhone = {
      phone: "+99361000001",
      source: "account",
      confirmedAt: null,
      reusableUntil: null,
    };
    server.use(
      http.post("*/me/contact-phones/request", () =>
        HttpResponse.json({ status: "confirmed", contactPhone }, { status: 200 }),
      ),
    );

    const { result } = renderHook(() => useRequestContactPhoneCode(), {
      wrapper,
    });

    result.current.mutate({ phone: "+99361000001" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      status: "confirmed",
      contactPhone,
    });
  });

  it("surfaces RATE_LIMITED with details on the daily limit", async () => {
    server.use(
      http.post("*/me/contact-phones/request", () =>
        HttpResponse.json(
          {
            code: "RATE_LIMITED",
            message: "Too many code requests.",
            details: { reason: "destination_limit", retryInSeconds: 0 },
          },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderHook(() => useRequestContactPhoneCode(), {
      wrapper,
    });

    result.current.mutate({ phone: "+99365123456" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as unknown as {
      code: string;
      details: { reason: string };
    };
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.details.reason).toBe("destination_limit");
  });
});
