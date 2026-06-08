import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryTotpThrottleAdapter } from "./InMemoryTotpThrottleAdapter";

describe("InMemoryTotpThrottleAdapter", () => {
  let throttle: InMemoryTotpThrottleAdapter;

  beforeEach(() => {
    throttle = new InMemoryTotpThrottleAdapter(10 * 60 * 1000);
  });

  it("counts failures", async () => {
    const count1 = await throttle.recordFailure("user-1", "session-1");
    expect(count1).toBe(1);

    const count2 = await throttle.recordFailure("user-1", "session-1");
    expect(count2).toBe(2);
  });

  it("resets the counter", async () => {
    await throttle.recordFailure("user-1", "session-1");
    await throttle.recordFailure("user-1", "session-1");

    await throttle.reset("user-1", "session-1");

    const count = await throttle.recordFailure("user-1", "session-1");
    expect(count).toBe(1);
  });

  it("uses separate counters for different users/sessions", async () => {
    await throttle.recordFailure("user-1", "session-1");
    const count2 = await throttle.recordFailure("user-2", "session-2");
    expect(count2).toBe(1);
  });

  it("resets the counter after the window expires", async () => {
    vi.useFakeTimers();
    const shortWindow = new InMemoryTotpThrottleAdapter(1000);

    await shortWindow.recordFailure("user-1", "session-1");
    expect(await shortWindow.recordFailure("user-1", "session-1")).toBe(2);

    vi.advanceTimersByTime(1001);
    expect(await shortWindow.recordFailure("user-1", "session-1")).toBe(1);

    vi.useRealTimers();
  });
});
