/* global module, process */

const config = {
  expo: {
    name: "AutoTM",
    slug: "auto-tm",
    owner: "tkmdevelopers",
    scheme: "autotm",
    version: "0.1.0",
    icon: "./assets/images/icon.png",
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
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
      permissions: ["CAMERA"],
      // Photo selection goes through the system photo picker, which needs no media
      // permission on API 33+. Nothing records audio, and the overlay permission is
      // only for the dev-client red box (the debug manifest still adds it).
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "AutoTM accesses your photos so you can select vehicle images for listings.",
          microphonePermission: false,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow AutoTM to access your camera to take photos of your vehicle for listings.",
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 160,
          resizeMode: "contain",
          backgroundColor: "#FFFFFF",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "156dd00b-6192-4467-90ba-1469f7de50fb",
      },
    },
  },
};

module.exports = config;
