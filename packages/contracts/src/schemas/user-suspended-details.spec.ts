import { describe, expect, it } from "vitest";

import { AdminErrorReason, UserSuspendedDetailsSchema } from "./admin";

describe("User suspension refusal details", () => {
  it("accepts the shared reason with optional server metadata", () => {
    expect(UserSuspendedDetailsSchema.parse({ reason: AdminErrorReason.UserSuspended, requestId: "extra" })).toEqual({ reason: "USER_SUSPENDED" });
  });
  it.each([null, "USER_SUSPENDED", [], {}, { reason: 403 }, { reason: "OTHER" }])("rejects malformed details %j", (details) => {
    expect(UserSuspendedDetailsSchema.safeParse(details).success).toBe(false);
  });
});
