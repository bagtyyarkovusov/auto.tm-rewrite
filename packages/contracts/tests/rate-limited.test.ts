import { describe, expect, it } from "vitest";

import * as contracts from "../src/index";

describe("RATE_LIMITED details", () => {
  it("exports the refusal reasons a client can branch on", () => {
    expect(contracts.RateLimitReason).toEqual({
      DestinationLimit: "destination_limit",
      IpLimit: "ip_limit",
      Backoff: "backoff",
    });
  });

  it("accepts each reason with its remaining wait", () => {
    for (const reason of ["destination_limit", "ip_limit", "backoff"]) {
      expect(
        contracts.RateLimitedDetailsSchema.safeParse({
          reason,
          retryInSeconds: 0,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects an unknown reason and a negative wait", () => {
    expect(
      contracts.RateLimitedDetailsSchema.safeParse({
        reason: "blocked",
        retryInSeconds: 0,
      }).success,
    ).toBe(false);
    expect(
      contracts.RateLimitedDetailsSchema.safeParse({
        reason: "backoff",
        retryInSeconds: -1,
      }).success,
    ).toBe(false);
  });

  it("keeps RATE_LIMITED as an error code a client already reads", () => {
    expect(contracts.ErrorCode.RateLimited).toBe("RATE_LIMITED");
  });
});
