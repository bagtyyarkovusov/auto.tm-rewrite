import { beforeEach, describe, expect, it } from "vitest";

import { ConfirmContactPhone } from "./ConfirmContactPhone";
import { FakeContactPhoneCodes } from "./testing/FakeContactPhoneCodes";
import { InMemoryContactPhones } from "./testing/InMemoryContactPhones";

const DAY = 24 * 60 * 60 * 1000;

describe("ConfirmContactPhone", () => {
  let phones: InMemoryContactPhones;
  let codes: FakeContactPhoneCodes;
  let now: Date;
  let useCase: ConfirmContactPhone;

  beforeEach(() => {
    phones = new InMemoryContactPhones();
    codes = new FakeContactPhoneCodes();
    now = new Date("2026-10-10T12:00:00.000Z");
    useCase = new ConfirmContactPhone(codes, phones, { now: () => now });
  });

  it("checks the seller's code, records the number and answers it as confirmed for 7 days", async () => {
    const result = await useCase.execute({
      userId: "user-1",
      phone: "+99365123456",
      code: "123456",
    });

    expect(codes.confirmations).toEqual([
      { userId: "user-1", phone: "+99365123456", code: "123456" },
    ]);
    expect(result).toEqual({
      phone: "+99365123456",
      source: "confirmed",
      confirmedAt: now,
      reusableUntil: new Date(now.getTime() + 7 * DAY),
    });
    expect(await phones.find("user-1", "+99365123456")).toMatchObject({ confirmedAt: now });
  });

  it("restarts the 7 days when the seller confirms the number again", async () => {
    phones.confirm("user-1", "+99365123456", new Date(now.getTime() - 6 * DAY));

    await useCase.execute({ userId: "user-1", phone: "+99365123456", code: "123456" });

    expect((await phones.find("user-1", "+99365123456"))?.confirmedAt).toEqual(now);
    expect(phones.confirmations).toHaveLength(1);
  });

  it("lets two sellers confirm the same number separately", async () => {
    phones.confirm("user-2", "+99365123456", new Date(now.getTime() - DAY));

    await useCase.execute({ userId: "user-1", phone: "+99365123456", code: "123456" });

    expect(await phones.listBySeller("user-1")).toHaveLength(1);
    expect(await phones.listBySeller("user-2")).toHaveLength(1);
  });

  it("records nothing when identity refuses the code", async () => {
    codes.confirmError = new Error("Invalid OTP code");

    await expect(
      useCase.execute({ userId: "user-1", phone: "+99365123456", code: "000000" }),
    ).rejects.toThrow("Invalid OTP code");
    expect(phones.confirmations).toEqual([]);
  });
});
