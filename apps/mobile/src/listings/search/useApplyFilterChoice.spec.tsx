// @vitest-environment happy-dom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useApplyFilterChoice } from "./useApplyFilterChoice";
import { createRoutePickerActions, type PickerRouter } from "./pickerActions";
import { parseResultsParams } from "./resultsParams";
import { useListingFilters } from "./useListingFilters";

const record = vi.fn();
vi.mock("./recentSearches", () => ({ useRecentChoicesStore: (select: (s: unknown) => unknown) => select({ record }) }));
vi.mock("../../api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [{ id: "toyota", name: "Toyota" }, { id: "lexus", name: "Lexus" }] } }) }));
vi.mock("../../api/catalog/useModels", () => ({ useModels: (id: string) => ({ data: { items: id === "toyota" ? [{ id: "camry", name: "Camry" }] : [{ id: "rx", name: "RX" }] } }) }));

describe("More filters confirmation", () => {
  it.each([{ modelIds: [] }, { modelIds: ["camry"] }])("saves the applied selection %j after More filters and city edits", ({ modelIds }) => {
    record.mockClear();
    const router: PickerRouter = { push: vi.fn(), dismissAll: vi.fn(), dismissTo: vi.fn(), canDismiss: () => true };
    createRoutePickerActions({ router, record }).moreFilters({ brandId: "toyota", brandName: "Toyota", modelIds, modelNames: modelIds.map(() => "Camry") });
    expect(record).not.toHaveBeenCalled();
    const href = vi.mocked(router.push).mock.calls[0]?.[0];
    if (!href || typeof href === "string") throw new Error("Expected Results");
    const selection = parseResultsParams(href.params);
    if (!selection) throw new Error("Expected selection");
    const { result } = renderHook(() => {
      const filters = useListingFilters();
      return { filters, apply: useApplyFilterChoice(filters.draft, filters.apply) };
    });
    act(() => { result.current.filters.setField("brandId", selection.brandId); result.current.filters.setField("modelIds", selection.modelIds); result.current.filters.setField("cityId", "city-1"); });
    act(() => result.current.apply());
    expect(result.current.filters.active.cityId).toBe("city-1");
    expect(record).toHaveBeenCalledWith({ brandId: "toyota", brandName: "Toyota", modelIds, modelNames: modelIds.map(() => "Camry") });
  });
  it("records edited brand/models and does not record a cleared brand", () => {
    record.mockClear();
    const { result } = renderHook(() => {
      const filters = useListingFilters();
      return { filters, apply: useApplyFilterChoice(filters.draft, filters.apply) };
    });
    act(() => { result.current.filters.setField("brandId", "lexus"); result.current.filters.setField("modelIds", ["rx"]); });
    act(() => result.current.apply());
    expect(record).toHaveBeenLastCalledWith({ brandId: "lexus", brandName: "Lexus", modelIds: ["rx"], modelNames: ["RX"] });
    record.mockClear();
    act(() => result.current.filters.reset());
    act(() => result.current.apply());
    expect(record).not.toHaveBeenCalled();
  });
});
