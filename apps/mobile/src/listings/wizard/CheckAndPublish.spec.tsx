import type { WizardSchemas } from "@auto-tm/contracts";
import { describe, expect, it, vi } from "vitest";

import { renderMobile, within } from "../../../test/render";
import type { StagedPhoto } from "../uploadStaging/types";

import CheckAndPublish from "./CheckAndPublish";

const ID = "550e8400-e29b-41d4-a716-446655440000";
const named = (name: string) => ({ data: { items: [{ id: ID, name }] } });

vi.mock("../../api/catalog/useBrands", () => ({ useBrands: () => named("Toyota") }));
vi.mock("../../api/catalog/useModels", () => ({ useModels: () => named("Camry") }));
vi.mock("../../api/catalog/useGenerations", () => ({ useGenerations: () => named("XV70") }));
vi.mock("../../api/catalog/useTransmissions", () => ({ useTransmissions: () => named("Automatic") }));
vi.mock("../../api/catalog/useEngineTypes", () => ({ useEngineTypes: () => named("Petrol") }));
vi.mock("../../api/catalog/useCityGroups", () => ({
  useCityGroups: () => ({ groups: [] }),
  findCityInGroups: (_groups: unknown, cityId?: string) =>
    cityId ? { city: { id: cityId, name: "Ashgabat" }, region: { id: ID, name: "Ahal" } } : undefined,
}));

const photo = (n: number, state: StagedPhoto["state"] = "attached"): StagedPhoto => ({
  photoId: `photo-${n}`,
  localUri: `file:///staged/photo-${n}.jpg`,
  key: state === "attached" ? `photo-${n}.jpg` : undefined,
  state,
  sortOrder: n,
  retryCount: 0,
});

const usedCar: WizardSchemas.WizardDraftPayload = {
  brandId: ID, modelId: ID, year: 2020,
  condition: "used", mileageKm: 45000, conditionDisclosure: { damaged: false },
  transmissionId: ID, engineTypeId: ID,
  priceAmount: 185000, priceCurrency: "TMT",
  description: "One owner, serviced on time", regionId: ID, cityId: ID,
  contactPhone: "+99365000000", allowCalls: true, allowChat: true,
};
const ALL_STEPS: WizardSchemas.WizardStep[] = ["vehicle", "specs", "photos", "price", "location", "contact"];

function check(overrides: Partial<Parameters<typeof CheckAndPublish>[0]> = {}, locale = "en") {
  return renderMobile(
    <CheckAndPublish
      payload={usedCar}
      validatedSteps={ALL_STEPS}
      onChangeStep={() => {}}
      photos={[photo(0), photo(1)]}
      {...overrides}
    />,
    { locale },
  );
}

describe("Check and publish, the card preview", () => {
  it("shows the cover photo, price, Brand Model and year, spec line and city under the buyers' note", () => {
    const screen = check();
    const card = within(screen.getByTestId("check-preview"));

    expect(screen.getByTestId("check-preview-cover").props.source).toEqual({ uri: "file:///staged/photo-0.jpg" });
    expect(card.getByText("185,000 TMT")).toBeTruthy();
    expect(card.getByText("Toyota Camry, 2020")).toBeTruthy();
    expect(card.getByText("45,000 km · Automatic · Petrol")).toBeTruthy();
    expect(card.getByText(/^Ashgabat/)).toBeTruthy();

    // The note sits under the card.
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf("This is how buyers will see your listing")).toBeGreaterThan(json.indexOf("Toyota Camry, 2020"));
  });

  it("shows the price in the draft's currency and New for a new car", () => {
    const screen = check({
      payload: { ...usedCar, condition: "new", mileageKm: undefined, priceAmount: 12500, priceCurrency: "USD" },
    });

    expect(screen.getByText("12,500 USD")).toBeTruthy();
    expect(screen.getByText("New · Automatic · Petrol")).toBeTruthy();
  });

  it("says No photos when nothing is picked", () => {
    const screen = check({ photos: [] });

    expect(screen.queryByTestId("check-preview-cover")).toBeNull();
    expect(screen.getByText("No photos")).toBeTruthy();
  });

  it.each([
    ["ru", "Так покупатели увидят ваше объявление"],
    ["tk", "Alyjylar bildirişiňizi şu görnüşde görer"],
  ])("has the buyers' note in %s", (locale, note) => {
    expect(check({}, locale).getByText(note)).toBeTruthy();
  });
});
