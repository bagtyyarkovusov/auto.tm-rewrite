import { describe, expect, it } from "vitest";

import { readVisitorIpPolicy, visitorIp } from "./visitor-ip";

const CLIENT = "203.0.113.7";
const SPOOFED = "198.51.100.1";

const from = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe("visitorIp with the default policy (trust X-Real-IP)", () => {
  const policy = readVisitorIpPolicy({});

  it("reads the X-Real-IP that Railway's edge sets, not a visitor-supplied X-Forwarded-For", () => {
    expect(visitorIp(from({ "x-real-ip": CLIENT, "x-forwarded-for": SPOOFED }), policy)).toBe(
      CLIENT,
    );
  });

  it("never falls back to X-Forwarded-For, which a visitor writes", () => {
    expect(visitorIp(from({ "x-forwarded-for": `${SPOOFED}, 10.0.0.1` }), policy)).toBeNull();
    expect(visitorIp(from({}), policy)).toBeNull();
  });

  it("refuses a value that is not one IP address", () => {
    for (const value of ["", "not-an-ip", `${CLIENT}, ${SPOOFED}`, `${CLIENT}:443`, "fe80::1%eth0"]) {
      expect(visitorIp(from({ "x-real-ip": value }), policy)).toBeNull();
    }
    expect(visitorIp(from({ "x-real-ip": ` ${CLIENT} ` }), policy)).toBe(CLIENT);
  });
});

describe("visitorIp with X-Forwarded-For and trusted hops", () => {
  it("takes the entry that many places from the right, never a visitor-written one", () => {
    const policy = readVisitorIpPolicy({
      CLIENT_IP_HEADER: "x-forwarded-for",
      CLIENT_IP_TRUSTED_HOPS: "2",
    });

    expect(
      visitorIp(from({ "x-forwarded-for": `${SPOOFED}, ${CLIENT}, 10.0.0.1` }), policy),
    ).toBe(CLIENT);
    expect(visitorIp(from({ "x-forwarded-for": "10.0.0.1" }), policy)).toBeNull();
  });
});

describe("readVisitorIpPolicy", () => {
  it("defaults to X-Real-IP in and out with one trusted hop", () => {
    expect(readVisitorIpPolicy({})).toEqual({
      header: "x-real-ip",
      trustedHops: 1,
      apiHeader: "x-real-ip",
    });
  });

  it("reads the incoming rule and the header the API trusts", () => {
    expect(
      readVisitorIpPolicy({
        CLIENT_IP_HEADER: " X-Forwarded-For ",
        CLIENT_IP_TRUSTED_HOPS: "2",
        API_CLIENT_IP_HEADER: "X-Client-IP",
      }),
    ).toEqual({ header: "x-forwarded-for", trustedHops: 2, apiHeader: "x-client-ip" });
  });

  it("turns header trust off with none", () => {
    expect(readVisitorIpPolicy({ CLIENT_IP_HEADER: "none" }).header).toBeNull();
  });

  it("trusts no header when the configuration is invalid", () => {
    for (const env of [
      { CLIENT_IP_HEADER: "x real ip" },
      { CLIENT_IP_TRUSTED_HOPS: "0" },
      { CLIENT_IP_TRUSTED_HOPS: "11" },
      { CLIENT_IP_TRUSTED_HOPS: "1.5" },
      { API_CLIENT_IP_HEADER: "" },
      { API_CLIENT_IP_HEADER: "none" },
    ]) {
      expect(readVisitorIpPolicy(env).header).toBeNull();
    }
  });
});
