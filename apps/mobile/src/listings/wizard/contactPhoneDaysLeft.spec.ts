import { describe, expect, it } from "vitest";

import { contactPhoneDaysLeft } from "./contactPhoneDaysLeft";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const inHours = (hours: number) =>
  new Date(NOW.getTime() + hours * 60 * 60 * 1000).toISOString();

describe("contactPhoneDaysLeft", () => {
  it("counts a full 7-day window as 7", () => {
    expect(contactPhoneDaysLeft(inHours(7 * 24), NOW)).toBe(7);
  });

  it("rounds a partial day up so the last day still counts", () => {
    expect(contactPhoneDaysLeft(inHours(6.2 * 24), NOW)).toBe(7);
    expect(contactPhoneDaysLeft(inHours(12), NOW)).toBe(1);
  });

  it("is 0 once the window has ended", () => {
    expect(contactPhoneDaysLeft(inHours(0), NOW)).toBe(0);
    expect(contactPhoneDaysLeft(inHours(-1), NOW)).toBe(0);
  });

  it("is 0 for a timestamp that does not parse", () => {
    expect(contactPhoneDaysLeft("not-a-date", NOW)).toBe(0);
  });
});
