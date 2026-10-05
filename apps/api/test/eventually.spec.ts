import { describe, expect, it } from "vitest";

import { eventually } from "./helpers/eventually";

describe("eventually", () => {
  it("resolves with the first non-null value immediately", async () => {
    let calls = 0;
    const value = await eventually(() => {
      calls += 1;
      return Promise.resolve("ready");
    });

    expect(value).toBe("ready");
    expect(calls).toBe(1);
  });

  it("polls until the value appears", async () => {
    let calls = 0;
    const value = await eventually(
      () => {
        calls += 1;
        return Promise.resolve(calls < 3 ? null : calls);
      },
      { intervalMs: 1 },
    );

    expect(value).toBe(3);
    expect(calls).toBe(3);
  });

  it("throws a timeout error naming the description when the probe stays null", async () => {
    await expect(
      eventually(() => Promise.resolve(null), {
        timeoutMs: 50,
        intervalMs: 5,
        description: "the audit row",
      }),
    ).rejects.toThrow("Timed out after 50ms waiting for the audit row");
  });
});
