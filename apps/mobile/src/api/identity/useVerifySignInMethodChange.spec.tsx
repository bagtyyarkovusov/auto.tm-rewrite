// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";
import { queryKeys } from "../queryKeys";

import { useVerifySignInMethodChange } from "./useVerifySignInMethodChange";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() =>
    Promise.resolve({ accessToken: "access", refreshToken: "refresh" }),
  ),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

const emailOnlyMe = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  phone: null,
  email: "buyer@example.com",
  phoneVerified: false,
  displayName: null,
  role: "buyer",
  avatarUrl: null,
  locale: "ru",
  createdAt: "2026-09-01T08:30:00.000Z",
  deletionScheduledAt: null,
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(queryKeys.me(), emailOnlyMe);
  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, wrapper };
}

describe("useVerifySignInMethodChange", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("replaces the cached /me with the updated User so Profile shows the new phone", async () => {
    let requestBody: unknown;
    server.use(
      http.post("*/me/sign-in-methods/verify", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          ...emailOnlyMe,
          phone: "+99361000000",
          phoneVerified: true,
        });
      }),
    );
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useVerifySignInMethodChange(), {
      wrapper,
    });

    result.current.mutate({ phone: "+99361000000", code: "123456" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestBody).toEqual({ phone: "+99361000000", code: "123456" });
    expect(client.getQueryData(queryKeys.me())).toMatchObject({
      phone: "+99361000000",
      email: "buyer@example.com",
      phoneVerified: true,
    });
  });

  it("leaves the cached /me alone when the Sign-in Method belongs to another User", async () => {
    server.use(
      http.post("*/me/sign-in-methods/verify", () =>
        HttpResponse.json(
          {
            code: "SIGN_IN_METHOD_TAKEN",
            message: "This Sign-in Method belongs to another User.",
          },
          { status: 409 },
        ),
      ),
    );
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useVerifySignInMethodChange(), {
      wrapper,
    });

    result.current.mutate({ phone: "+99361000000", code: "123456" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "SIGN_IN_METHOD_TAKEN",
    );
    expect(client.getQueryData(queryKeys.me())).toEqual(emailOnlyMe);
  });
});
