import { describe, expect, it } from "vitest";

import { AccountDeletionController } from "./AccountDeletionController";
import { AuthController } from "./AuthController";
import { MeController } from "./MeController";

const EDGE_HOP = "100.64.0.9";
const CLIENT = "203.0.113.7";
const SPOOFED = "198.51.100.99";

type Seen = { ip?: string };

function recording(seen: Seen) {
  return {
    execute: async (input: { ip: string }) => {
      seen.ip = input.ip;
      return { requestId: "request-1", resendInSeconds: 60 };
    },
  };
}

function requestFrom(headers: Record<string, string>) {
  return { headers, ip: EDGE_HOP, user: { sub: "user-1" } } as never;
}

type Call = (seen: Seen, req: never) => Promise<unknown>;

const ENDPOINTS: Array<[string, Call]> = [
  [
    "POST /api/v1/auth/otp/request",
    (seen, req) =>
      new AuthController(
        recording(seen) as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ).otpRequest({ phone: "+99361234567" }, req),
  ],
  [
    "POST /api/v1/me/sign-in-methods/request",
    (seen, req) =>
      new MeController(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        recording(seen) as never,
        {} as never,
      ).requestMethodChange(req, { email: "buyer@example.com" }),
  ],
  [
    "POST /api/v1/account-deletion/request",
    (seen, req) =>
      new AccountDeletionController(
        recording(seen) as never,
        {} as never,
      ).request({ phone: "+99361234567" }, req),
  ],
];

describe.each(ENDPOINTS)("%s budgets by the trusted client IP", (_name, call) => {
  it("uses the address the edge put in X-Real-IP", async () => {
    const seen: Seen = {};

    await call(seen, requestFrom({ "x-real-ip": CLIENT }));

    expect(seen.ip).toBe(CLIENT);
  });

  it("does not let a client choose its budget through X-Forwarded-For", async () => {
    const seen: Seen = {};

    await call(
      seen,
      requestFrom({ "x-real-ip": CLIENT, "x-forwarded-for": SPOOFED }),
    );
    expect(seen.ip).toBe(CLIENT);

    await call(seen, requestFrom({ "x-forwarded-for": SPOOFED }));
    expect(seen.ip).toBe(EDGE_HOP);
  });
});
