import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "./middleware";

describe("admin middleware", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects unauthenticated protected routes to login with pathname and search returnTo", () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = new NextRequest(
      "http://admin.auto.tm/audit?action=LISTING_BAN&page=2",
    );

    const response = middleware(request);

    expect(response.headers.get("location")).toBe(
      "http://admin.auto.tm/login?returnTo=%2Faudit%3Faction%3DLISTING_BAN%26page%3D2",
    );
  });

  it("forwards a sanitized returnTo request header for protected routes with an access cookie", () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = new NextRequest("http://admin.auto.tm/reports?page=2", {
      headers: {
        cookie: "auto_tm_admin_access=access-token",
      },
    });

    const response = middleware(request);

    expect(response.headers.get("x-middleware-request-x-admin-return-to")).toBe(
      "/reports?page=2",
    );
  });
});

const refresh = "a".repeat(64);
const rotatedRefresh = "b".repeat(64);
function jwt(exp: number): string {
  return `e30.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
}
function expiredRequest(method = "GET", token = refresh) {
  return new NextRequest("http://admin.auto.tm/reports?page=2", {
    method, headers: { cookie: `auto_tm_admin_access=${jwt(1)}; auto_tm_admin_refresh=${token}` },
  });
}

// This seam is the incoming request: cookie storage and dispatch are real
// NextRequest/NextResponse APIs; only the external API network is replaced.
describe("admin session renewal before request dispatch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("API_BASE_URL", "http://api.example.test");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });

  it("renews an expired GET and forwards/stores both rotated tokens", async () => {
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    vi.mocked(fetch).mockResolvedValue(Response.json({ accessToken: access, refreshToken: rotatedRefresh }));
    const { middleware } = await import("./middleware");
    const response = await middleware(expiredRequest());
    expect(response.cookies.get("auto_tm_admin_access")?.value).toBe(access);
    expect(response.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`auto_tm_admin_access=${access}`);
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`auto_tm_admin_refresh=${rotatedRefresh}`);
    expect(response.headers.get("location")).toBeNull();
    expect(fetch).toHaveBeenCalledWith("http://api.example.test/api/v1/auth/refresh", expect.any(Object));
  });

  it("renews before dispatching a Server Action and preserves its POST body", async () => {
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    vi.mocked(fetch).mockResolvedValue(Response.json({ accessToken: access, refreshToken: rotatedRefresh }));
    const { middleware } = await import("./middleware");
    const request = new NextRequest("http://admin.auto.tm/reports", {
      method: "POST", body: "original-action-payload",
      headers: { "next-action": "action-id", cookie: `auto_tm_admin_refresh=${refresh}` },
    });
    const response = await middleware(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`auto_tm_admin_access=${access}`);
    expect(request.method).toBe("POST");
    expect(await request.text()).toBe("original-action-payload");
  });

  it("shares one single-use rotation across near-simultaneous requests", async () => {
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(fetch).mockImplementation(async () => {
      await gate;
      return Response.json({ accessToken: access, refreshToken: rotatedRefresh });
    });
    const { middleware } = await import("./middleware");
    const first = middleware(expiredRequest());
    const second = middleware(expiredRequest("POST"));
    release();
    for (const response of await Promise.all([first, second])) {
      expect(response.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
      expect(response.headers.get("location")).toBeNull();
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears both cookies and cancels a losing action with a 303 login redirect", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ code: "TOKEN_ALREADY_USED" }, { status: 401 }));
    const { middleware } = await import("./middleware");
    const response = await middleware(expiredRequest("POST"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://admin.auto.tm/login?reason=session-expired&returnTo=%2Freports%3Fpage%3D2");
    for (const name of ["auto_tm_admin_access", "auto_tm_admin_refresh"]) {
      expect(response.cookies.get(name)).toMatchObject({ value: "", maxAge: 0 });
    }
    expect(response.headers.get("x-middleware-next")).toBeNull();
    const login = await middleware(new NextRequest(response.headers.get("location")!));
    expect(login.headers.get("location")).toBeNull();
  });

  it("hands off only for five seconds, then lets the API reject the old token", async () => {
    vi.useFakeTimers();
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ accessToken: access, refreshToken: rotatedRefresh }))
      .mockResolvedValue(Response.json({ code: "INVALID_REFRESH_TOKEN" }, { status: 401 }));
    const { middleware } = await import("./middleware");
    const first = await middleware(expiredRequest());
    expect(first.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    const handoff = await middleware(expiredRequest());
    expect(handoff.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_001);
    const late = await middleware(expiredRequest());
    expect(late.headers.get("location")).toContain("/login?reason=session-expired");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
