import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  validateAndroidApplicationId,
  validateCurrentEasBuildProfile,
  validateEasBuildProfile,
} from "./easBuildProfileValidation";

describe("validateEasBuildProfile", () => {
  it("allows development without remote build URLs", () => {
    expect(validateEasBuildProfile({ profile: "development", apiUrl: undefined, wsUrl: undefined, mediaUrl: undefined })).toEqual([]);
  });

  it("allows staging Railway HTTPS/WSS hosts", () => {
    expect(
      validateEasBuildProfile({
        profile: "staging",
        apiUrl: "https://autotm-api-staging.up.railway.app/api/v1",
        wsUrl: "wss://autotm-api-staging.up.railway.app/ws/chat",
        mediaUrl: "https://autotm-media-staging.up.railway.app",
      }),
    ).toEqual([]);
  });

  it("rejects non-Railway hosts for internal smoke profiles", () => {
    expect(
      validateEasBuildProfile({
        profile: "production-smoke",
        apiUrl: "https://api.auto.tm/api/v1",
        wsUrl: "wss://api.auto.tm/ws/chat",
        mediaUrl: "https://media.auto.tm",
      }),
    ).toContain("EXPO_PUBLIC_API_URL must use a Railway-generated *.up.railway.app host");
  });

  it("allows production Carberk-owned HTTPS/WSS hosts", () => {
    expect(
      validateEasBuildProfile({
        profile: "production",
        apiUrl: "https://api.auto.tm/api/v1",
        wsUrl: "wss://api.auto.tm/ws/chat",
        mediaUrl: "https://media.auto.tm",
      }),
    ).toEqual([]);
  });

  it("allows the production hosts under autotm.bagtyyar.dev, the domain Carberk runs on today", () => {
    expect(
      validateEasBuildProfile({
        profile: "production",
        apiUrl: "https://api.autotm.bagtyyar.dev/api/v1",
        wsUrl: "wss://api.autotm.bagtyyar.dev/ws/chat",
        mediaUrl: "https://media.autotm.bagtyyar.dev",
      }),
    ).toEqual([]);
  });

  it.each([
    "https://bagtyyar.dev/api/v1",
    "https://api.bagtyyar.dev/api/v1",
    "https://autotm.bagtyyar.dev.evil.example/api/v1",
    "https://notautotm.bagtyyar.dev/api/v1",
    "https://api.autotm.bagtyyar.dev.evil.example/api/v1",
  ])("rejects %s for production: only Carberk's own domains count", (apiUrl) => {
    expect(
      validateEasBuildProfile({
        profile: "production",
        apiUrl,
        wsUrl: "wss://api.autotm.bagtyyar.dev/ws/chat",
        mediaUrl: "https://media.autotm.bagtyyar.dev",
      }),
    ).toEqual(["EXPO_PUBLIC_API_URL must use a Carberk domain (autotm.bagtyyar.dev or auto.tm) in production"]);
  });

  it("rejects a foreign websocket or media host for production, not only a foreign API host", () => {
    expect(
      validateEasBuildProfile({
        profile: "production",
        apiUrl: "https://api.autotm.bagtyyar.dev/api/v1",
        wsUrl: "wss://api.bagtyyar.dev/ws/chat",
        mediaUrl: "https://media.autotm.bagtyyar.dev.evil.example",
      }),
    ).toEqual([
      "EXPO_PUBLIC_WS_URL must use a Carberk domain (autotm.bagtyyar.dev or auto.tm) in production",
      "EXPO_PUBLIC_MEDIA_URL must use a Carberk domain (autotm.bagtyyar.dev or auto.tm) in production",
    ]);
  });

  it.each([
    "https://user:password@api.autotm.bagtyyar.dev/api/v1",
    "https://user@api.autotm.bagtyyar.dev/api/v1",
    "https://api.autotm.bagtyyar.dev:8443/api/v1",
  ])("rejects credentials or a custom port in a production URL without echoing it (%s)", (apiUrl) => {
    const errors = validateEasBuildProfile({
      profile: "production",
      apiUrl,
      wsUrl: "wss://api.autotm.bagtyyar.dev/ws/chat",
      mediaUrl: "https://media.autotm.bagtyyar.dev",
    });
    expect(errors).toEqual(["EXPO_PUBLIC_API_URL must not carry credentials or a custom port in production"]);
  });

  it.each([
    ["wss://user:password@api.autotm.bagtyyar.dev/ws/chat", "https://media.autotm.bagtyyar.dev"],
    ["wss://user@api.autotm.bagtyyar.dev/ws/chat", "https://media.autotm.bagtyyar.dev"],
    ["wss://api.autotm.bagtyyar.dev/ws/chat", "https://user:password@media.autotm.bagtyyar.dev"],
  ])(
    "rejects credentials on the production websocket or media URL, not only on the API URL",
    (wsUrl, mediaUrl) => {
      const errors = validateEasBuildProfile({
        profile: "production",
        apiUrl: "https://api.autotm.bagtyyar.dev/api/v1",
        wsUrl,
        mediaUrl,
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/must not carry credentials or a custom port in production$/);
    },
  );

  it("rejects Railway hosts for production", () => {
    expect(
      validateEasBuildProfile({
        profile: "production",
        apiUrl: "https://autotm-api-production.up.railway.app/api/v1",
        wsUrl: "wss://autotm-api-production.up.railway.app/ws/chat",
        mediaUrl: "https://autotm-media-production.up.railway.app",
      }),
    ).toEqual([
      "EXPO_PUBLIC_API_URL must not use localhost, IP literals, or Railway-generated hosts in production",
      "EXPO_PUBLIC_WS_URL must not use localhost, IP literals, or Railway-generated hosts in production",
      "EXPO_PUBLIC_MEDIA_URL must not use localhost, IP literals, or Railway-generated hosts in production",
    ]);
  });

  it("rejects localhost, IP literals, and insecure protocols for production", () => {
    const errors = validateEasBuildProfile({
      profile: "production",
      apiUrl: "http://localhost:3006/api/v1",
      wsUrl: "ws://127.0.0.1:3006/ws/chat",
      mediaUrl: "http://192.168.1.20:9000",
    });

    expect(errors).toContain("EXPO_PUBLIC_API_URL must use https:");
    expect(errors).toContain("EXPO_PUBLIC_WS_URL must use wss:");
    expect(errors).toContain("EXPO_PUBLIC_MEDIA_URL must use https:");
    expect(errors).toContain("EXPO_PUBLIC_API_URL must not use localhost, IP literals, or Railway-generated hosts in production");
    expect(errors).toContain("EXPO_PUBLIC_WS_URL must not use localhost, IP literals, or Railway-generated hosts in production");
    expect(errors).toContain("EXPO_PUBLIC_MEDIA_URL must not use localhost, IP literals, or Railway-generated hosts in production");
  });

  it("rejects missing required remote URLs", () => {
    expect(validateEasBuildProfile({ profile: "staging", apiUrl: undefined, wsUrl: undefined, mediaUrl: undefined })).toEqual([
      "EXPO_PUBLIC_API_URL is required",
      "EXPO_PUBLIC_WS_URL is required",
      "EXPO_PUBLIC_MEDIA_URL is required",
    ]);
  });
});


describe("production-smoke environment isolation", () => {
  const productionEnv = {
    EAS_BUILD_PROFILE: "production-smoke",
    EXPO_PUBLIC_API_URL: "https://api-production-example.up.railway.app/api/v1",
    EXPO_PUBLIC_WS_URL: "wss://api-production-example.up.railway.app/ws/chat",
    EXPO_PUBLIC_MEDIA_URL: "https://media-production-example.up.railway.app",
    PRODUCTION_SMOKE_API_HOST: "api-production-example.up.railway.app",
    PRODUCTION_SMOKE_WS_HOST: "api-production-example.up.railway.app",
    PRODUCTION_SMOKE_MEDIA_HOST: "media-production-example.up.railway.app",
  };

  it("accepts independently approved production API, websocket and media hosts", () => {
    expect(validateCurrentEasBuildProfile(productionEnv)).toEqual([]);
  });

  it.each(["API", "WS", "MEDIA"])("rejects a staging %s host even when the other URLs are production", (service) => {
    const name = `EXPO_PUBLIC_${service}_URL`;
    const protocol = service === "WS" ? "wss" : "https";
    const errors = validateCurrentEasBuildProfile({
      ...productionEnv,
      [name]: `${protocol}://api-staging-example.up.railway.app`,
    });
    expect(errors).toEqual([`${name} must match its approved production-smoke host without credentials or a custom port`]);
  });

  it.each(["API", "WS", "MEDIA"])("requires independent approval for the %s host", (service) => {
    expect(validateCurrentEasBuildProfile({
      ...productionEnv,
      [`PRODUCTION_SMOKE_${service}_HOST`]: undefined,
    })).toHaveLength(1);
  });

  it.each([
    "api-staging-example.up.railway.app",
    "https://api-production-example.up.railway.app",
    "api-production-example.up.railway.app.evil.example",
    "api-production-example.up.railway.app:443",
  ])("rejects an invalid or staging approval host %s", (host) => {
    expect(validateCurrentEasBuildProfile({ ...productionEnv, PRODUCTION_SMOKE_API_HOST: host })).not.toEqual([]);
  });

  it.each([
    "https://different-environment.up.railway.app/api/v1",
    "https://user:password@api-production-example.up.railway.app/api/v1",
    "https://api-production-example.up.railway.app:8443/api/v1",
    "https://api-production-example.up.railway.app.evil.example/api/v1",
  ])("rejects an unapproved origin %s without echoing its value", (url) => {
    const errors = validateCurrentEasBuildProfile({ ...productionEnv, EXPO_PUBLIC_API_URL: url });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).not.toContain(url);
    expect(errors.join(" ")).not.toContain("user:password");
  });
});

describe("validateAndroidApplicationId", () => {
  it("accepts the existing Play app's package on the production profile", () => {
    expect(validateAndroidApplicationId("production", "com.auto_tm.ynamly")).toEqual([]);
  });

  it.each([undefined, "", "tm.auto.app"])("rejects %s as the production package", (value) => {
    expect(validateAndroidApplicationId("production", value)).toEqual([
      "ANDROID_APPLICATION_ID must be com.auto_tm.ynamly for the production profile",
    ]);
  });

  it.each(["staging", "production-smoke", "development"])(
    "rejects a package override on the %s profile, which must stay tm.auto.app",
    (profile) => {
      expect(validateAndroidApplicationId(profile, "com.auto_tm.ynamly")).toEqual([
        `ANDROID_APPLICATION_ID must not be set for the ${profile} profile`,
      ]);
      expect(validateAndroidApplicationId(profile, undefined)).toEqual([]);
    },
  );

  it("fails a production build whose environment lost the package", () => {
    const errors = validateCurrentEasBuildProfile({
      EAS_BUILD_PROFILE: "production",
      EXPO_PUBLIC_API_URL: "https://api.auto.tm/api/v1",
      EXPO_PUBLIC_WS_URL: "wss://api.auto.tm/ws/chat",
      EXPO_PUBLIC_MEDIA_URL: "https://media.auto.tm",
    });
    expect(errors).toEqual(["ANDROID_APPLICATION_ID must be com.auto_tm.ynamly for the production profile"]);
  });
});

describe("the real eas.json profiles", () => {
  type EasProfile = { extends?: string; env?: Record<string, string> };
  const easJson = JSON.parse(
    readFileSync(resolve(__dirname, "../../eas.json"), "utf8"),
  ) as { build: Record<string, EasProfile> };

  /** The env EAS composes for a profile: its own over the one it extends. */
  function profileEnv(name: string): Record<string, string> {
    const profile = easJson.build[name];
    if (!profile) throw new Error(`eas.json has no ${name} profile`);
    const base = profile.extends ? profileEnv(profile.extends) : {};
    return { ...base, ...profile.env, EAS_BUILD_PROFILE: name };
  }

  it("keeps the store package only on the production profile", () => {
    for (const name of Object.keys(easJson.build)) {
      if (name === "base") continue;
      const env = profileEnv(name);
      if (name === "production") {
        expect(env["ANDROID_APPLICATION_ID"]).toBe("com.auto_tm.ynamly");
      } else {
        expect(env["ANDROID_APPLICATION_ID"]).toBeUndefined();
      }
      expect(validateAndroidApplicationId(name, env["ANDROID_APPLICATION_ID"])).toEqual([]);
    }
  });

  it("lets every eas.json profile through the validator with a legitimate environment", () => {
    const envByProfile: Record<string, Record<string, string>> = {
      development: {},
      staging: {
        EXPO_PUBLIC_API_URL: "https://autotm-api-staging.up.railway.app/api/v1",
        EXPO_PUBLIC_WS_URL: "wss://autotm-api-staging.up.railway.app/ws/chat",
        EXPO_PUBLIC_MEDIA_URL: "https://autotm-media-staging.up.railway.app",
      },
      "production-smoke": {
        EXPO_PUBLIC_API_URL: "https://autotm-api-production.up.railway.app/api/v1",
        EXPO_PUBLIC_WS_URL: "wss://autotm-api-production.up.railway.app/ws/chat",
        EXPO_PUBLIC_MEDIA_URL: "https://autotm-media-production.up.railway.app",
        PRODUCTION_SMOKE_API_HOST: "autotm-api-production.up.railway.app",
        PRODUCTION_SMOKE_WS_HOST: "autotm-api-production.up.railway.app",
        PRODUCTION_SMOKE_MEDIA_HOST: "autotm-media-production.up.railway.app",
      },
      production: {
        EXPO_PUBLIC_API_URL: "https://api.autotm.bagtyyar.dev/api/v1",
        EXPO_PUBLIC_WS_URL: "wss://api.autotm.bagtyyar.dev/ws/chat",
        EXPO_PUBLIC_MEDIA_URL: "https://media.autotm.bagtyyar.dev",
      },
    };

    for (const name of Object.keys(easJson.build)) {
      if (name === "base") continue;
      const extra = envByProfile[name];
      if (!extra) throw new Error(`add a legitimate test environment for the ${name} profile`);
      expect(validateCurrentEasBuildProfile({ ...profileEnv(name), ...extra })).toEqual([]);
    }
  });
});
