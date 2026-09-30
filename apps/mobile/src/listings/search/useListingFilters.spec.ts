// @vitest-environment happy-dom

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useListingFilters } from "./useListingFilters";

describe("useListingFilters", () => {
  it("starts with empty draft and active filters", () => {
    const { result } = renderHook(() => useListingFilters());

    expect(result.current.draft).toEqual({});
    expect(result.current.active).toEqual({});
    expect(result.current.count).toBe(0);
    expect(result.current.isValid).toBe(true);
  });

  it("sets a field on the draft without affecting active", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("brandId", "550e8400-e29b-41d4-a716-446655440000");
    });

    expect(result.current.draft.brandId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.current.active).toEqual({});
    expect(result.current.count).toBe(0);
  });

  it("commits draft to active on apply and updates count", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("brandId", "550e8400-e29b-41d4-a716-446655440000");
      result.current.setField("priceMin", 50000);
    });

    act(() => {
      result.current.apply();
    });

    expect(result.current.active.brandId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.current.active.priceMin).toBe(50000);
    expect(result.current.count).toBe(2);
  });

  it("does not count undefined, null, or empty string values in active", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("brandId", "550e8400-e29b-41d4-a716-446655440000");
      result.current.setField("modelId", undefined);
      result.current.setField("cityId", "");
    });

    act(() => {
      result.current.apply();
    });

    expect(result.current.active.brandId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.current.active.modelId).toBeUndefined();
    expect(result.current.active.cityId).toBeUndefined();
    expect(result.current.count).toBe(1);
  });

  it("clears both draft and active on reset", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("yearMin", 2018);
      result.current.apply();
    });

    expect(result.current.count).toBe(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.draft).toEqual({});
    expect(result.current.active).toEqual({});
    expect(result.current.count).toBe(0);
  });

  it("isValid is false when yearMin > yearMax", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("yearMin", 2020);
      result.current.setField("yearMax", 2010);
    });

    expect(result.current.isValid).toBe(false);
  });

  it("isValid is true when only one year bound is set", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("yearMin", 2020);
    });

    expect(result.current.isValid).toBe(true);
  });

  it("isValid becomes true after fixing an inverted range", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("yearMin", 2020);
      result.current.setField("yearMax", 2010);
    });
    expect(result.current.isValid).toBe(false);

    act(() => {
      result.current.setField("yearMax", 2025);
    });
    expect(result.current.isValid).toBe(true);
  });

  it("overwrites active fields on subsequent apply", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("brandId", "brand-a");
      result.current.apply();
    });

    expect(result.current.active.brandId).toBe("brand-a");
    expect(result.current.count).toBe(1);

    act(() => {
      result.current.setField("brandId", "brand-b");
      result.current.setField("modelId", "model-x");
      result.current.apply();
    });

    expect(result.current.active.brandId).toBe("brand-b");
    expect(result.current.active.modelId).toBe("model-x");
    expect(result.current.count).toBe(2);
  });

  it("removes a field from active when its draft value is cleared then applied", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("condition", "new");
      result.current.apply();
    });

    expect(result.current.count).toBe(1);

    act(() => {
      result.current.setField("condition", undefined);
      result.current.apply();
    });

    expect(result.current.active.condition).toBeUndefined();
    expect(result.current.count).toBe(0);
  });

  it("counts modelIds as a single active filter", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("brandId", "brand-1");
      result.current.setField("modelIds", ["model-1", "model-2"]);
      result.current.apply();
    });

    expect(result.current.active.modelIds).toEqual(["model-1", "model-2"]);
    expect(result.current.count).toBe(2);
  });

  it("does not count an empty modelIds array", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("brandId", "brand-1");
      result.current.setField("modelIds", []);
      result.current.apply();
    });

    expect(result.current.active.modelIds).toBeUndefined();
    expect(result.current.count).toBe(1);
  });

  it("is invalid when modelIds are set without a brand", () => {
    const { result } = renderHook(() => useListingFilters());

    act(() => {
      result.current.setField("modelIds", ["model-1"]);
    });

    expect(result.current.isValid).toBe(false);
  });
});

describe("useListingFilters route write-back", () => {
  it("reports the applied draft, without empty values, to onApply", () => {
    const onApply = vi.fn();
    const { result } = renderHook(() => useListingFilters({ sort: "newest" }, onApply));

    act(() => {
      result.current.setField("cityId", "ashgabat");
      result.current.setField("condition", undefined);
      result.current.setField("modelIds", []);
    });
    expect(onApply).not.toHaveBeenCalled();

    act(() => {
      result.current.apply();
    });

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith({ sort: "newest", cityId: "ashgabat" });
    expect(result.current.active).toEqual({ sort: "newest", cityId: "ashgabat" });
  });

  it("reports an empty filter to onApply on reset", () => {
    const onApply = vi.fn();
    const { result } = renderHook(() => useListingFilters({ sort: "price_asc", cityId: "ashgabat" }, onApply));

    act(() => {
      result.current.reset();
    });

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith({});
    expect(result.current.active).toEqual({});
    expect(result.current.draft).toEqual({});
  });

  it("calls the latest onApply after a rerender", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ onApply }) => useListingFilters({}, onApply), { initialProps: { onApply: first } });

    rerender({ onApply: second });
    act(() => {
      result.current.setField("yearMin", 2018);
      result.current.apply();
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ yearMin: 2018 });
  });

  it("replace swaps draft and active to route state without calling onApply", () => {
    const onApply = vi.fn();
    const { result } = renderHook(() => useListingFilters({ cityId: "ashgabat" }, onApply));

    act(() => {
      result.current.replace({ sort: "year_asc", yearMin: 2018 });
    });

    expect(result.current.active).toEqual({ sort: "year_asc", yearMin: 2018 });
    expect(result.current.draft).toEqual({ sort: "year_asc", yearMin: 2018 });
    expect(result.current.count).toBe(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("commit patches the committed filters, drops cleared values and reports the result", () => {
    const onApply = vi.fn();
    const { result } = renderHook(() => useListingFilters({ sort: "newest", cityId: "ashgabat", condition: "used" }, onApply));

    act(() => {
      result.current.commit({ condition: undefined, priceMin: 70000 });
    });

    const next = { sort: "newest", cityId: "ashgabat", priceMin: 70000 };
    expect(result.current.active).toEqual(next);
    expect(result.current.draft).toEqual(next);
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith(next);
  });

  it("commit builds on the previous commit within one batch of updates", () => {
    const onApply = vi.fn();
    const { result } = renderHook(() => useListingFilters({}, onApply));

    act(() => {
      result.current.commit({ cityId: "ashgabat" });
      result.current.commit({ yearMin: 2018 });
    });

    expect(result.current.active).toEqual({ cityId: "ashgabat", yearMin: 2018 });
    expect(onApply).toHaveBeenLastCalledWith({ cityId: "ashgabat", yearMin: 2018 });
  });
});
