// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";

import { useMyContactPhones } from "./useMyContactPhones";

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

const item = {
  phone: "+99365123456",
  source: "confirmed",
  confirmedAt: "2026-10-01T09:00:00.000Z",
  reusableUntil: "2026-10-08T09:00:00.000Z",
};

describe("useMyContactPhones", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("lists the seller's confirmed contact phones keyed per User", async () => {
    server.use(
      http.get("*/me/contact-phones", () =>
        HttpResponse.json({ items: [item] }, { status: 200 }),
      ),
    );

    const { result } = renderHook(
      () => useMyContactPhones({ userId: "user-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([item]);
    expect(result.current.data?.items[0]?.reusableUntil).toBe(
      "2026-10-08T09:00:00.000Z",
    );
  });

  it("does not fetch when disabled", async () => {
    let called = 0;
    server.use(
      http.get("*/me/contact-phones", () => {
        called += 1;
        return HttpResponse.json({ items: [] }, { status: 200 });
      }),
    );

    const { result } = renderHook(
      () => useMyContactPhones({ userId: "user-1", enabled: false }),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(called).toBe(0);
  });

  it("keeps separate cache entries per User", async () => {
    server.use(
      http.get("*/me/contact-phones", () =>
        HttpResponse.json({ items: [item] }, { status: 200 }),
      ),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const sharedWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useMyContactPhones({ userId: "user-1" }), {
      wrapper: sharedWrapper,
    });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const second = renderHook(() => useMyContactPhones({ userId: "user-2" }), {
      wrapper: sharedWrapper,
    });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(first.result.current.data).not.toBe(second.result.current.data);
  });

  it("surfaces an ApiError code on failure", async () => {
    server.use(
      http.get("*/me/contact-phones", () =>
        HttpResponse.json(
          { code: "FORBIDDEN", message: "Suspended." },
          { status: 403 },
        ),
      ),
    );

    const { result } = renderHook(
      () => useMyContactPhones({ userId: "user-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "FORBIDDEN",
    );
  });
});
