import { describe, expect, it } from "vitest";

import { runReadinessChecks } from "./readiness";

describe("runReadinessChecks", () => {
  it("reports ready when every dependency check passes", async () => {
    const result = await runReadinessChecks(
      {
        postgres: async () => undefined,
        redis: async () => undefined,
        minio: async () => undefined,
      },
      100,
    );

    expect(result.ready).toBe(true);
    expect(result.checks).toEqual({
      postgres: "ok",
      redis: "ok",
      minio: "ok",
    });
  });

  it("fails only the failing check and never throws", async () => {
    const result = await runReadinessChecks(
      {
        postgres: async () => undefined,
        redis: async () => {
          throw new Error("ECONNREFUSED redis://user:secret@host:6379");
        },
        minio: async () => undefined,
      },
      100,
    );

    expect(result.ready).toBe(false);
    expect(result.checks).toEqual({
      postgres: "ok",
      redis: "failed",
      minio: "ok",
    });
    // Raw error messages (which can embed connection details) never leak.
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("bounds a hung dependency by the per-check timeout", async () => {
    const started = Date.now();
    const result = await runReadinessChecks(
      {
        postgres: () => new Promise<void>(() => undefined), // never resolves
        redis: async () => undefined,
      },
      30,
    );

    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.ready).toBe(false);
    expect(result.checks).toEqual({ postgres: "failed", redis: "ok" });
  });

  it("runs checks concurrently so total latency stays bounded", async () => {
    const slow = () =>
      new Promise<void>((resolve) => setTimeout(resolve, 80));

    const started = Date.now();
    const result = await runReadinessChecks(
      { a: slow, b: slow, c: slow },
      1000,
    );
    const elapsed = Date.now() - started;

    expect(result.ready).toBe(true);
    // Sequential execution would take ~240ms; concurrent stays near one leg.
    expect(elapsed).toBeLessThan(200);
  });
});
