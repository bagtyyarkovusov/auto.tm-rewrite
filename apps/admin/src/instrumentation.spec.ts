import { afterEach, describe, expect, it, vi } from "vitest";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { register } from "./instrumentation";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("admin runtime configuration", () => {
  it.each([undefined, "", "invalid", "ftp://api.example.test"])(
    "refuses production server initialization with API_BASE_URL %s", (address) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PHASE", undefined);
      vi.stubEnv("API_BASE_URL", address);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("API_BASE_URL must be configured as an http(s) URL."); });
      expect(() => register()).toThrow(/API_BASE_URL.*http/i);
      expect(exit).toHaveBeenCalledWith(1);
    },
  );

  it("builds a reusable image before the runtime address is provided", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", PHASE_PRODUCTION_BUILD);
    vi.stubEnv("API_BASE_URL", undefined);
    expect(() => register()).not.toThrow();
  });
});
