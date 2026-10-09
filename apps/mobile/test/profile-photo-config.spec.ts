import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { expo } = require("../app.config.js");
const copy = {
  en: {
    NSCameraUsageDescription: "Carberk uses your camera to take photos for vehicle listings and your profile photo.",
    NSPhotoLibraryUsageDescription: "Carberk accesses your photos so you can choose images for vehicle listings and your profile photo.",
  },
  ru: {
    NSCameraUsageDescription: "Carberk использует камеру для снимков в объявлениях об автомобилях и фото профиля.",
    NSPhotoLibraryUsageDescription: "Carberk получает доступ к вашим фото, чтобы вы могли выбирать снимки для объявлений об автомобилях и фото профиля.",
  },
  tk: {
    NSCameraUsageDescription: "Carberk ulag bildirişleri üçin we profil suratyňyzy düşürmek üçin kamerany ulanýar.",
    NSPhotoLibraryUsageDescription: "Carberk ulag bildirişleri we profil suraty üçin surat saýlamak maksady bilen suratlaryňyza girýär.",
  },
};

describe("Profile photo native permission purposes", () => {
  it("keeps English defaults and both config plugins consistent", () => {
    expect(expo.ios.infoPlist).toMatchObject(copy.en);
    const picker = expo.plugins.find((plugin: unknown[]) => Array.isArray(plugin) && plugin[0] === "expo-image-picker")[1];
    const camera = expo.plugins.find((plugin: unknown[]) => Array.isArray(plugin) && plugin[0] === "expo-camera")[1];
    expect(picker).toMatchObject({ cameraPermission: copy.en.NSCameraUsageDescription, photosPermission: copy.en.NSPhotoLibraryUsageDescription, microphonePermission: false });
    expect(camera).toMatchObject({ cameraPermission: copy.en.NSCameraUsageDescription, recordAudioAndroid: false });
  });
  it.each(["en", "ru", "tk"] as const)("provides the profile and vehicle purpose for %s system dialogs", (locale) => {
    expect(expo.locales?.[locale]?.ios).toEqual(copy[locale]);
  });
});
