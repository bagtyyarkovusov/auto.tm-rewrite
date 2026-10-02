import { describe, expect, it } from "vitest";

import {
  readClientIpPolicy,
  resolveClientIp,
  type ClientIpPolicy,
} from "./client-ip";

const EDGE_HOP = "100.64.0.9";
const CLIENT = "203.0.113.7";
const SPOOFED = "198.51.100.99";

function request(
  headers: Record<string, string | string[] | undefined>,
  ip: string | undefined = EDGE_HOP,
) {
  return { headers, ip };
}

describe("resolveClientIp with the default policy (trust X-Real-IP)", () => {
  const policy = readClientIpPolicy({});

  it("keys on the address the edge put in X-Real-IP, not on the proxy hop", () => {
    expect(resolveClientIp(request({ "x-real-ip": CLIENT }), policy)).toBe(CLIENT);
  });

  it("ignores a client-supplied X-Forwarded-For, whatever the edge sent", () => {
    expect(
      resolveClientIp(
        request({ "x-real-ip": CLIENT, "x-forwarded-for": SPOOFED }),
        policy,
      ),
    ).toBe(CLIENT);
    expect(
      resolveClientIp(request({ "x-forwarded-for": SPOOFED }), policy),
    ).toBe(EDGE_HOP);
  });

  it("falls back to the peer address when the header is missing", () => {
    expect(resolveClientIp(request({}), policy)).toBe(EDGE_HOP);
  });

  it("falls back to the peer address when the header is not a single IP address", () => {
    for (const value of [
      "not-an-ip",
      "",
      `${SPOOFED}, ${CLIENT}`,
      `${CLIENT}:443`,
      "999.1.1.1",
    ]) {
      expect(resolveClientIp(request({ "x-real-ip": value }), policy)).toBe(EDGE_HOP);
    }
    expect(
      resolveClientIp(request({ "x-real-ip": [SPOOFED, CLIENT] }), policy),
    ).toBe(EDGE_HOP);
  });

  it("trims whitespace and accepts IPv6 addresses", () => {
    expect(resolveClientIp(request({ "x-real-ip": `  ${CLIENT} ` }), policy)).toBe(CLIENT);
    expect(
      resolveClientIp(request({ "x-real-ip": "2001:db8::1" }), policy),
    ).toBe("2001:db8::1");
  });

  it("reports an IPv4-mapped IPv6 address as the IPv4 address", () => {
    expect(
      resolveClientIp(request({ "x-real-ip": `::ffff:${CLIENT}` }), policy),
    ).toBe(CLIENT);
    expect(resolveClientIp(request({}, `::ffff:${EDGE_HOP}`), policy)).toBe(EDGE_HOP);
  });

  it("still answers when the request carries no address at all", () => {
    expect(resolveClientIp({ headers: {} }, policy)).toBe("unknown");
    expect(resolveClientIp({} as never, policy)).toBe("unknown");
  });
});

describe("resolveClientIp with another trusted header or hop", () => {
  it("takes the Nth entry from the right of X-Forwarded-For", () => {
    const oneHop: ClientIpPolicy = { header: "x-forwarded-for", trustedHops: 1 };
    const twoHops: ClientIpPolicy = { header: "x-forwarded-for", trustedHops: 2 };
    const forwarded = `${SPOOFED}, ${CLIENT}, 10.0.0.2`;

    expect(resolveClientIp(request({ "x-forwarded-for": forwarded }), oneHop)).toBe("10.0.0.2");
    expect(resolveClientIp(request({ "x-forwarded-for": forwarded }), twoHops)).toBe(CLIENT);
  });

  it("does not let a client rotate the leftmost X-Forwarded-For entry", () => {
    const policy: ClientIpPolicy = { header: "x-forwarded-for", trustedHops: 1 };

    const first = resolveClientIp(
      request({ "x-forwarded-for": `1.1.1.1, ${CLIENT}` }),
      policy,
    );
    const second = resolveClientIp(
      request({ "x-forwarded-for": `2.2.2.2, ${CLIENT}` }),
      policy,
    );

    expect(first).toBe(CLIENT);
    expect(second).toBe(CLIENT);
  });

  it("joins repeated X-Forwarded-For header lines before counting", () => {
    const policy: ClientIpPolicy = { header: "x-forwarded-for", trustedHops: 1 };

    expect(
      resolveClientIp(request({ "x-forwarded-for": [SPOOFED, CLIENT] }), policy),
    ).toBe(CLIENT);
  });

  it("falls back to the peer when X-Forwarded-For has fewer entries than trusted hops", () => {
    const policy: ClientIpPolicy = { header: "x-forwarded-for", trustedHops: 2 };

    expect(resolveClientIp(request({ "x-forwarded-for": CLIENT }), policy)).toBe(EDGE_HOP);
  });

  it("falls back to the peer when the selected X-Forwarded-For entry is not an IP", () => {
    const policy: ClientIpPolicy = { header: "x-forwarded-for", trustedHops: 1 };

    expect(
      resolveClientIp(request({ "x-forwarded-for": `${CLIENT}, garbage` }), policy),
    ).toBe(EDGE_HOP);
  });

  it("reads any other configured single-address header", () => {
    const policy: ClientIpPolicy = { header: "cf-connecting-ip", trustedHops: 1 };

    expect(
      resolveClientIp(
        request({ "cf-connecting-ip": CLIENT, "x-real-ip": SPOOFED }),
        policy,
      ),
    ).toBe(CLIENT);
  });

  it("trusts no header when the policy names none", () => {
    const policy: ClientIpPolicy = { header: null, trustedHops: 1 };

    expect(
      resolveClientIp(
        request({ "x-real-ip": SPOOFED, "x-forwarded-for": SPOOFED }),
        policy,
      ),
    ).toBe(EDGE_HOP);
  });
});

describe("readClientIpPolicy", () => {
  it("defaults to X-Real-IP with one trusted hop", () => {
    expect(readClientIpPolicy({})).toEqual({ header: "x-real-ip", trustedHops: 1 });
  });

  it("reads the header name and hop count from the environment", () => {
    expect(
      readClientIpPolicy({
        CLIENT_IP_HEADER: " X-Forwarded-For ",
        CLIENT_IP_TRUSTED_HOPS: "2",
      }),
    ).toEqual({ header: "x-forwarded-for", trustedHops: 2 });
  });

  it("turns header trust off with none", () => {
    expect(readClientIpPolicy({ CLIENT_IP_HEADER: "none" }).header).toBeNull();
    expect(readClientIpPolicy({ CLIENT_IP_HEADER: "NONE" }).header).toBeNull();
  });

  it("reads process.env when no environment is passed", () => {
    const before = process.env["CLIENT_IP_HEADER"];
    process.env["CLIENT_IP_HEADER"] = "none";
    try {
      expect(readClientIpPolicy().header).toBeNull();
    } finally {
      if (before === undefined) delete process.env["CLIENT_IP_HEADER"];
      else process.env["CLIENT_IP_HEADER"] = before;
    }
  });
});
