import { describe, it, expect, vi, beforeEach } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { readOnboardingFlag, setOnboardingCompleted, setOnboardingPending } from "./onboardingFlag";

let mockStorage: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

describe("onboardingFlag", () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
  });

  it("reads null when no flag is stored", async () => {
    expect(await readOnboardingFlag()).toBeNull();
  });

  it("reads completed after onboarding is marked completed", async () => {
    await setOnboardingCompleted();

    expect(await readOnboardingFlag()).toBe("completed");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@auto-tm/onboarding-completed",
      "true",
    );
  });

  it("reads pending after onboarding is marked pending", async () => {
    await setOnboardingPending();

    expect(await readOnboardingFlag()).toBe("pending");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@auto-tm/onboarding-completed",
      "pending",
    );
  });

  it("reads null for a value it does not know", async () => {
    mockStorage["@auto-tm/onboarding-completed"] = "garbage";

    expect(await readOnboardingFlag()).toBeNull();
  });
});
