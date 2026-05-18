import { describe, it, expect } from "vitest";

import {
  computePublishGate,
  reconstructQueueFromDraft,
  updatePhotoState,
  removePhotoFromQueue,
  reorderPhotos,
} from "./queueState";
import type { StagedPhoto, UploadQueue } from "./types";

function makeQueue(photos: StagedPhoto[]): UploadQueue {
  return { draftId: "draft-1", photos };
}

function makePhoto(overrides: Partial<StagedPhoto> = {}): StagedPhoto {
  return {
    photoId: "p1",
    state: "selected",
    sortOrder: 0,
    retryCount: 0,
    ...overrides,
  };
}

describe("computePublishGate", () => {
  it("returns canPublish=false with blocker when queue is empty", () => {
    const result = computePublishGate(makeQueue([]));
    expect(result.canPublish).toBe(false);
    expect(result.blockers).toContain("At least one photo is required");
  });

  it("returns canPublish=false when photo is in selected state", () => {
    const result = computePublishGate(
      makeQueue([makePhoto({ state: "selected" })]),
    );
    expect(result.canPublish).toBe(false);
    expect(result.blockers).toContain("Some uploads are still in progress");
  });

  it("returns canPublish=false when photo is in failed state", () => {
    const result = computePublishGate(
      makeQueue([makePhoto({ state: "failed" })]),
    );
    expect(result.canPublish).toBe(false);
    expect(result.blockers).toContain("Some uploads failed — retry or remove them");
  });

  it("returns canPublish=true when photo is in attached state", () => {
    const result = computePublishGate(
      makeQueue([makePhoto({ state: "attached" })]),
    );
    expect(result.canPublish).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("returns canPublish=false for mixed states with pending", () => {
    const result = computePublishGate(
      makeQueue([
        makePhoto({ photoId: "p1", state: "attached" }),
        makePhoto({ photoId: "p2", state: "selected" }),
      ]),
    );
    expect(result.canPublish).toBe(false);
    expect(result.blockers).toContain("Some uploads are still in progress");
  });
});

describe("reconstructQueueFromDraft", () => {
  it("marks photo with key as attached", () => {
    const result = reconstructQueueFromDraft(
      "draft-1",
      { photos: [{ photoId: "p1", key: "k1", sortOrder: 0 }] },
      [],
    );
    expect(result.photos[0]?.state).toBe("attached");
  });

  it("marks photo without key but with local file as compressed", () => {
    const result = reconstructQueueFromDraft(
      "draft-1",
      { photos: [{ photoId: "p1", sortOrder: 0 }] },
      ["p1"],
    );
    expect(result.photos[0]?.state).toBe("compressed");
  });

  it("marks photo without key and no local file as lost", () => {
    const result = reconstructQueueFromDraft(
      "draft-1",
      { photos: [{ photoId: "p1", sortOrder: 0 }] },
      [],
    );
    expect(result.photos[0]?.state).toBe("lost");
  });
});

describe("updatePhotoState", () => {
  it("updates state and increments retryCount on failed", () => {
    const queue = makeQueue([makePhoto({ retryCount: 1 })]);
    const result = updatePhotoState(queue, "p1", "failed");
    expect(result.photos[0]?.state).toBe("failed");
    expect(result.photos[0]?.retryCount).toBe(2);
  });

  it("does not increment retryCount on non-failed", () => {
    const queue = makeQueue([makePhoto({ retryCount: 1 })]);
    const result = updatePhotoState(queue, "p1", "attached");
    expect(result.photos[0]?.state).toBe("attached");
    expect(result.photos[0]?.retryCount).toBe(1);
  });
});

describe("removePhotoFromQueue", () => {
  it("removes photo and re-sorts remaining", () => {
    const queue = makeQueue([
      makePhoto({ photoId: "p1", sortOrder: 0 }),
      makePhoto({ photoId: "p2", sortOrder: 1 }),
      makePhoto({ photoId: "p3", sortOrder: 2 }),
    ]);
    const result = removePhotoFromQueue(queue, "p2");
    expect(result.photos).toHaveLength(2);
    expect(result.photos[0]?.photoId).toBe("p1");
    expect(result.photos[0]?.sortOrder).toBe(0);
    expect(result.photos[1]?.photoId).toBe("p3");
    expect(result.photos[1]?.sortOrder).toBe(1);
  });
});

describe("reorderPhotos", () => {
  it("reorders by given IDs", () => {
    const queue = makeQueue([
      makePhoto({ photoId: "p1", sortOrder: 0 }),
      makePhoto({ photoId: "p2", sortOrder: 1 }),
      makePhoto({ photoId: "p3", sortOrder: 2 }),
    ]);
    const result = reorderPhotos(queue, ["p3", "p1", "p2"]);
    expect(result.photos[0]?.photoId).toBe("p3");
    expect(result.photos[0]?.sortOrder).toBe(0);
    expect(result.photos[1]?.photoId).toBe("p1");
    expect(result.photos[1]?.sortOrder).toBe(1);
    expect(result.photos[2]?.photoId).toBe("p2");
    expect(result.photos[2]?.sortOrder).toBe(2);
  });
});
