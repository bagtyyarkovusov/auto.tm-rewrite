// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";
import { queryKeys } from "../queryKeys";

import { useConfirmContactPhone } from "./useConfirmContactPhone";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() =>
    Promise.resolve({ accessToken: "access", refreshToken: "refresh" }),
  ),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

describe("useConfirmContactPhone", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("verifies the code and returns the confirmed contact phone", async () => {
    let requestBody: unknown;
    const contactPhone = {
      phone: "+99365123456",
      source: "confirmed",
      confirmedAt: "2026-10-05T09:00:00.000Z",
      reusableUntil: "2026-10-12T09:00:00.000Z",
    };
    server.use(
      http.post("*/me/contact-phones/verify", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ contactPhone }, { status: 200 });
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useConfirmContactPhone(), { wrapper });

    result.current.mutate({ phone: "+99365123456", code: "123456" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestBody).toEqual({ phone: "+99365123456", code: "123456" });
    expect(result.current.data?.contactPhone).toEqual(contactPhone);
  });

  it("invalidates the contact phone list after a confirmation", async () => {
    server.use(
      http.post("*/me/contact-phones/verify", () =>
        HttpResponse.json(
          {
            contactPhone: {
              phone: "+99365123456",
              source: "confirmed",
              confirmedAt: "2026-10-05T09:00:00.000Z",
              reusableUntil: "2026-10-12T09:00:00.000Z",
            },
          },
          { status: 200 },
        ),
      ),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(queryKeys.listings.myContactPhones("user-1"), {
      items: [],
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useConfirmContactPhone(), { wrapper });

    result.current.mutate({ phone: "+99365123456", code: "123456" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const state = client.getQueryState(
      queryKeys.listings.myContactPhones("user-1"),
    );
    expect(state?.isInvalidated).toBe(true);
  });

  it("surfaces INVALID_OTP with attemptsLeft details", async () => {
    server.use(
      http.post("*/me/contact-phones/verify", () =>
        HttpResponse.json(
          {
            code: "INVALID_OTP",
            message: "Wrong code.",
            details: { attemptsLeft: 3 },
          },
          { status: 400 },
        ),
      ),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useConfirmContactPhone(), { wrapper });

    result.current.mutate({ phone: "+99365123456", code: "000000" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as unknown as {
      code: string;
      details: { attemptsLeft: number };
    };
    expect(error.code).toBe("INVALID_OTP");
    expect(error.details.attemptsLeft).toBe(3);
  });
});
