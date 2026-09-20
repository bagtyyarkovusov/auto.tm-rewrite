import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const mobileRoot = resolve(__dirname, "../..");
const appConfigPath = resolve(mobileRoot, "app.config.js");

function requireFreshAppConfig() {
  Reflect.deleteProperty(require.cache, require.resolve(appConfigPath));
  return require(appConfigPath);
}

describe("EAS build configuration", () => {
  it("declares internal staging and production-smoke profiles plus store production", () => {
    const easJson = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf-8"));

    expect(easJson.build.staging.distribution).toBe("internal");
    expect(easJson.build["production-smoke"].distribution).toBe("internal");
    expect(easJson.build.production.distribution).toBe("store");
    expect(easJson.build.staging.extends).toBe("base");
    expect(easJson.build["production-smoke"].extends).toBe("base");
    expect(easJson.build.production.extends).toBe("base");
  });

  it("runs the URL gate as an eas-build-post-install hook, not as prebuildCommand", () => {
    const easJson = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf-8"));
    const mobilePackageJson = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf-8"));

    // EAS appends `--platform <platform>` to prebuildCommand, which `pnpm validate:eas-env`
    // rejects. eas-build-post-install runs after install and before prebuild instead.
    for (const profile of Object.values(easJson.build)) {
      expect((profile as { prebuildCommand?: string }).prebuildCommand).toBeUndefined();
    }
    // @auto-tm/contracts is a built package: nothing on the EAS builder runs the
    // local `predev` build, so the hook has to produce dist/ before Metro bundles.
    expect(mobilePackageJson.scripts["eas-build-post-install"]).toBe(
      "pnpm validate:eas-env && pnpm --filter @auto-tm/contracts build"
    );
  });

  it("pins a Node version the whole workspace can install on", () => {
    const easJson = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf-8"));
    const [major, minor] = easJson.build.base.node.split(".").map(Number);

    // EAS installs the entire pnpm workspace, so @auto-tm/db's Prisma 7 preinstall
    // gate (20.19+ / 22.12+ / 24.0+) applies to the mobile build too.
    expect(major).toBe(22);
    expect(minor).toBeGreaterThanOrEqual(12);
  });

  it("pins pnpm without corepack so the builder installs exactly one pnpm shim", () => {
    const easJson = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf-8"));
    const rootPackageJson = JSON.parse(readFileSync(resolve(mobileRoot, "../../package.json"), "utf-8"));

    // EAS runs `corepack enable` before honouring the `pnpm` pin. Corepack creates the
    // pnpm shim first, so the pin's `npm i -g pnpm@<version>` then fails with EEXIST.
    expect(easJson.build.base.corepack).toBeUndefined();
    expect(easJson.build.base.pnpm).toBe("9.12.0");
    expect(rootPackageJson.packageManager).toBe(`pnpm@${easJson.build.base.pnpm}`);
  });

  it("keeps environment URLs out of committed EAS profile env blocks", () => {
    const easJson = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf-8"));
    const profileEnv = Object.values(easJson.build).flatMap((profile) => Object.keys((profile as { env?: object }).env ?? {}));

    expect(profileEnv).not.toContain("EXPO_PUBLIC_API_URL");
    expect(profileEnv).not.toContain("EXPO_PUBLIC_WS_URL");
    expect(profileEnv).not.toContain("EXPO_PUBLIC_MEDIA_URL");
  });

  it("does not introduce EAS Update channels or OTA update URLs", () => {
    const easJsonSource = readFileSync(resolve(mobileRoot, "eas.json"), "utf-8");
    const packageJson = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf-8"));
    const appConfig = requireFreshAppConfig();

    expect(easJsonSource).not.toContain("\"channel\"");
    expect(easJsonSource).not.toContain("\"releaseChannel\"");
    expect(appConfig.expo.updates).toBeUndefined();
    // The config keys above can only carry an OTA URL while the runtime that
    // reads them is installed, so the absent dependency is the binding half.
    expect(Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })).not.toContain(
      "expo-updates",
    );
  });

  it("keeps Play-restricted media, audio, and overlay permissions out of the Android build", () => {
    const appConfig = requireFreshAppConfig();
    const { permissions, blockedPermissions } = appConfig.expo.android;
    const pluginOptions = (name: string) =>
      appConfig.expo.plugins.find((plugin: unknown) => Array.isArray(plugin) && plugin[0] === name)?.[1];

    // The system photo picker needs no media permission, so broad photo access
    // would need a Play declaration the app can't truthfully make.
    expect(permissions).toEqual(["CAMERA"]);
    expect(blockedPermissions).toEqual(
      expect.arrayContaining([
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ]),
    );
    expect(pluginOptions("expo-image-picker").microphonePermission).toBe(false);
    expect(pluginOptions("expo-camera").recordAudioAndroid).toBe(false);
  });

  it("points launcher and splash configuration at committed branding assets", () => {
    const appConfig = requireFreshAppConfig();
    const { icon, android, plugins } = appConfig.expo;
    const splashPlugin = plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
    ) as
      | [
          string,
          {
            image: string;
            imageWidth: number;
            resizeMode: string;
            backgroundColor: string;
          },
        ]
      | undefined;

    expect(icon).toBe("./assets/images/icon.png");
    expect(android.adaptiveIcon).toEqual({
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    });
    expect(splashPlugin?.[1]).toEqual({
      image: "./assets/images/splash-icon.png",
      imageWidth: 160,
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    });

    const configuredPaths = [
      icon,
      android.adaptiveIcon.foregroundImage,
      android.adaptiveIcon.backgroundImage,
      android.adaptiveIcon.monochromeImage,
      splashPlugin?.[1].image,
    ];

    for (const assetPath of configuredPaths) {
      expect(assetPath).toBeTypeOf("string");
      if (typeof assetPath !== "string") throw new TypeError("Missing branding asset path");
      expect(existsSync(resolve(mobileRoot, assetPath))).toBe(true);
    }
  });

  it("wires Firebase service files from EAS file-secret environment variables", () => {
    const previousAndroid = process.env.GOOGLE_SERVICES_JSON;
    const previousIos = process.env.GOOGLE_SERVICES_INFO_PLIST;

    process.env.GOOGLE_SERVICES_JSON = "/tmp/eas/google-services.json";
    process.env.GOOGLE_SERVICES_INFO_PLIST = "/tmp/eas/GoogleService-Info.plist";
    const appConfig = requireFreshAppConfig();

    expect(appConfig.expo.android.googleServicesFile).toBe("/tmp/eas/google-services.json");
    expect(appConfig.expo.ios.googleServicesFile).toBe("/tmp/eas/GoogleService-Info.plist");

    if (previousAndroid === undefined) {
      Reflect.deleteProperty(process.env, "GOOGLE_SERVICES_JSON");
    } else {
      process.env.GOOGLE_SERVICES_JSON = previousAndroid;
    }

    if (previousIos === undefined) {
      Reflect.deleteProperty(process.env, "GOOGLE_SERVICES_INFO_PLIST");
    } else {
      process.env.GOOGLE_SERVICES_INFO_PLIST = previousIos;
    }
    requireFreshAppConfig();
  });
});
