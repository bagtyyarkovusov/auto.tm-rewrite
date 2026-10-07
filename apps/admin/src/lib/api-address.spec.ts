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
});
