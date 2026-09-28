import { describe, expect, it } from "vitest";

import { listingGridCardText } from "./listingGridCardText";

const base = {
  locale: "en",
  newLabel: "New",
  kmLabel: "km",
  brandName: "Toyota",
  modelName: "Camry",
};

describe("listingGridCardText", () => {
  it("shows the price in TMT, Brand Model, and year, km for a used car", () => {
    const text = listingGridCardText({
      ...base,
      listing: { displayPriceTmt: 245000, year: 2018, condition: "used", mileageKm: 98000 },
    });

    expect(text.price).toBe("245,000 TMT");
    expect(text.title).toBe("Toyota Camry");
    expect(text.meta).toBe("2018, 98,000 km");
  });

  it("shows year, New for a new car even when mileage is present", () => {
    const text = listingGridCardText({
      ...base,
      listing: { displayPriceTmt: 900000, year: 2025, condition: "new", mileageKm: 12 },
    });

    expect(text.meta).toBe("2025, New");
  });

  it("drops missing parts without placeholders", () => {
    expect(
      listingGridCardText({
        ...base,
        listing: { displayPriceTmt: 1, year: 2010, condition: "used" },
      }).meta,
    ).toBe("2010");
    expect(
      listingGridCardText({
        ...base,
        listing: { displayPriceTmt: 1, mileageKm: 5000 },
      }).meta,
    ).toBe("5,000 km");
    expect(
      listingGridCardText({ ...base, listing: { displayPriceTmt: 1 } }).meta,
    ).toBeNull();
    expect(
      listingGridCardText({
        ...base,
        modelName: undefined,
        listing: { displayPriceTmt: 1 },
      }).title,
    ).toBe("Toyota");
  });

  it("reports no title while neither catalog name has resolved", () => {
    const text = listingGridCardText({
      ...base,
      brandName: undefined,
      modelName: undefined,
      listing: { displayPriceTmt: 1 },
    });

    expect(text.title).toBeNull();
  });

  it("formats the mileage with the active locale", () => {
    const text = listingGridCardText({
      ...base,
      locale: "ru",
      kmLabel: "км",
      listing: { displayPriceTmt: 1, year: 2018, mileageKm: 98000 },
    });

    expect(text.meta).toMatch(/^2018, 98\s000 км$/);
  });

  it("never exposes a date, city, gearbox or fuel", () => {
    const text = listingGridCardText({
      ...base,
      listing: { displayPriceTmt: 1, year: 2018 },
    });

    expect(Object.keys(text).sort()).toEqual(["meta", "price", "title"]);
  });
});
