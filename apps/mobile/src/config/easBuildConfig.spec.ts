import { createRequire } from "module";
import { readFileSync } from "fs";
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

  it("keeps environment URLs out of committed EAS profile env blocks", () => {
    const easJson = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf-8"));
    const profileEnv = Object.values(easJson.build).flatMap((profile) => Object.keys((profile as { env?: object }).env ?? {}));

    expect(profileEnv).not.toContain("EXPO_PUBLIC_API_URL");
    expect(profileEnv).not.toContain("EXPO_PUBLIC_WS_URL");
    expect(profileEnv).not.toContain("EXPO_PUBLIC_MEDIA_URL");
  });

  it("does not introduce EAS Update channels or OTA update URLs", () => {
    const easJsonSource = readFileSync(resolve(mobileRoot, "eas.json"), "utf-8");
    const appConfig = requireFreshAppConfig();

    expect(easJsonSource).not.toContain("\"channel\"");
    expect(easJsonSource).not.toContain("\"releaseChannel\"");
    expect(appConfig.expo.updates).toBeUndefined();
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
