import type { BrandModelChoice } from "./recentSearches";
import { buildResultsParams } from "./resultsParams";
import { writeResultsRouteState } from "./resultsRouteState";
import type { ListingFilter } from "./useListingFilters";

export const BRANDS_PATH = "/(tabs)/(search)/brands";
export const MODELS_PATH = "/(tabs)/(search)/models";
export const RESULTS_PATH = "/(tabs)/(search)/results";
export const PARAMETERS_PATH = "/(tabs)/(search)/parameters";

export interface PickedBrand {
  id: string;
  name: string;
}

export interface PickerOriginParams { returnToResults?: "1"; resultsState?: string }

export type PickerHref =
  | typeof BRANDS_PATH
  | { pathname: typeof BRANDS_PATH; params: PickerOriginParams }
  | { pathname: typeof MODELS_PATH; params: { brandId: string; modelIds?: string } & PickerOriginParams }
  | { pathname: typeof RESULTS_PATH; params: Record<string, string | undefined> }
  | { pathname: typeof PARAMETERS_PATH; params: Record<string, string | undefined> };

/** The part of expo-router's router the pickers use; tests pass a fake. */
export interface PickerRouter {
  push(href: PickerHref): void;
  dismissAll(): void;
  dismissTo(href: PickerHref): void;
  canDismiss(): boolean;
}

/**
 * What the Brand and Model pickers do when the buyer acts. The pickers only
 * render and call these; where each action leads depends on where they were
 * opened from.
 *
 * - `show` (from Home or Results): pushed routes. The Model picker ends with
 *   "Show N listings" and offers "More filters", which opens the full-screen
 *   Search parameters form; the Brand picker offers Recent. Search's All
 *   filters also opens that form, directly and without these actions.
 * - `done` (from Search parameters): steps inside the form. The Model picker
 *   ends with "Done" and hands the choice back to the form.
 */
export interface PickerActions {
  mode: "show" | "done";
  pickBrand(brand: PickedBrand): void;
  /** "Show N listings" or "Done". Saves the choice to Recent. */
  confirm(choice: BrandModelChoice): void;
  changeBrand(): void;
  moreFilters?: (choice: BrandModelChoice) => void;
  pickRecent?: (choice: BrandModelChoice) => void;
}

/** From Home or Results: "More filters" and Recent are always available. */
export interface RoutePickerActions extends PickerActions {
  mode: "show";
  moreFilters: (choice: BrandModelChoice) => void;
  pickRecent: (choice: BrandModelChoice) => void;
}

type RecordChoice = (choice: BrandModelChoice) => void;

export function modelsHref(brandId: string, modelIds: readonly string[] = [], origin: PickerOriginParams = {}): PickerHref {
  return {
    pathname: MODELS_PATH,
    params: { ...origin, ...(modelIds.length > 0 ? { brandId, modelIds: modelIds.join(",") } : { brandId }) },
  };
}

/**
 * Opens Results with the pickers taken off the stack, so Back from Results
 * goes to where the buyer started (Home) rather than into the pickers.
 */
function openResults(
  router: PickerRouter,
  choice: BrandModelChoice,
  resultsState?: Record<string, string | undefined>,
) {
  if (resultsState) {
    router.dismissTo({ pathname: RESULTS_PATH, params: {
      ...resultsState, ...buildResultsParams(choice),
      modelIds: choice.modelIds.length ? choice.modelIds.join(",") : undefined,
      modelId: undefined,
    } });
    return;
  }
  if (router.canDismiss()) router.dismissAll();
  router.push({ pathname: RESULTS_PATH, params: buildResultsParams(choice) });
}

/**
 * Pushes the full-screen Search parameters form with the brand and models
 * kept. From Results the form also carries the Results filters and sort, and
 * `returnToResults` tells its Show N that a Results screen is below it.
 */
function openParameters(
  router: PickerRouter,
  choice: BrandModelChoice,
  resultsState?: Record<string, string | undefined>,
) {
  router.push({ pathname: PARAMETERS_PATH, params: {
    ...resultsState, ...buildResultsParams(choice),
    modelIds: choice.modelIds.length ? choice.modelIds.join(",") : undefined,
    modelId: undefined,
    ...(resultsState ? { returnToResults: "1" } : {}),
  } });
}

/**
 * Search parameters' "Show N listings". With a Results screen below the form
 * (`returnToResults`), it updates that screen in place; otherwise it opens
 * Results over Home with the pickers and the form taken off the stack. Either
 * way Results is never stacked twice.
 */
export function showResultsFromParameters(router: PickerRouter, filters: ListingFilter, returnToResults: boolean) {
  const params = writeResultsRouteState(filters);
  if (returnToResults) {
    router.dismissTo({ pathname: RESULTS_PATH, params });
    return;
  }
  if (router.canDismiss()) router.dismissAll();
  router.push({ pathname: RESULTS_PATH, params });
}

export function createRoutePickerActions({
  router,
  record,
  resultsState,
}: {
  router: PickerRouter;
  record: RecordChoice;
  resultsState?: Record<string, string | undefined>;
}): RoutePickerActions {
  const origin: PickerOriginParams = resultsState ? { returnToResults: "1", resultsState: JSON.stringify(resultsState) } : {};
  return {
    mode: "show",
    pickBrand: (brand) => router.push(modelsHref(brand.id, [], origin)),
    confirm(choice) {
      record(choice);
      openResults(router, choice, resultsState);
    },
    moreFilters: (choice) => openParameters(router, choice, resultsState),
    changeBrand: () => router.dismissTo(resultsState ? { pathname: BRANDS_PATH, params: origin } : BRANDS_PATH),
    pickRecent(choice) {
      record(choice);
      openResults(router, choice, resultsState);
    },
  };
}

export type DonePickerStep = { step: "brand" } | { step: "model"; brand: PickedBrand };

/**
 * The Search parameters form fields a Done choice sets: the brand, and the
 * ticked models or none for every model of the brand. A legacy single
 * `modelId` is cleared, since the feed rejects it next to `modelIds`.
 */
export function choiceFormFields(choice: BrandModelChoice): {
  brandId: string;
  modelId: undefined;
  modelIds: string[] | undefined;
} {
  return {
    brandId: choice.brandId,
    modelId: undefined,
    modelIds: choice.modelIds.length > 0 ? [...choice.modelIds] : undefined,
  };
}

export function createDonePickerActions({
  setStep,
  onDone,
  record,
}: {
  setStep: (step: DonePickerStep) => void;
  onDone: (choice: BrandModelChoice) => void;
  record: RecordChoice;
}): PickerActions {
  return {
    mode: "done",
    pickBrand: (brand) => setStep({ step: "model", brand }),
    confirm(choice) {
      record(choice);
      onDone(choice);
    },
    changeBrand: () => setStep({ step: "brand" }),
  };
}
