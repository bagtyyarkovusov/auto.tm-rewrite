import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("admin API address", () => {
  it.each([
    "https://api.example.test",
    "https://api.example.test/",
    "https://api.example.test/api/v1",
    "https://api.example.test/api/v1/",
  ])("reaches the versioned API from %s", async (address) => {
    vi.stubEnv("API_BASE_URL", address);
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    const { apiFetch } = await import("./api-client");

    await expect(apiFetch("/auth/otp/request", {
      method: "POST", body: { phone: "+99365000001" },
    })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/auth/otp/request", expect.any(Object),
    );
  });
  it.each([undefined, "", "not-a-url", "ftp://api.example.test"])(
    "rejects production API_BASE_URL %s with a named configuration error", async (address) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("API_BASE_URL", address);
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://public.example.test/api/v1");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true })));
      const call = async () => {
        const { apiFetch } = await import("./api-client");
        return apiFetch("/auth/otp/request", { method: "POST" });
      };
      await expect(call()).rejects.toThrow(/API_BASE_URL.*http/i);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
