import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadAuthSession, type StoredAuthSession } from "../auth/session";

import { resolveOnboardingGate } from "./onboardingGate";

const FLAG = "@auto-tm/onboarding-completed";
const LOCALE = "@auto-tm/locale";

let stored: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => stored[key] ?? null),
    getAllKeys: vi.fn(async () => Object.keys(stored)),
    setItem: vi.fn(async (key: string, value: string) => {
      stored[key] = value;
    }),
  },
}));
vi.mock("../auth/session", () => ({ loadAuthSession: vi.fn(async () => null) }));

const session = { user: { id: "user-1" } } as unknown as StoredAuthSession;

beforeEach(() => {
  stored = {};
  vi.mocked(loadAuthSession).mockResolvedValue(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => stored[key] ?? null);
  vi.mocked(AsyncStorage.getAllKeys).mockImplementation(async () => Object.keys(stored));
  vi.mocked(AsyncStorage.setItem).mockImplementation(async (key: string, value: string) => {
    stored[key] = value;
  });
});

describe("the onboarding launch gate", () => {
  it("shows onboarding on a fresh install and remembers that it is owed", async () => {
    expect(await resolveOnboardingGate()).toBe("show");
    expect(stored[FLAG]).toBe("pending");
  });

  it("shows it again when the app was closed before onboarding ended, though a language is stored by then", async () => {
    stored = { [FLAG]: "pending", [LOCALE]: "tk" };

    expect(await resolveOnboardingGate()).toBe("show");
    expect(stored[FLAG]).toBe("pending");
  });

  it("skips it once it was finished or skipped", async () => {
    stored = { [FLAG]: "true" };

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(loadAuthSession).not.toHaveBeenCalled();
  });

  it("skips it after an update for someone with a stored language, and marks it done", async () => {
    stored = { [LOCALE]: "ru" };

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(stored[FLAG]).toBe("true");
  });

  // The app stores a language only when the person picks one.
  it("skips it after an update for someone who used the app without choosing a language", async () => {
    stored = { "@auto-tm/theme": "dark" };

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(stored[FLAG]).toBe("true");
  });

  it("skips it after an update for someone with a session and nothing else stored, and marks it done", async () => {
    vi.mocked(loadAuthSession).mockResolvedValue(session);

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(stored[FLAG]).toBe("true");
  });

  it("skips it for someone who signed in before finishing it", async () => {
    stored = { [FLAG]: "pending", [LOCALE]: "en" };
    vi.mocked(loadAuthSession).mockResolvedValue(session);

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(stored[FLAG]).toBe("true");
  });

  it("skips onboarding when the session cannot be read, without storing a flag", async () => {
    vi.mocked(loadAuthSession).mockRejectedValue(new Error("keychain locked"));

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(stored[FLAG]).toBeUndefined();
  });

  it("reads storage in the same tick as the call, before anything in the launch can write to it", () => {
    vi.mocked(AsyncStorage.getAllKeys).mockClear();
    void resolveOnboardingGate();

    expect(AsyncStorage.getAllKeys).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(FLAG);
  });

  it("still shows onboarding when the flag cannot be written", async () => {
    vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error("disk full"));

    expect(await resolveOnboardingGate()).toBe("show");
  });

  it("skips onboarding when storage cannot be read", async () => {
    vi.mocked(AsyncStorage.getAllKeys).mockRejectedValue(new Error("storage unavailable"));

    expect(await resolveOnboardingGate()).toBe("skip");
    expect(console.warn).toHaveBeenCalled();
  });

  it("gives up after one second of slow storage, and keeps a late answer for the next start", async () => {
    vi.useFakeTimers();
    const reads: (() => void)[] = [];
    const release = () => reads.forEach((finish) => finish());
    vi.mocked(AsyncStorage.getItem).mockImplementation(
      () => new Promise((resolve) => { reads.push(() => resolve(null)); }),
    );
    const settled = vi.fn();
    void resolveOnboardingGate().then(settled);

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalledWith("skip");

    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(stored[FLAG]).toBe("pending");
  });
});
