import { describe, it, expect, vi, beforeEach } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { localeStore } from "./localeStore";

// Mock AsyncStorage
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

describe("localeStore", () => {
  beforeEach(() => {
    // Reset store and mock storage between tests
    localeStore.setState({
      locale: null,
      setLocale: localeStore.getState().setLocale,
      hydrate: localeStore.getState().hydrate,
    });
    mockStorage = {};
    vi.clearAllMocks();
  });

  it("defaults to null locale before hydration", () => {
    expect(localeStore.getState().locale).toBeNull();
  });

  it("hydrates ru from empty storage", async () => {
    await localeStore.getState().hydrate();
    expect(localeStore.getState().locale).toBe("ru");
  });

  it("hydrates stored locale when present", async () => {
    await AsyncStorage.setItem("@auto-tm/locale", "tk");
    await localeStore.getState().hydrate();
    expect(localeStore.getState().locale).toBe("tk");
  });

  it("falls back to ru for unsupported stored locale", async () => {
    await AsyncStorage.setItem("@auto-tm/locale", "fr");
    await localeStore.getState().hydrate();
    expect(localeStore.getState().locale).toBe("ru");
  });

  it("persists locale change to AsyncStorage", async () => {
    localeStore.getState().setLocale("en");
    expect(localeStore.getState().locale).toBe("en");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@auto-tm/locale", "en");
  });
});
