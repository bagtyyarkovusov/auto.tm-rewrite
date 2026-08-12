/* global module, process */

const config = {
  expo: {
    name: "AutoTM",
    slug: "auto-tm",
    scheme: "autotm",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    platforms: ["ios", "android"],
    ios: {
      bundleIdentifier: "tm.auto.app",
      supportsTablet: false,
      ...(process.env.GOOGLE_SERVICES_INFO_PLIST
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST }
        : {}),
      infoPlist: {
        NSCameraUsageDescription: "AutoTM uses your camera to take photos of your vehicle for listings.",
        NSPhotoLibraryUsageDescription: "AutoTM accesses your photos so you can select vehicle images for listings.",
      },
    },
    android: {
      package: "tm.auto.app",
      edgeToEdgeEnabled: true,
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
      permissions: ["CAMERA", "READ_EXTERNAL_STORAGE", "READ_MEDIA_IMAGES"],
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "AutoTM accesses your photos so you can select vehicle images for listings.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow AutoTM to access your camera to take photos of your vehicle for listings.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};

module.exports = config;
