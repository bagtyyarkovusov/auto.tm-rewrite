import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./stagingDir", () => ({
  listDraftDirs: vi.fn(),
  deleteDraftDir: vi.fn(() => Promise.resolve()),
}));

import { deleteDraftDir, listDraftDirs } from "./stagingDir";
import { cleanupOrphanDraftDirs } from "./orphanCleanup";

const mockListDraftDirs = vi.mocked(listDraftDirs);
const mockDeleteDraftDir = vi.mocked(deleteDraftDir);

describe("cleanupOrphanDraftDirs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes orphan draft and edit staging dirs", async () => {
    mockListDraftDirs.mockResolvedValue([
      "draft-existing-draft",
      "draft-old-draft",
      "edit-existing-listing",
      "edit-old-listing",
    ]);

    const deleted = await cleanupOrphanDraftDirs(
      new Set(["existing-draft"]),
      new Set(["existing-listing"]),
    );

    expect(deleted).toEqual(["draft-old-draft", "edit-old-listing"]);
    expect(mockDeleteDraftDir).toHaveBeenCalledWith("draft-old-draft");
    expect(mockDeleteDraftDir).toHaveBeenCalledWith("edit-old-listing");
    expect(mockDeleteDraftDir).toHaveBeenCalledTimes(2);
  });

  it("logs and skips unknown staging dir prefixes", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockListDraftDirs.mockResolvedValue(["tmp-abc", "draft-keep"]);

    const deleted = await cleanupOrphanDraftDirs(
      new Set(["keep"]),
      new Set(),
    );

    expect(deleted).toEqual([]);
    expect(mockDeleteDraftDir).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Skipping unknown listing staging directory: tmp-abc",
    );

    warn.mockRestore();
  });
});
