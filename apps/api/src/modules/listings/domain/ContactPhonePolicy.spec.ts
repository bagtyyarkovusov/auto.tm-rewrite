import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryContactPhones } from "../application/testing/InMemoryContactPhones";

const now = new Date("2026-10-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("ContactPhonePolicy", () => {
  let phones: InMemoryContactPhones;

  beforeEach(() => {
    phones = new InMemoryContactPhones();
  });

  it("accepts the seller's own sign-in phone without a code", async () => {
    expect(await phones.policy.standing("user-1", "+99361234567", now)).toEqual({
      kind: "account",
    });
  });

  it("accepts a number the seller confirmed less than 7 days ago", async () => {
    phones.confirm("user-1", "+99365123456", new Date(now.getTime() - 6 * DAY));

    const standing = await phones.policy.standing("user-1", "+99365123456", now);

    expect(standing.kind).toBe("confirmed");
    expect(standing.kind === "confirmed" && standing.confirmation.phone).toBe("+99365123456");
  });

  it("reports an expired confirmation once its 7 days have ended", async () => {
    phones.confirm("user-1", "+99365123456", new Date(now.getTime() - 7 * DAY));

    expect(await phones.policy.standing("user-1", "+99365123456", now)).toEqual({
      kind: "expired",
    });
  });

  it("reports a number nobody confirmed, or that another seller confirmed, as not confirmed", async () => {
    phones.confirm("user-2", "+99365123456", now);

    expect(await phones.policy.standing("user-1", "+99365123456", now)).toEqual({
      kind: "not_confirmed",
    });
  });

  it("does not treat another User's sign-in phone as the seller's", async () => {
    phones.signInPhones.set("user-2", "+99365123456");

    expect(await phones.policy.standing("user-1", "+99365123456", now)).toEqual({
      kind: "not_confirmed",
    });
  });

  it.each([undefined, null, "", "   "])("reports %j as missing", async (phone) => {
    expect(await phones.policy.standing("user-1", phone, now)).toEqual({ kind: "missing" });
  });
});
