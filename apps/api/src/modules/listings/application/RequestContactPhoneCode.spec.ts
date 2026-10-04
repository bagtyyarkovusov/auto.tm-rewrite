import { beforeEach, describe, expect, it } from "vitest";

import { RequestContactPhoneCode } from "./RequestContactPhoneCode";
import { FakeContactPhoneCodes } from "./testing/FakeContactPhoneCodes";
import { InMemoryContactPhones } from "./testing/InMemoryContactPhones";

const now = new Date("2026-10-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const input = { userId: "user-1", ip: "10.0.0.1", locale: "tk" as const };

describe("RequestContactPhoneCode", () => {
  let phones: InMemoryContactPhones;
  let codes: FakeContactPhoneCodes;
  let useCase: RequestContactPhoneCode;

  beforeEach(() => {
    phones = new InMemoryContactPhones();
    codes = new FakeContactPhoneCodes();
    useCase = new RequestContactPhoneCode(phones.policy, codes, { now: () => now });
  });

  it("answers confirmed for the seller's sign-in phone and sends nothing", async () => {
    const result = await useCase.execute({ ...input, phone: "+99361234567" });

    expect(result).toEqual({
      status: "confirmed",
      contactPhone: {
        phone: "+99361234567",
        source: "account",
        confirmedAt: null,
        reusableUntil: null,
      },
    });
    expect(codes.requests).toEqual([]);
  });

  it("answers confirmed for a number this seller confirmed in the last 7 days", async () => {
    const confirmedAt = new Date(now.getTime() - 3 * DAY);
    phones.confirm("user-1", "+99365123456", confirmedAt);

    const result = await useCase.execute({ ...input, phone: "+99365123456" });

    expect(result).toEqual({
      status: "confirmed",
      contactPhone: {
        phone: "+99365123456",
        source: "confirmed",
        confirmedAt,
        reusableUntil: new Date(confirmedAt.getTime() + 7 * DAY),
      },
    });
    expect(codes.requests).toEqual([]);
  });

  it("sends a code for a number nobody confirmed", async () => {
    codes.sent = { ...codes.sent, testCode: "123456" };

    const result = await useCase.execute({ ...input, phone: "+99365123456" });

    expect(result).toEqual({
      status: "code_sent",
      requestId: codes.sent.requestId,
      resendInSeconds: 60,
      testCode: "123456",
    });
    expect(codes.requests).toEqual([
      { userId: "user-1", phone: "+99365123456", ip: "10.0.0.1", locale: "tk" },
    ]);
  });

  it("sends a code once the 7 days have ended, or when only another seller confirmed it", async () => {
    phones.confirm("user-1", "+99365123456", new Date(now.getTime() - 7 * DAY));
    phones.confirm("user-2", "+99365999999", now);

    const expired = await useCase.execute({ ...input, phone: "+99365123456" });
    const foreign = await useCase.execute({ ...input, phone: "+99365999999" });

    expect(expired.status).toBe("code_sent");
    expect(foreign.status).toBe("code_sent");
    expect(codes.requests).toHaveLength(2);
  });
});
