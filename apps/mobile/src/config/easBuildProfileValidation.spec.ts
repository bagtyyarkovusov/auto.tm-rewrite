import { describe, expect, it } from "vitest";

import { validateEasBuildProfile } from "./easBuildProfileValidation";

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
