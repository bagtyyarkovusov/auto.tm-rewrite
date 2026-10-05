import { describe, expect, it } from "vitest";

import { resolveContactPhoneSelection } from "./contactPhoneSelection";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const inDays = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const confirmedPhones = [
  {
    phone: "+99361000001",
    source: "confirmed" as const,
    confirmedAt: "2026-10-01T12:00:00.000Z",
    reusableUntil: inDays(3.4),
  },
];

describe("resolveContactPhoneSelection", () => {
  it("is none without a chosen number", () => {
    expect(
      resolveContactPhoneSelection({ phone: undefined, accountPhone: "+99365000000" }),
    ).toEqual({ kind: "none" });
  });

  it("is the account phone when it matches the sign-in phone", () => {
    expect(
      resolveContactPhoneSelection({
        phone: "+99365000000",
        accountPhone: "+99365000000",
      }),
    ).toEqual({ kind: "account" });
  });

  it("is confirmed with the days left for a reusable number", () => {
    expect(
      resolveContactPhoneSelection({
        phone: "+99361000001",
        accountPhone: "+99365000000",
        confirmedPhones,
        now: NOW,
      }),
    ).toEqual({ kind: "confirmed", daysLeft: 4 });
  });

  it("is current when it matches the Listing's own number in edit mode", () => {
    expect(
      resolveContactPhoneSelection({
        phone: "+99362000002",
        accountPhone: "+99365000000",
        currentListingPhone: "+99362000002",
        confirmedPhones,
        now: NOW,
      }),
    ).toEqual({ kind: "current" });
  });

  it("is stale for a saved number that is neither the account phone nor reusable", () => {
    expect(
      resolveContactPhoneSelection({
        phone: "+99362000002",
        accountPhone: "+99365000000",
        confirmedPhones,
        now: NOW,
      }),
    ).toEqual({ kind: "stale" });
  });

  it("is stale for an email-only User's saved number that is not reusable", () => {
    expect(
      resolveContactPhoneSelection({
        phone: "+99362000002",
        accountPhone: null,
        confirmedPhones: [],
        now: NOW,
      }),
    ).toEqual({ kind: "stale" });
  });
});
