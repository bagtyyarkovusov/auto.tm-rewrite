import { describe, expect, it, vi } from "vitest";

import {
  BRANDS_PATH,
  MODELS_PATH,
  RESULTS_PATH,
  choiceFormFields,
  createDonePickerActions,
  createRoutePickerActions,
  type PickerRouter,
} from "./pickerActions";
import { parseResultsParams } from "./resultsParams";
import type { BrandModelChoice } from "./recentSearches";

const camryRav4: BrandModelChoice = {
  brandId: "toyota",
  brandName: "Toyota",
  modelIds: ["camry", "rav4"],
  modelNames: ["Camry", "RAV4"],
};
const toyotaOnly: BrandModelChoice = {
  brandId: "toyota",
  brandName: "Toyota",
  modelIds: [],
  modelNames: [],
};

function fakeRouter(canDismiss = true) {
  const calls: string[] = [];
  const router: PickerRouter = {
    push: vi.fn(() => calls.push("push")),
    dismissAll: vi.fn(() => calls.push("dismissAll")),
    dismissTo: vi.fn(() => calls.push("dismissTo")),
    canDismiss: vi.fn(() => canDismiss),
  };
  return { router, calls };
}

describe("Brand and Model picker from Home or Results", () => {
  it("tapping a brand opens the Model picker for that brand", () => {
    const { router } = fakeRouter();
    const actions = createRoutePickerActions({ router, record: vi.fn() });

    actions.pickBrand({ id: "toyota", name: "Toyota" });

    expect(router.push).toHaveBeenCalledWith({
      pathname: MODELS_PATH,
      params: { brandId: "toyota" },
    });
  });

  it("Show N opens Results with the brand and models, without the pickers behind it", () => {
    const { router, calls } = fakeRouter();
    const record = vi.fn();
    const actions = createRoutePickerActions({ router, record });

    actions.confirm(camryRav4);

    expect(calls).toEqual(["dismissAll", "push"]);
    const href = vi.mocked(router.push).mock.calls[0]?.[0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(href.pathname).toBe(RESULTS_PATH);
    expect(parseResultsParams(href.params)).toEqual({
      brandId: "toyota",
      modelIds: ["camry", "rav4"],
      openFilters: false,
    });
    expect(record).toHaveBeenCalledWith(camryRav4);
  });

  it("Show N with no model opens Results for every model of the brand", () => {
    const { router } = fakeRouter();
    const actions = createRoutePickerActions({ router, record: vi.fn() });

    actions.confirm(toyotaOnly);

    const href = vi.mocked(router.push).mock.calls[0]?.[0] as {
      params: Record<string, string>;
    };
    expect(parseResultsParams(href.params)).toEqual({
      brandId: "toyota",
      modelIds: [],
      openFilters: false,
    });
  });

  it("does not dismiss when nothing is under the picker", () => {
    const { router, calls } = fakeRouter(false);
    createRoutePickerActions({ router, record: vi.fn() }).confirm(toyotaOnly);
    expect(calls).toEqual(["push"]);
  });

  it("More filters opens Search parameters with the brand and models kept, not yet saved to Recent", () => {
    const { router } = fakeRouter();
    const record = vi.fn();
    const actions = createRoutePickerActions({ router, record });

    actions.moreFilters(camryRav4);

    const href = vi.mocked(router.push).mock.calls[0]?.[0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(href.pathname).toBe(RESULTS_PATH);
    expect(parseResultsParams(href.params)).toEqual({
      brandId: "toyota",
      modelIds: ["camry", "rav4"],
      openFilters: true,
    });
    expect(record).not.toHaveBeenCalled();
  });

  it("Change brand returns to the Brand picker", () => {
    const { router } = fakeRouter();
    createRoutePickerActions({ router, record: vi.fn() }).changeBrand();
    expect(router.dismissTo).toHaveBeenCalledWith(BRANDS_PATH);
  });

  it("a Recent choice goes straight to Results and moves to the top of Recent", () => {
    const { router } = fakeRouter();
    const record = vi.fn();
    createRoutePickerActions({ router, record }).pickRecent(camryRav4);

    const href = vi.mocked(router.push).mock.calls[0]?.[0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(href.pathname).toBe(RESULTS_PATH);
    expect(parseResultsParams(href.params)?.modelIds).toEqual(["camry", "rav4"]);
    expect(record).toHaveBeenCalledWith(camryRav4);
  });
});

describe("Done mode, opened from Search parameters", () => {
  it("tapping a brand moves to the Model picker step", () => {
    const setStep = vi.fn();
    const actions = createDonePickerActions({ setStep, onDone: vi.fn(), record: vi.fn() });

    actions.pickBrand({ id: "toyota", name: "Toyota" });

    expect(setStep).toHaveBeenCalledWith({
      step: "model",
      brand: { id: "toyota", name: "Toyota" },
    });
  });

  it("Done returns the selection to the form instead of opening Results", () => {
    const onDone = vi.fn();
    const record = vi.fn();
    const actions = createDonePickerActions({ setStep: vi.fn(), onDone, record });

    actions.confirm(camryRav4);

    expect(onDone).toHaveBeenCalledWith(camryRav4);
    expect(record).toHaveBeenCalledWith(camryRav4);
  });

  it("Change brand goes back to the brand step", () => {
    const setStep = vi.fn();
    createDonePickerActions({ setStep, onDone: vi.fn(), record: vi.fn() }).changeBrand();
    expect(setStep).toHaveBeenCalledWith({ step: "brand" });
  });

  it("has no More filters or Recent shortcut, since the form is already open", () => {
    const actions = createDonePickerActions({
      setStep: vi.fn(),
      onDone: vi.fn(),
      record: vi.fn(),
    });
    expect(actions.moreFilters).toBeUndefined();
    expect(actions.pickRecent).toBeUndefined();
    expect(actions.mode).toBe("done");
  });
});

describe("Done writes the choice back to the form", () => {
  it("sets the brand and the ticked models, clearing a legacy single model", () => {
    expect(choiceFormFields(camryRav4)).toEqual({
      brandId: "toyota",
      modelId: undefined,
      modelIds: ["camry", "rav4"],
    });
  });

  it("replaces the models of a previously chosen brand; none means every model", () => {
    // The form had Lexus RX; the buyer changed brand to Toyota with no model.
    const form: Record<string, unknown> = { brandId: "lexus", modelIds: ["rx"], cityId: "c1" };
    Object.assign(form, choiceFormFields(toyotaOnly));
    expect(form).toEqual({ brandId: "toyota", cityId: "c1" });
    expect("modelIds" in form && form["modelIds"] === undefined).toBe(true);
  });
});

describe("returning from the Results model picker", () => {
  it("updates the existing Results search while retaining sort and non-model filters", () => {
    const router = { push: vi.fn(), dismissAll: vi.fn(), dismissTo: vi.fn(), canDismiss: () => true };
    const actions = createRoutePickerActions({ router, record: vi.fn(), resultsState: { cityId: "city-1", yearMin: "2018", sort: "price_desc", brandId: "old-brand", modelIds: "old-model" } });
    actions.confirm({ brandId: "brand-1", brandName: "Toyota", modelIds: ["model-1", "model-2"], modelNames: ["Camry", "Corolla"] });
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: RESULTS_PATH, params: { cityId: "city-1", yearMin: "2018", sort: "price_desc", brandId: "brand-1", modelIds: "model-1,model-2", modelId: undefined } });
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
