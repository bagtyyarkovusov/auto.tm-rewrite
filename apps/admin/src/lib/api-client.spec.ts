import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const mockState = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
  redirect: vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307`;
    throw err;
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockState.cookieStore)),
}));

vi.mock("next/navigation", () => ({
  redirect: mockState.redirect,
}));

import { apiFetch, apiFetchOptional, ApiError } from "./api-client";

const mockCookieStore = mockState.cookieStore;

describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("forwards Authorization: Bearer header from access cookie", async () => {
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "auto_tm_admin_access") return { value: "acc_tok" };
      return undefined;
    });

    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    ) as Mock;

    await apiFetch("/test");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    const [, init] = (global.fetch as Mock).mock.calls[0] ?? [null, { headers: new Headers() }];
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer acc_tok");
  });

  it("returns parsed JSON on success", async () => {
    mockCookieStore.get.mockReturnValue({ value: "acc_tok" });
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: "1" }), { status: 200 }),
      ),
    ) as Mock;

    const result = await apiFetch("/test");
    expect(result).toEqual({ id: "1" });
  });

  it("refreshes on 401 and retries once", async () => {
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "auto_tm_admin_access") return { value: "old_acc" };
      if (name === "auto_tm_admin_refresh") return { value: "ref_tok" };
      return undefined;
    });

    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      if (callCount === 2) {
        // Refresh response
        return Promise.resolve(
          new Response(
            JSON.stringify({ accessToken: "new_acc", refreshToken: "new_ref" }),
            { status: 200 },
          ),
        );
      }
      // Retry response
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    }) as Mock;

    const result = await apiFetch("/test");
    expect(result).toEqual({ ok: true });
    expect(callCount).toBe(3);

    // Cookies rotated
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.any(String),
      "new_acc",
      expect.any(Object),
    );
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.any(String),
      "new_ref",
      expect.any(Object),
    );
  });

  it("clears cookies and redirects to login when refresh fails", async () => {
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "auto_tm_admin_access") return { value: "old_acc" };
      if (name === "auto_tm_admin_refresh") return { value: "ref_tok" };
      return undefined;
    });

    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 401 })),
    ) as Mock;

    await expect(apiFetch("/test")).rejects.toThrow("NEXT_REDIRECT:/login");

    // Cookies cleared
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.any(String),
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });

  it("throws ApiError on non-401, non-200 responses", async () => {
    mockCookieStore.get.mockReturnValue({ value: "acc_tok" });
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            statusCode: 403,
            code: "FORBIDDEN",
            message: "Forbidden",
            timestamp: new Date().toISOString(),
            requestId: "req-1",
          }),
          { status: 403 },
        ),
      ),
    ) as Mock;

    await expect(apiFetch("/test")).rejects.toThrow(ApiError);
    try {
      await apiFetch("/test");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
      expect((err as ApiError).code).toBe("FORBIDDEN");
    }
  });

  it("never includes token material in error messages", async () => {
    mockCookieStore.get.mockReturnValue({ value: "secret_token_xyz" });
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            statusCode: 500,
            code: "INTERNAL",
            message: "Internal error",
            timestamp: new Date().toISOString(),
            requestId: "req-1",
          }),
          { status: 500 },
        ),
      ),
    ) as Mock;

    try {
      await apiFetch("/test");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain("secret_token_xyz");
    }
  });
});

describe("apiFetchOptional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("returns null when the request returns 401 and refresh fails", async () => {
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "auto_tm_admin_access") return { value: "old_acc" };
      if (name === "auto_tm_admin_refresh") return { value: "ref_tok" };
      return undefined;
    });

    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 401 })),
    ) as Mock;

    const result = await apiFetchOptional("/test");
    expect(result).toBeNull();
  });

  it("returns parsed data on success", async () => {
    mockCookieStore.get.mockReturnValue({ value: "acc_tok" });
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    ) as Mock;

    const result = await apiFetchOptional("/test");
    expect(result).toEqual({ ok: true });
  });
});
