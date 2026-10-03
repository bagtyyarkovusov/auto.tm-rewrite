import { beforeEach, describe, expect, it } from "vitest";

import { ListMyContactPhones } from "./ListMyContactPhones";
import { InMemoryContactPhones } from "./testing/InMemoryContactPhones";

const now = new Date("2026-10-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("ListMyContactPhones", () => {
  let phones: InMemoryContactPhones;
  let useCase: ListMyContactPhones;

  beforeEach(() => {
    phones = new InMemoryContactPhones();
    useCase = new ListMyContactPhones(phones, phones, { now: () => now });
  });

  it("lists the seller's reusable numbers, newest confirmation first", async () => {
    phones.confirm("user-1", "+99365000001", new Date(now.getTime() - 5 * DAY));
    phones.confirm("user-1", "+99365000002", new Date(now.getTime() - DAY));

    const { items } = await useCase.execute({ userId: "user-1" });

    expect(items.map((item) => item.phone)).toEqual(["+99365000002", "+99365000001"]);
    expect(items[0]).toEqual({
      phone: "+99365000002",
      source: "confirmed",
      confirmedAt: new Date(now.getTime() - DAY),
      reusableUntil: new Date(now.getTime() + 6 * DAY),
    });
  });

  it("leaves out expired numbers, other sellers' numbers and the sign-in phone", async () => {
    phones.confirm("user-1", "+99365000001", new Date(now.getTime() - 7 * DAY));
    phones.confirm("user-2", "+99365000002", now);
    // Confirmed earlier, then made the seller's sign-in phone.
    phones.confirm("user-1", "+99361234567", now);

    expect(await useCase.execute({ userId: "user-1" })).toEqual({ items: [] });
  });
});
