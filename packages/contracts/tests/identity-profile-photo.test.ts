import { describe, expect, it } from "vitest";

import {
  AdminAuditAction,
  RemoveUserPhotoRequestSchema,
  RemoveUserPhotoResponseSchema,
} from "../src/schemas/admin";
import {
  ProfilePhotoConflictDetailsSchema,
  ProfilePhotoConflictReason,
  ProfilePhotoErrorCode,
  SetProfilePhotoRequestSchema,
} from "../src/schemas/identity";
import { ListingsErrorCode } from "../src/schemas/listings";

describe("SetProfilePhotoRequestSchema (PUT /api/v1/me/photo)", () => {
  it("reads the upload key and drops other fields", () => {
    expect(
      SetProfilePhotoRequestSchema.parse({
        key: "pending/0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f/original.jpg",
        avatarIndex: 3,
        userId: "someone-else",
      }),
    ).toEqual({ key: "pending/0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f/original.jpg" });
  });

  it("requires a non-empty string key", () => {
    expect(SetProfilePhotoRequestSchema.safeParse({}).success).toBe(false);
    expect(SetProfilePhotoRequestSchema.safeParse({ key: "" }).success).toBe(false);
    expect(SetProfilePhotoRequestSchema.safeParse({ key: 12 }).success).toBe(false);
  });
});

describe("ProfilePhotoErrorCode", () => {
  it("reuses the Listing upload codes, whose meaning is the same", () => {
    expect(ProfilePhotoErrorCode).toEqual({
      UploadNotAvailable: ListingsErrorCode.UploadNotAvailable,
      UploadAlreadyAttached: ListingsErrorCode.UploadAlreadyAttached,
      UploadObjectInvalid: ListingsErrorCode.UploadObjectInvalid,
    });
  });
});

describe("ProfilePhotoConflictReason (details.reason of a 409)", () => {
  it("tells an upload still being set from one that belongs to a Listing", () => {
    expect(ProfilePhotoConflictReason).toEqual({
      UploadPreparing: "UPLOAD_PREPARING",
      UploadAttachedToListing: "UPLOAD_ATTACHED_TO_LISTING",
    });
  });

  it("reads only those two reasons", () => {
    expect(ProfilePhotoConflictDetailsSchema.parse({ reason: "UPLOAD_PREPARING" })).toEqual({
      reason: "UPLOAD_PREPARING",
    });
    expect(
      ProfilePhotoConflictDetailsSchema.safeParse({ reason: "UPLOAD_ATTACHED_TO_LISTING" }).success,
    ).toBe(true);
    expect(ProfilePhotoConflictDetailsSchema.safeParse({ reason: "OTHER" }).success).toBe(false);
    expect(ProfilePhotoConflictDetailsSchema.safeParse({}).success).toBe(false);
  });
});

describe("moderator photo removal (POST /api/v1/admin/users/{id}/remove-photo)", () => {
  const id = "0b9f3c1e-2d4a-4c6b-8e1f-3a5b7c9d1e2f";

  it("has its own audit action", () => {
    expect(AdminAuditAction.UserPhotoRemove).toBe("USER_PHOTO_REMOVE");
  });

  it("requires a reason and accepts an optional report", () => {
    expect(RemoveUserPhotoRequestSchema.safeParse({}).success).toBe(false);
    expect(RemoveUserPhotoRequestSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(RemoveUserPhotoRequestSchema.parse({ reason: "Offensive photo" })).toEqual({
      reason: "Offensive photo",
    });
    expect(
      RemoveUserPhotoRequestSchema.parse({ reason: "Offensive photo", reportId: id }),
    ).toEqual({ reason: "Offensive photo", reportId: id });
  });

  it("answers with the cleared photo and the unchanged avatar index", () => {
    const body = {
      targetId: id,
      targetState: { avatarKey: null, avatarIndex: 7 },
      reportId: id,
      reportStatus: "actioned",
      auditLogId: id,
    };
    expect(RemoveUserPhotoResponseSchema.parse(body)).toEqual(body);
    expect(
      RemoveUserPhotoResponseSchema.safeParse({
        ...body,
        targetState: { avatarKey: "pending/x/original.jpg", avatarIndex: 7 },
      }).success,
    ).toBe(false);
  });
});
