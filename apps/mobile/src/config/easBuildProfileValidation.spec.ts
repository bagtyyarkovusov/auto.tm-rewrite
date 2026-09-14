import { describe, expect, it } from "vitest";

import { validateCurrentEasBuildProfile, validateEasBuildProfile } from "./easBuildProfileValidation";

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

  it("allows production AutoTM-owned HTTPS/WSS hosts", () => {
    expect(
      validateEasBuildProfile({
        profile: "production",
        apiUrl: "https://api.auto.tm/api/v1",
        wsUrl: "wss://api.auto.tm/ws/chat",
        mediaUrl: "https://media.auto.tm",
      }),
    ).toEqual([]);
  });

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
