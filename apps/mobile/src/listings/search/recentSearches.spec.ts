import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  RECENT_LIMIT,
  RECENT_STORAGE_KEY,
  addRecentChoice,
  loadRecentChoices,
  useRecentChoicesStore,
  type BrandModelChoice,
} from "./recentSearches";

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

function choice(
  brandId: string,
  modelIds: string[] = [],
): BrandModelChoice {
  return {
    brandId,
    brandName: `Brand ${brandId}`,
    modelIds,
    modelNames: modelIds.map((id) => `Model ${id}`),
  };
}

describe("addRecentChoice", () => {
  it("puts the newest choice first", () => {
    const list = addRecentChoice([choice("a")], choice("b"));
    expect(list.map((c) => c.brandId)).toEqual(["b", "a"]);
  });

  it("keeps at most ten choices, dropping the oldest", () => {
    let list: BrandModelChoice[] = [];
    for (let i = 0; i < 12; i++) list = addRecentChoice(list, choice(`b${i}`));

    expect(RECENT_LIMIT).toBe(10);
    expect(list).toHaveLength(10);
    expect(list[0]?.brandId).toBe("b11");
    expect(list.map((c) => c.brandId)).not.toContain("b0");
    expect(list.map((c) => c.brandId)).not.toContain("b1");
  });

  it("moves a repeated choice to the top instead of duplicating it", () => {
    const list = addRecentChoice(
      [choice("a", ["m1", "m2"]), choice("b"), choice("c")],
      // Same models in a different order are the same choice.
      choice("a", ["m2", "m1"]),
    );

    expect(list.map((c) => c.brandId)).toEqual(["a", "b", "c"]);
    expect(list[0]?.modelIds).toEqual(["m2", "m1"]);
  });

  it("keeps a brand-only choice separate from the same brand with models", () => {
    const list = addRecentChoice([choice("a", ["m1"])], choice("a"));

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ brandId: "a", modelIds: [] });
    expect(list[1]).toMatchObject({ brandId: "a", modelIds: ["m1"] });
  });
});

describe("Recent store", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
    useRecentChoicesStore.getState().resetForTests();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves a confirmed choice on the device and reads it back", async () => {
    await useRecentChoicesStore.getState().record(choice("a", ["m1"]));

    expect(useRecentChoicesStore.getState().items).toEqual([choice("a", ["m1"])]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      RECENT_STORAGE_KEY,
      expect.any(String),
    );
    expect(await loadRecentChoices()).toEqual([choice("a", ["m1"])]);
  });

  it("keeps earlier choices from storage when recording before hydration", async () => {
    mockStorage[RECENT_STORAGE_KEY] = JSON.stringify([choice("old")]);

    await useRecentChoicesStore.getState().record(choice("new"));

    expect(useRecentChoicesStore.getState().items.map((c) => c.brandId)).toEqual([
      "new",
      "old",
    ]);
  });

  it("hydrates from storage", async () => {
    mockStorage[RECENT_STORAGE_KEY] = JSON.stringify([choice("a"), choice("b")]);

    await useRecentChoicesStore.getState().hydrate();

    expect(useRecentChoicesStore.getState().items.map((c) => c.brandId)).toEqual([
      "a",
      "b",
    ]);
    expect(useRecentChoicesStore.getState().hydrated).toBe(true);
  });

  it("treats corrupt stored data as an empty list", async () => {
    mockStorage[RECENT_STORAGE_KEY] = "{not json";
    expect(await loadRecentChoices()).toEqual([]);

    mockStorage[RECENT_STORAGE_KEY] = JSON.stringify([{ brandId: 1 }]);
    expect(await loadRecentChoices()).toEqual([]);
  });

  it("clears every choice from the device", async () => {
    await useRecentChoicesStore.getState().record(choice("a"));
    await useRecentChoicesStore.getState().clear();

    expect(useRecentChoicesStore.getState().items).toEqual([]);
    expect(mockStorage[RECENT_STORAGE_KEY]).toBeUndefined();
    expect(await loadRecentChoices()).toEqual([]);
  });

  it("never calls the network", async () => {
    await useRecentChoicesStore.getState().hydrate();
    await useRecentChoicesStore.getState().record(choice("a"));
    await useRecentChoicesStore.getState().clear();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
