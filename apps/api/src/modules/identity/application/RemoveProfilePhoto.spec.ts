import { beforeEach, describe, expect, it } from "vitest";

import { UserSuspendedError } from "../domain/UserSuspendedError";
import { InMemoryIdentityCheck } from "./testing/InMemoryIdentityCheck";
import { InMemoryProfilePhotos } from "./testing/InMemoryProfilePhotos";
import { InMemoryUsers } from "./testing/InMemoryUsers";
import { RemoveProfilePhoto } from "./RemoveProfilePhoto";

const KEY = "pending/0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f/original.jpg";

describe("RemoveProfilePhoto", () => {
  let users: InMemoryUsers;
  let identityCheck: InMemoryIdentityCheck;
  let photos: InMemoryProfilePhotos;
  let useCase: RemoveProfilePhoto;

  beforeEach(() => {
    users = new InMemoryUsers();
    identityCheck = new InMemoryIdentityCheck();
    photos = new InMemoryProfilePhotos(users);
    useCase = new RemoveProfilePhoto(users, identityCheck, photos);
  });

  it("releases the photo through the port and keeps the Assigned Avatar index", async () => {
    users.seed({ id: "user-1", avatarKey: KEY, avatarIndex: 7 });

    await useCase.execute({ userId: "user-1" });

    expect(photos.released).toEqual(["user-1"]);
    expect(await users.findById("user-1")).toMatchObject({ avatarKey: null, avatarIndex: 7 });
  });

  it("succeeds for a User with no photo", async () => {
    users.seed({ id: "user-1", avatarIndex: 7 });

    await useCase.execute({ userId: "user-1" });

    expect(await users.findById("user-1")).toMatchObject({ avatarKey: null, avatarIndex: 7 });
  });

  it("refuses a suspended User and keeps the photo", async () => {
    users.seed({ id: "user-1", avatarKey: KEY });
    identityCheck.suspend("user-1");

    await expect(useCase.execute({ userId: "user-1" })).rejects.toBeInstanceOf(
      UserSuspendedError,
    );
    expect(photos.released).toEqual([]);
    expect((await users.findById("user-1"))?.avatarKey).toBe(KEY);
  });

  it("answers 'User not found' for a User that no longer exists", async () => {
    await expect(useCase.execute({ userId: "gone" })).rejects.toThrow("User not found");
  });
});
