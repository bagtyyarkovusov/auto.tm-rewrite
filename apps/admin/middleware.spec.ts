import { describe, it, expect, vi, beforeEach } from "vitest";
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
