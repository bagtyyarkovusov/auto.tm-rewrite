import { describe, it, expect, vi, beforeEach } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getOnboardingCompleted,
  setOnboardingCompleted,
  resetOnboardingCompleted,
} from "./onboardingFlag";

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

  it("returns false when no flag is stored", async () => {
    const completed = await getOnboardingCompleted();
    expect(completed).toBe(false);
  });

  it("returns true after onboarding is marked completed", async () => {
    await setOnboardingCompleted();
    const completed = await getOnboardingCompleted();
    expect(completed).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@auto-tm/onboarding-completed",
      "true",
    );
  });

  it("can reset the completed flag", async () => {
    await setOnboardingCompleted();
    expect(await getOnboardingCompleted()).toBe(true);

    await resetOnboardingCompleted();
    expect(await getOnboardingCompleted()).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "@auto-tm/onboarding-completed",
    );
  });
});
