import { beforeEach, describe, expect, it } from "vitest";

import { InvalidDisplayNameError } from "../domain/DisplayName";
import { InMemoryIdentityCheck } from "./testing/InMemoryIdentityCheck";
import { InMemoryUsers } from "./testing/InMemoryUsers";
import { UpdateDisplayName, UserSuspendedError } from "./UpdateDisplayName";

describe("UpdateDisplayName", () => {
  let users: InMemoryUsers;
  let identityCheck: InMemoryIdentityCheck;
  let useCase: UpdateDisplayName;

  beforeEach(() => {
    users = new InMemoryUsers();
    identityCheck = new InMemoryIdentityCheck();
    useCase = new UpdateDisplayName(users, identityCheck);
    users.seed({ id: "user-1", phone: "+99365180518", nameNumber: 4821, avatarIndex: 7 });
    users.seed({ id: "user-2", phone: "+99365180519", nameNumber: 1000, avatarIndex: 0 });
  });

  it("stores the normalized name for the signed-in User", async () => {
    await useCase.execute({ userId: "user-1", displayName: "  Aman   Durdy " });

    expect((await users.findById("user-1"))?.displayName).toBe("Aman Durdy");
  });

  it("lets two Users hold the same name", async () => {
    await useCase.execute({ userId: "user-1", displayName: "Aman" });
    await useCase.execute({ userId: "user-2", displayName: "Aman" });

    expect((await users.findById("user-1"))?.displayName).toBe("Aman");
    expect((await users.findById("user-2"))?.displayName).toBe("Aman");
  });

  it("leaves the name number, avatar index, photo key and Sign-in Methods as they were", async () => {
    await useCase.execute({ userId: "user-1", displayName: "Aman" });

    expect(await users.findById("user-1")).toMatchObject({
      nameNumber: 4821,
      avatarIndex: 7,
      avatarKey: null,
      phone: "+99365180518",
      phoneVerifiedAt: new Date("2026-05-01T00:00:00Z"),
      email: null,
      emailVerifiedAt: null,
    });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["A", "too_short"],
    ["a".repeat(31), "too_long"],
  ])("refuses %j as %s and keeps the stored name", async (raw, reason) => {
    await useCase.execute({ userId: "user-1", displayName: "Aman" });

    const attempt = useCase.execute({ userId: "user-1", displayName: raw });

    await expect(attempt).rejects.toBeInstanceOf(InvalidDisplayNameError);
    await expect(attempt).rejects.toMatchObject({ reason });
    expect((await users.findById("user-1"))?.displayName).toBe("Aman");
  });

  it("refuses a suspended User and stores nothing", async () => {
    identityCheck.suspend("user-1");

    await expect(
      useCase.execute({ userId: "user-1", displayName: "Aman" }),
    ).rejects.toBeInstanceOf(UserSuspendedError);
    expect((await users.findById("user-1"))?.displayName).toBeNull();
  });

  it("answers 'User not found' for a User that no longer exists", async () => {
    await expect(
      useCase.execute({ userId: "gone", displayName: "Aman" }),
    ).rejects.toThrow("User not found");
  });
});
