// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
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
});
