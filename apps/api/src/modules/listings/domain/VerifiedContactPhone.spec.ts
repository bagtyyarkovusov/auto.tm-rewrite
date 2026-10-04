import { describe, expect, it } from "vitest";

import { VerifiedContactPhone } from "./VerifiedContactPhone";

const confirmedAt = new Date("2026-10-03T10:00:00.000Z");
const sevenDaysLater = new Date("2026-10-10T10:00:00.000Z");

function confirmation(): VerifiedContactPhone {
  return VerifiedContactPhone.create({
    sellerId: "user-1",
    phone: "+99365123456",
    confirmedAt,
  });
}

describe("VerifiedContactPhone", () => {
  it("can be reused until 7 × 24 hours after confirmation, in UTC", () => {
    expect(confirmation().reusableUntil.toISOString()).toBe(sevenDaysLater.toISOString());
  });

  it("is reusable right after confirmation and one millisecond before the window ends", () => {
    expect(confirmation().isReusableAt(confirmedAt)).toBe(true);
    expect(
      confirmation().isReusableAt(new Date(sevenDaysLater.getTime() - 1)),
    ).toBe(true);
  });

  it("is not reusable at the exact end of the window or after it", () => {
    expect(confirmation().isReusableAt(sevenDaysLater)).toBe(false);
    expect(
      confirmation().isReusableAt(new Date(sevenDaysLater.getTime() + 1)),
    ).toBe(false);
  });

  it("counts 168 hours across a daylight-saving change, because it uses UTC instants", () => {
    // Europe switches clocks on 2026-10-25; the window is still 168 hours.
    const at = new Date("2026-10-22T00:30:00.000Z");
    const phone = VerifiedContactPhone.create({ sellerId: "s", phone: "+99365123456", confirmedAt: at });
    expect(phone.reusableUntil.getTime() - at.getTime()).toBe(168 * 60 * 60 * 1000);
  });
});
