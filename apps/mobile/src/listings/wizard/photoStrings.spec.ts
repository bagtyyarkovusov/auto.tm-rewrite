import { describe, expect, it } from "vitest";

import { resources } from "../../i18n/resources";

// The wording of issue #584, word for word, in every language.
const WORDING = {
  photosKeepUploading: {
    en: "You can continue. Photos keep uploading.",
    ru: "Можно продолжать. Фото загружаются в фоне.",
    tk: "Dowam edip bilersiňiz. Suratlar ýüklenmegini dowam edýär.",
  },
  photosGateUploading: {
    en: "Photos still uploading: {{count}}",
    ru: "Ещё загружается фото: {{count}}",
    tk: "Entek ýüklenýän surat: {{count}}",
  },
  photosGateFailed: {
    en: "Photos failed: {{count}}. Retry or remove them.",
    ru: "Не загрузилось фото: {{count}}. Повторите или удалите.",
    tk: "Ýüklenmedik surat: {{count}}. Täzeden synanyşyň ýa-da aýryň.",
  },
  setAsCover: { en: "Set as cover", ru: "На обложку", tk: "Kapak et" },
  moveEarlier: { en: "Move earlier", ru: "Переместить раньше", tk: "Öňe süýşür" },
  moveLater: { en: "Move later", ru: "Переместить дальше", tk: "Yza süýşür" },
  remove: { en: "Remove", ru: "Удалить", tk: "Aýyr" },
  retry: { en: "Retry", ru: "Повторить", tk: "Täzeden synanyş" },
} as const;

type Wording = Record<string, string>;

describe("Photos step wording", () => {
  for (const [key, byLocale] of Object.entries(WORDING)) {
    for (const [locale, text] of Object.entries(byLocale)) {
      it(`${key} reads as the issue gives it in ${locale}`, () => {
        const common = (resources as unknown as Record<string, { common: Wording }>)[locale]?.common;
        expect(common?.[key]).toBe(text);
      });
    }
  }
});
