import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const mockState = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  cookieStore: {
    get: vi.fn((name: string) => {
      const value = mockState.cookies.get(name);
      return value === undefined ? undefined : { value };
    }),
    set: vi.fn((name: string, value: string) => {
      mockState.cookies.set(name, value);
    }),
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

import { enrollTotp, verifyOtp } from "./actions";

function mockFetchQueue(responses: Array<{ status: number; body: unknown }>) {
  const queue = [...responses];
  global.fetch = vi.fn(() => {
    const next = queue.shift();
    if (!next) {
      throw new Error("Unexpected fetch call");
    }
    return Promise.resolve(
      new Response(JSON.stringify(next.body), { status: next.status }),
    );
  }) as Mock;
}

describe("admin auth server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.cookies.clear();
  });

  it("verifyOtp reports when the admin already has TOTP enrolled", async () => {
    mockFetchQueue([
      {
        status: 200,
        body: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          user: {
            id: "442332a0-97d2-4e22-91c0-08c3c81d5f84",
            phone: "+99365000001",
            displayName: null,
            role: "admin",
            deletionScheduledAt: null,
          },
        },
      },
      {
        status: 200,
        body: {
          enrolled: true,
          elevated: false,
        },
      },
    ]);

    const formData = new FormData();
    formData.set("phone", "+99365000001");
    formData.set("code", "123456");

    const result = await verifyOtp(null, formData);

    expect(result).toEqual({
      ok: true,
      next: "totp",
      totpEnrolled: true,
    });
  });

  it("verifyOtp reports when the admin still needs TOTP setup", async () => {
    mockFetchQueue([
      {
        status: 200,
        body: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          user: {
            id: "442332a0-97d2-4e22-91c0-08c3c81d5f84",
            phone: "+99365000001",
            displayName: null,
            role: "admin",
            deletionScheduledAt: null,
          },
        },
      },
      {
        status: 200,
        body: {
          enrolled: false,
          elevated: false,
        },
      },
    ]);

    const formData = new FormData();
    formData.set("phone", "+99365000001");
    formData.set("code", "123456");

    const result = await verifyOtp(null, formData);

    expect(result).toEqual({
      ok: true,
      next: "totp",
      totpEnrolled: false,
    });
  });

  it("enrollTotp marks verified-enrollment conflicts for the login UI", async () => {
    mockState.cookies.set("auto_tm_admin_access", "access-token");
    mockFetchQueue([
      {
        status: 409,
        body: {
          code: "CONFLICT",
          message: "TOTP already enrolled",
          details: { reason: "TOTP_ALREADY_ENROLLED" },
        },
      },
    ]);

    const result = await enrollTotp();

    expect(result).toEqual({
      ok: false,
      reason: "already-enrolled",
      error: "Двухфакторная аутентификация уже настроена.",
    });
  });
});
