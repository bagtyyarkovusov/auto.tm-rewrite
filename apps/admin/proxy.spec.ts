import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("admin proxy", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects unauthenticated protected routes to login with pathname and search returnTo", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = new NextRequest(
      "http://admin.auto.tm/audit?action=LISTING_BAN&page=2",
    );

    const response = await proxy(request);

    expect(response.headers.get("location")).toBe(
      "http://admin.auto.tm/login?reason=session-expired&returnTo=%2Faudit%3Faction%3DLISTING_BAN%26page%3D2",
    );
  });

  it("forwards a sanitized returnTo request header for protected routes with an access cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = new NextRequest("http://admin.auto.tm/reports?page=2", {
      headers: {
        cookie: `auto_tm_admin_access=${jwt(Math.floor(Date.now() / 1000) + 900)}`,
      },
    });

    const response = await proxy(request);

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
    method, headers: { origin: "http://admin.auto.tm", cookie: `auto_tm_admin_access=${jwt(1)}; auto_tm_admin_refresh=${token}` },
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
    const { proxy } = await import("./proxy");
    const response = await proxy(expiredRequest());
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
    const { proxy } = await import("./proxy");
    const request = new NextRequest("http://admin.auto.tm/reports", {
      method: "POST", body: "original-action-payload",
      headers: { origin: "http://admin.auto.tm", "next-action": "action-id", cookie: `auto_tm_admin_refresh=${refresh}` },
    });
    const response = await proxy(request);
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
    const { proxy } = await import("./proxy");
    const first = proxy(expiredRequest());
    const second = proxy(expiredRequest("POST"));
    release();
    for (const response of await Promise.all([first, second])) {
      expect(response.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
      expect(response.headers.get("location")).toBeNull();
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears both cookies and cancels a losing action with a 303 login redirect", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ code: "TOKEN_ALREADY_USED" }, { status: 401 }));
    const { proxy } = await import("./proxy");
    const response = await proxy(expiredRequest("POST"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://admin.auto.tm/login?reason=session-expired&returnTo=%2Freports%3Fpage%3D2");
    for (const name of ["auto_tm_admin_access", "auto_tm_admin_refresh"]) {
      expect(response.cookies.get(name)).toMatchObject({ value: "", maxAge: 0 });
    }
    expect(response.headers.get("x-middleware-next")).toBeNull();
    const location = response.headers.get("location");
    if (!location) throw new Error("missing login redirect");
    const login = await proxy(new NextRequest(location));
    expect(login.headers.get("location")).toBeNull();
  });

  it("hands off only for five seconds, then lets the API reject the old token", async () => {
    vi.useFakeTimers();
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ accessToken: access, refreshToken: rotatedRefresh }))
      .mockResolvedValue(Response.json({ code: "INVALID_REFRESH_TOKEN" }, { status: 401 }));
    const { proxy } = await import("./proxy");
    const first = await proxy(expiredRequest());
    expect(first.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    const handoff = await proxy(expiredRequest());
    expect(handoff.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_001);
    const late = await proxy(expiredRequest());
    expect(late.headers.get("location")).toContain("/login?reason=session-expired");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not bypass expired POST renewal on the session-expired login URL", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ code: "INVALID_REFRESH_TOKEN" }, { status: 401 }));
    const { proxy } = await import("./proxy");
    const request = new NextRequest("http://admin.auto.tm/login?reason=session-expired", {
      method: "POST", headers: { origin: "http://admin.auto.tm", cookie: `auto_tm_admin_refresh=${refresh}` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a cross-origin action before spending its refresh token", async () => {
    const { proxy } = await import("./proxy");
    const request = expiredRequest("POST");
    request.headers.set("origin", "https://evil.example");
    expect((await proxy(request)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never hands one operator's rotated pair to another refresh token", async () => {
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    const otherRefresh = "c".repeat(64);
    const otherRotated = "d".repeat(64);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ accessToken: access, refreshToken: rotatedRefresh }))
      .mockResolvedValueOnce(Response.json({ accessToken: access, refreshToken: otherRotated }));
    const { proxy } = await import("./proxy");
    const first = await proxy(expiredRequest());
    const other = await proxy(expiredRequest("GET", otherRefresh));
    const handoff = await proxy(expiredRequest());
    expect(first.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    expect(other.cookies.get("auto_tm_admin_refresh")?.value).toBe(otherRotated);
    expect(handoff.cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("bounds the cache at 128 owners without evicting an in-flight rotation", async () => {
    vi.useFakeTimers();
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.mocked(fetch).mockImplementation(async () => { await gate; return Response.json({ accessToken: access, refreshToken: rotatedRefresh }); });
    const { proxy } = await import("./proxy");
    const token = (n: number) => n.toString(16).padStart(64, "0");
    const owners = Array.from({ length: 128 }, (_, i) => proxy(expiredRequest("GET", token(i + 1))));
    const duplicate = proxy(expiredRequest("GET", token(1)));
    const overflow = await proxy(expiredRequest("GET", token(129)));
    expect(overflow.status).toBe(303);
    expect(fetch).toHaveBeenCalledTimes(128);
    release();
    expect((await duplicate).cookies.get("auto_tm_admin_refresh")?.value).toBe(rotatedRefresh);
    await Promise.all(owners);
    await vi.advanceTimersByTimeAsync(5_001);
    expect((await proxy(expiredRequest("GET", token(129)))).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(129);
  });

  it("writes production Host cookies with unchanged lifetimes and restrictions", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const access = jwt(Math.floor(Date.now() / 1000) + 900);
    vi.mocked(fetch).mockResolvedValue(Response.json({ accessToken: access, refreshToken: rotatedRefresh }));
    const { proxy } = await import("./proxy");
    const response = await proxy(new NextRequest("https://admin.auto.tm/reports", {
      headers: { cookie: `__Host-auto_tm_admin_refresh=${refresh}` },
    }));
    expect(response.cookies.get("__Host-auto_tm_admin_access")).toMatchObject({ value: access, maxAge: 900, secure: true, httpOnly: true, sameSite: "lax", path: "/" });
    expect(response.cookies.get("__Host-auto_tm_admin_refresh")).toMatchObject({ value: rotatedRefresh, maxAge: 2592000, secure: true, httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("aborts a stalled rotation after ten seconds and ends at login", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const { proxy } = await import("./proxy");
    const pending = proxy(expiredRequest("POST"));
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await pending).status).toBe(303);
  });

  it("delegates a failed JavaScript Server Action to an early native action redirect", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ code: "TOKEN_ALREADY_USED" }, { status: 401 }));
    const { proxy } = await import("./proxy");
    const request = expiredRequest("POST");
    request.headers.set("next-action", "action-id");
    request.headers.set("x-admin-session-expired", "untrusted");
    const response = await proxy(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-x-admin-session-expired")).toBe("1");
    expect(response.headers.get("x-middleware-request-cookie") ?? "").not.toContain(refresh);
    expect(response.cookies.get("auto_tm_admin_refresh")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("does not trust a browser-supplied expired-session marker on a valid request", async () => {
    const { proxy } = await import("./proxy");
    const request = new NextRequest("http://admin.auto.tm/login", { headers: { "x-admin-session-expired": "1" } });
    const response = await proxy(request);
    expect(response.headers.get("x-middleware-request-x-admin-session-expired")).toBeNull();
    expect(response.headers.get("x-middleware-override-headers")).not.toContain("x-admin-session-expired");
  });

  it("uses the configured public admin origin for login behind a private Next listener", async () => {
    vi.stubEnv("ADMIN_ORIGIN", "https://admin.auto.tm");
    const { proxy } = await import("./proxy");
    const response = await proxy(new NextRequest("http://localhost:3001/reports"));
    expect(response.headers.get("location")).toBe("https://admin.auto.tm/login?reason=session-expired&returnTo=%2Freports");
  });

});
