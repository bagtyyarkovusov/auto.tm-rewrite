import type { WizardSchemas } from "@auto-tm/contracts";
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";

import { resources } from "../../i18n/resources";

import { publishBlockerLines } from "./publishBlockers";

function translator(locale: string) {
  const i18n = createInstance();
  void i18n.init({ lng: locale, resources, defaultNS: "common", initImmediate: false });
  return i18n.t.bind(i18n);
}

const ALL: WizardSchemas.WizardStep[] = ["vehicle", "specs", "photos", "price", "location", "contact"];
const without = (...steps: WizardSchemas.WizardStep[]) => ALL.filter((step) => !steps.includes(step));
const none = { inflight: 0, failed: 0, total: 3 };

describe("publishBlockerLines (#588)", () => {
  it("is empty when every step is complete and every photo is uploaded", () => {
    expect(publishBlockerLines(translator("en"), { validatedSteps: ALL, uploads: none })).toEqual([]);
  });

  it("names each incomplete step, in the wizard's order", () => {
    expect(
      publishBlockerLines(translator("en"), { validatedSteps: without("price", "vehicle"), uploads: none }),
    ).toEqual(["Fill in: Car, Price"]);
  });

  it("lists missing steps, then photos still uploading, then failed photos", () => {
    expect(
      publishBlockerLines(translator("en"), {
        validatedSteps: without("location"),
        uploads: { inflight: 2, failed: 1, total: 5 },
      }),
    ).toEqual([
      "Fill in: Description and place",
      "Photos still uploading: 2",
      "Photos failed: 1. Retry or remove them.",
    ]);
  });

  it("says nothing about photos until the upload queue holds the draft's photos", () => {
    expect(publishBlockerLines(translator("en"), { validatedSteps: without("contact"), uploads: null })).toEqual([
      "Fill in: Contact",
    ]);
  });

  it.each([
    ["ru", ["Заполните: Автомобиль, Цена", "Ещё загружается фото: 1", "Не загрузилось фото: 2. Повторите или удалите."]],
    ["tk", ["Dolduryň: Awtomobil, Bahasy","Entek ýüklenýän surat: 1", "Ýüklenmedik surat: 2. Täzeden synanyşyň ýa-da aýryň."]],
  ])("is written in %s", (locale, lines) => {
    expect(
      publishBlockerLines(translator(locale), {
        validatedSteps: without("vehicle", "price"),
        uploads: { inflight: 1, failed: 2, total: 4 },
      }),
    ).toEqual(lines);
  });
});
