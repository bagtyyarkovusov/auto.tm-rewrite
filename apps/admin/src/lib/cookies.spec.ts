import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import {
  getAccessCookieName,
  getRefreshCookieName,
  setAuthCookies,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
} from "./cookies";

describe("cookie helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("getAccessCookieName", () => {
    it("returns __Host-prefixed name in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(getAccessCookieName()).toBe("__Host-auto_tm_admin_access");
    });

    it("returns unprefixed name in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(getAccessCookieName()).toBe("auto_tm_admin_access");
    });
  });

  describe("getRefreshCookieName", () => {
    it("returns __Host-prefixed name in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(getRefreshCookieName()).toBe("__Host-auto_tm_admin_refresh");
    });

    it("returns unprefixed name in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(getRefreshCookieName()).toBe("auto_tm_admin_refresh");
    });
  });

  describe("setAuthCookies", () => {
    it("sets both cookies with canonical flags", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await setAuthCookies("access123", "refresh456");

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "__Host-auto_tm_admin_access",
        "access123",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 15 * 60,
        }),
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "__Host-auto_tm_admin_refresh",
        "refresh456",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        }),
      );
    });

    it("does not enforce secure flag in development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      await setAuthCookies("access123", "refresh456");

      const call = (mockCookieStore.set as Mock).mock.calls[0];
      const accessOptions = call?.[2];
      expect(accessOptions).not.toHaveProperty("secure", true);
    });
  });

  describe("clearAuthCookies", () => {
    it("clears both cookies by setting maxAge=0", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await clearAuthCookies();

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "__Host-auto_tm_admin_access",
        "",
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "__Host-auto_tm_admin_refresh",
        "",
        expect.objectContaining({ maxAge: 0 }),
      );
    });
  });

  describe("getAccessToken", () => {
    it("returns the access token value", async () => {
      mockCookieStore.get.mockReturnValue({ value: "tok" });
      const token = await getAccessToken();
      expect(token).toBe("tok");
    });

    it("returns undefined when cookie is missing", async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      const token = await getAccessToken();
      expect(token).toBeUndefined();
    });
  });

  describe("getRefreshToken", () => {
    it("returns the refresh token value", async () => {
      mockCookieStore.get.mockReturnValue({ value: "reftok" });
      const token = await getRefreshToken();
      expect(token).toBe("reftok");
    });
  });

  describe("no token leakage", () => {
    it("setAuthCookies does not log tokens", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await setAuthCookies("secret_access", "secret_refresh");
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("secret_access"),
      );
      consoleSpy.mockRestore();
    });
  });
});
