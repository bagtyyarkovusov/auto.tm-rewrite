// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getInfoAsync, readDirectoryAsync, uploadAsync } from "expo-file-system/legacy";

import { setupUploadResume } from "./appStateResume";
import { compressPhoto } from "./compressor";
import { deleteDraftDir, ensureDraftDir, getStagingPath, listLocalPhotoIds } from "./stagingDir";
import { useUploadQueue } from "./useUploadQueue";

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  deleteAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  moveAsync: vi.fn(),
  copyAsync: vi.fn(),
  uploadAsync: vi.fn(),
  FileSystemUploadType: { BINARY_CONTENT: "BINARY_CONTENT" },
  documentDirectory: "file:///doc/",
}));

vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: vi.fn(),
  },
}));

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() => Promise.resolve(null)),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

const mockPresignMutateAsync = vi.fn();

vi.mock("../../api/uploads/usePresignUpload", () => ({
  usePresignUpload: vi.fn(() => ({
    mutateAsync: mockPresignMutateAsync,
  })),
}));

vi.mock("./compressor", () => ({
  compressPhoto: vi.fn(),
  CompressionError: class CompressionError extends Error {
    constructor(
      message: string,
      public readonly code: string,
    ) {
      super(message);
      this.name = "CompressionError";
    }
  },
}));

vi.mock("./stagingDir", () => ({
  ensureDraftDir: vi.fn(() => Promise.resolve()),
  getDraftDir: vi.fn((stagingKey: string) => `file:///doc/listing-staging/${stagingKey}/`),
  getStagingPath: vi.fn((stagingKey: string, photoId: string) => `file:///doc/listing-staging/${stagingKey}/${photoId}.jpg`),
  listLocalPhotoIds: vi.fn(() => Promise.resolve([])),
  deleteDraftDir: vi.fn(() => Promise.resolve()),
}));

vi.mock("./appStateResume", () => ({
  setupUploadResume: vi.fn(() => () => {}),
}));

const mockReadDirectoryAsync = vi.mocked(readDirectoryAsync);
const mockGetInfoAsync = vi.mocked(getInfoAsync);
const mockUploadAsync = vi.mocked(uploadAsync);
const mockCompressPhoto = vi.mocked(compressPhoto);
const mockEnsureDraftDir = vi.mocked(ensureDraftDir);
const mockGetStagingPath = vi.mocked(getStagingPath);
const mockListLocalPhotoIds = vi.mocked(listLocalPhotoIds);
const mockDeleteDraftDir = vi.mocked(deleteDraftDir);
const mockSetupUploadResume = vi.mocked(setupUploadResume);

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useUploadQueue — parallel batch compression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadDirectoryAsync.mockResolvedValue([]);
    mockGetInfoAsync.mockResolvedValue({
      exists: true,
      uri: "",
      size: 1024,
      isDirectory: false,
      modificationTime: 0,
    });
    mockUploadAsync.mockResolvedValue({ status: 200, headers: {}, body: "", mimeType: "image/jpeg" });
    mockPresignMutateAsync.mockResolvedValue({ uploadUrl: "http://localhost/presigned", key: "test-key" });
  });

  it("keeps isCompressing=true while any photo is still compressing", async () => {
    // Controlled compression promises
    const controllers = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();

    mockCompressPhoto.mockImplementation((sourceUri: string, destinationUri: string) => {
      return new Promise<{ uri: string; width: number; height: number; fileSize: number }>((resolve, reject) => {
        controllers.set(sourceUri as string, {
          resolve: () => resolve({ uri: destinationUri as string, width: 100, height: 100, fileSize: 1024 }),
          reject: (err: Error) => reject(err),
        });
      });
    });

    const initialPayload = { photos: [] };
    const { result } = renderHook(
      () => useUploadQueue("draft-1", initialPayload),
      { wrapper },
    );

    await waitFor(() => expect(result.current.photos).toHaveLength(0));

    const uri1 = "file:///picker/photo1.jpg";
    const uri2 = "file:///picker/photo2.jpg";

    act(() => {
      void result.current.addPhoto(uri1);
      void result.current.addPhoto(uri2);
    });

    await waitFor(() => expect(result.current.photos).toHaveLength(2));
    expect(result.current.isCompressing).toBe(true);

    // Resolve first compression — upload finishes immediately in mocks
    act(() => {
      controllers.get(uri1)?.resolve();
    });
    await waitFor(() => expect(result.current.photos[0]?.state).toBe("uploaded"));
    // Photo 2 is still compressing
    expect(result.current.isCompressing).toBe(true);

    // Resolve second compression
    act(() => {
      controllers.get(uri2)?.resolve();
    });
    await waitFor(() => expect(result.current.photos[1]?.state).toBe("uploaded"));
    expect(result.current.isCompressing).toBe(false);
  });

  it("sets isCompressing=false when the last parallel compression fails", async () => {
    const controllers = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();

    mockCompressPhoto.mockImplementation((sourceUri: string, destinationUri: string) => {
      return new Promise<{ uri: string; width: number; height: number; fileSize: number }>((resolve, reject) => {
        controllers.set(sourceUri as string, {
          resolve: () => resolve({ uri: destinationUri as string, width: 100, height: 100, fileSize: 1024 }),
          reject: (err: Error) => reject(err),
        });
      });
    });

    const initialPayload = { photos: [] };
    const { result } = renderHook(
      () => useUploadQueue("draft-2", initialPayload),
      { wrapper },
    );

    await waitFor(() => expect(result.current.photos).toHaveLength(0));

    const uri1 = "file:///picker/photo1.jpg";
    const uri2 = "file:///picker/photo2.jpg";

    act(() => {
      void result.current.addPhoto(uri1);
      void result.current.addPhoto(uri2);
    });

    await waitFor(() => expect(result.current.photos).toHaveLength(2));
    expect(result.current.isCompressing).toBe(true);

    // Resolve first — upload finishes immediately in mocks
    act(() => {
      controllers.get(uri1)?.resolve();
    });
    await waitFor(() => expect(result.current.photos[0]?.state).toBe("uploaded"));
    // Photo 2 is still compressing
    expect(result.current.isCompressing).toBe(true);

    // Reject second
    act(() => {
      controllers.get(uri2)?.reject(new Error("compress failed"));
    });
    await waitFor(() => expect(result.current.photos[1]?.state).toBe("failed"));
    expect(result.current.isCompressing).toBe(false);
  });

  it("continues other compressions independently when one fails", async () => {
    const controllers = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();

    mockCompressPhoto.mockImplementation((sourceUri: string, destinationUri: string) => {
      return new Promise<{ uri: string; width: number; height: number; fileSize: number }>((resolve, reject) => {
        controllers.set(sourceUri as string, {
          resolve: () => resolve({ uri: destinationUri as string, width: 100, height: 100, fileSize: 1024 }),
          reject: (err: Error) => reject(err),
        });
      });
    });

    const initialPayload = { photos: [] };
    const { result } = renderHook(
      () => useUploadQueue("draft-3", initialPayload),
      { wrapper },
    );

    await waitFor(() => expect(result.current.photos).toHaveLength(0));

    const uri1 = "file:///picker/photo1.jpg";
    const uri2 = "file:///picker/photo2.jpg";
    const uri3 = "file:///picker/photo3.jpg";

    act(() => {
      void result.current.addPhoto(uri1);
      void result.current.addPhoto(uri2);
      void result.current.addPhoto(uri3);
    });

    await waitFor(() => expect(result.current.photos).toHaveLength(3));

    // Fail photo 2
    act(() => {
      controllers.get(uri2)?.reject(new Error("compress failed"));
    });
    await waitFor(() => expect(result.current.photos[1]?.state).toBe("failed"));

    // Photo 1 and 3 should still be in "selected" (compressing)
    expect(result.current.photos[0]?.state).toBe("selected");
    expect(result.current.photos[2]?.state).toBe("selected");
    expect(result.current.isCompressing).toBe(true);

    // Resolve photo 1 — upload finishes immediately in mocks
    act(() => {
      controllers.get(uri1)?.resolve();
    });
    await waitFor(() => expect(result.current.photos[0]?.state).toBe("uploaded"));
    // Photo 3 is still compressing
    expect(result.current.isCompressing).toBe(true);

    // Resolve photo 3
    act(() => {
      controllers.get(uri3)?.resolve();
    });
    await waitFor(() => expect(result.current.photos[2]?.state).toBe("uploaded"));
    expect(result.current.isCompressing).toBe(false);
  });

  it("uses the opaque staging key for staging paths", async () => {
    mockCompressPhoto.mockResolvedValue({
      uri: "file:///doc/listing-staging/draft-abc123/photo-id.jpg",
      width: 100,
      height: 100,
      fileSize: 1024,
    });

    const initialPayload = { photos: [] };
    const { result } = renderHook(
      () => useUploadQueue("draft-abc123", initialPayload),
      { wrapper },
    );

    await waitFor(() => expect(result.current.photos).toHaveLength(0));

    await act(async () => {
      await result.current.addPhoto("file:///picker/photo.jpg");
    });

    expect(mockEnsureDraftDir).toHaveBeenCalledWith("draft-abc123");
    expect(mockGetStagingPath).toHaveBeenCalledWith(
      "draft-abc123",
      expect.any(String),
    );
  });

  it("does not drop photos added before async initialization finishes", async () => {
    let resolveInit: ((value: string[]) => void) | undefined;
    mockListLocalPhotoIds.mockImplementation(
      () =>
        new Promise<string[]>((resolve) => {
          resolveInit = resolve;
        }),
    );
    mockCompressPhoto.mockResolvedValue({
      uri: "file:///doc/listing-staging/race/photo-id.jpg",
      width: 100,
      height: 100,
      fileSize: 1024,
    });

    const initialPayload = { photos: [] };
    const { result } = renderHook(
      () => useUploadQueue("init-race", initialPayload),
      { wrapper },
    );

    // Ensure init has started but not completed.
    await waitFor(() =>
      expect(mockListLocalPhotoIds).toHaveBeenCalledWith("init-race"),
    );
    expect(resolveInit).toBeDefined();

    // Add a photo while initialization is still reading disk.
    await act(async () => {
      await result.current.addPhoto("file:///picker/photo.jpg");
    });

    // Complete initialization after the photo was added.
    act(() => resolveInit?.([]));

    // The photo must survive the merge and finish uploading.
    await waitFor(() => expect(result.current.photos).toHaveLength(1));
    expect(result.current.photos[0]?.state).toBe("uploaded");
    expect(result.current.photos[0]?.localUri).toBe(
      "file:///doc/listing-staging/race/photo-id.jpg",
    );
  });

  it("ignores stale initialization from a previous staging key", async () => {
    let resolveEmptyInit: ((value: string[]) => void) | undefined;
    mockListLocalPhotoIds.mockImplementation((stagingKey: string) => {
      if (stagingKey === "") {
        return new Promise<string[]>((resolve) => {
          resolveEmptyInit = resolve;
        });
      }
      return Promise.resolve([]);
    });
    mockCompressPhoto.mockResolvedValue({
      uri: "file:///doc/listing-staging/draft-live/photo-id.jpg",
      width: 100,
      height: 100,
      fileSize: 1024,
    });

    const { result, rerender } = renderHook(
      ({ stagingKey }) => useUploadQueue(stagingKey, { photos: [] }),
      {
        wrapper,
        initialProps: { stagingKey: "" },
      },
    );

    await waitFor(() => expect(mockListLocalPhotoIds).toHaveBeenCalledWith(""));
    expect(resolveEmptyInit).toBeDefined();

    rerender({ stagingKey: "draft-live" });
    await waitFor(() =>
      expect(mockListLocalPhotoIds).toHaveBeenCalledWith("draft-live"),
    );

    await act(async () => {
      await result.current.addPhoto("file:///picker/photo.jpg");
    });
    await waitFor(() => expect(result.current.photos).toHaveLength(1));

    act(() => resolveEmptyInit?.([]));

    await waitFor(() => expect(result.current.photos).toHaveLength(1));
    expect(result.current.photos[0]?.state).toBe("uploaded");
  });

  describe("when the wizard moves to another draft", () => {
    const empty = { photos: [] };

    async function openDraftWithOnePhoto() {
      mockCompressPhoto.mockResolvedValue({
        uri: "file:///doc/listing-staging/draft-a/photo-id.jpg",
        width: 100,
        height: 100,
        fileSize: 1024,
      });
      const hook = renderHook(
        ({ stagingKey }) => useUploadQueue(stagingKey, empty),
        { wrapper, initialProps: { stagingKey: "draft-a" } },
      );
      await waitFor(() => expect(mockListLocalPhotoIds).toHaveBeenCalledWith("draft-a"));
      await act(async () => {
        await hook.result.current.addPhoto("file:///picker/photo.jpg");
      });
      await waitFor(() => expect(hook.result.current.photos[0]?.state).toBe("uploaded"));
      return hook;
    }

    it("drops the closed draft's photos, so the next draft opened starts with its own", async () => {
      const { result, rerender } = await openDraftWithOnePhoto();

      // ✕ closes the wizard: no draft is open.
      rerender({ stagingKey: "" });
      await waitFor(() => expect(result.current.photos).toEqual([]));

      rerender({ stagingKey: "draft-b" });
      await waitFor(() => expect(mockListLocalPhotoIds).toHaveBeenCalledWith("draft-b"));
      await act(async () => undefined);

      expect(result.current.photos).toEqual([]);
    });

    it("does not carry photos straight from one draft into another", async () => {
      const { result, rerender } = await openDraftWithOnePhoto();

      rerender({ stagingKey: "draft-b" });
      await waitFor(() => expect(mockListLocalPhotoIds).toHaveBeenCalledWith("draft-b"));
      await act(async () => undefined);

      expect(result.current.photos).toEqual([]);
    });
  });

  describe("local photos from an earlier session", () => {
    const payload = { photos: [{ photoId: "server-1", key: "listings/l1/server-1/original.jpg", sortOrder: 0 }] };

    it("restores them by default", async () => {
      mockListLocalPhotoIds.mockResolvedValueOnce(["left-behind"]);
      const { result } = renderHook(() => useUploadQueue("draft-9", payload), { wrapper });
      await waitFor(() => expect(result.current.photos).toHaveLength(2));
      expect(mockDeleteDraftDir).not.toHaveBeenCalled();
    });

    it("uploads a photo that was still uploading when the app closed", async () => {
      mockListLocalPhotoIds.mockResolvedValueOnce(["left-behind"]);
      const { result } = renderHook(() => useUploadQueue("draft-9", payload), { wrapper });

      await waitFor(() =>
        expect(result.current.photos.find((p) => p.photoId === "left-behind")).toMatchObject({
          state: "uploaded",
          key: "test-key",
        }),
      );
      // The size is read from the staged file: the earlier session's figure is gone.
      expect(mockPresignMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ sizeBytes: 1024 }));
      expect(mockUploadAsync).toHaveBeenCalledWith(
        "http://localhost/presigned",
        "file:///doc/listing-staging/draft-9/left-behind.jpg",
        expect.anything(),
      );
    });

    it("uploads that photo once when the app or network resumes while it is starting", async () => {
      mockListLocalPhotoIds.mockResolvedValueOnce(["left-behind"]);
      // The upload's first step, reading the staged file, is held open.
      let releaseFileInfo = () => {};
      mockGetInfoAsync.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFileInfo = () =>
              resolve({ exists: true, uri: "", size: 1024, isDirectory: false, modificationTime: 0 });
          }),
      );
      const { result } = renderHook(() => useUploadQueue("draft-9", payload), { wrapper });
      await waitFor(() => expect(result.current.isReady).toBe(true));
      await waitFor(() => expect(mockGetInfoAsync).toHaveBeenCalledTimes(1));

      // The app comes to the foreground, or the network reports itself, right then.
      const resume = mockSetupUploadResume.mock.calls.at(-1)?.[0].resumePendingUploads;
      act(() => resume?.());
      act(() => resume?.());
      await act(async () => { releaseFileInfo(); });

      await waitFor(() =>
        expect(result.current.photos.find((p) => p.photoId === "left-behind")?.state).toBe("uploaded"),
      );
      await act(async () => undefined);
      expect(mockPresignMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockUploadAsync).toHaveBeenCalledTimes(1);
    });

    it("can retry a photo after its upload failed", async () => {
      mockListLocalPhotoIds.mockResolvedValueOnce(["left-behind"]);
      mockUploadAsync.mockRejectedValueOnce(new Error("connection lost"));
      const { result } = renderHook(() => useUploadQueue("draft-9", payload), { wrapper });
      await waitFor(() =>
        expect(result.current.photos.find((p) => p.photoId === "left-behind")?.state).toBe("failed"),
      );

      act(() => result.current.retryPhoto("left-behind"));

      await waitFor(() =>
        expect(result.current.photos.find((p) => p.photoId === "left-behind")?.state).toBe("uploaded"),
      );
      expect(mockUploadAsync).toHaveBeenCalledTimes(2);
    });

    it("reads the device once for a draft, even if its payload changes meanwhile", async () => {
      let releaseInit: ((ids: string[]) => void) | undefined;
      mockListLocalPhotoIds.mockImplementation(
        () => new Promise<string[]>((resolve) => { releaseInit = resolve; }),
      );
      const { result, rerender } = renderHook(
        ({ draft }) => useUploadQueue("draft-9", draft),
        { wrapper, initialProps: { draft: payload as { photos: typeof payload.photos } } },
      );
      await waitFor(() => expect(releaseInit).toBeDefined());

      // The screen clears the payload's photos before the device has answered.
      rerender({ draft: { photos: [] } });
      await act(async () => undefined);
      act(() => releaseInit?.(["server-1"]));

      await waitFor(() => expect(result.current.isReady).toBe(true));
      await act(async () => undefined);
      expect(mockListLocalPhotoIds).toHaveBeenCalledTimes(1);
      expect(result.current.photos).toHaveLength(1);
      expect(result.current.photos[0]).toMatchObject({ photoId: "server-1", key: payload.photos[0]?.key });
      expect(mockPresignMutateAsync).not.toHaveBeenCalled();
      mockListLocalPhotoIds.mockImplementation(() => Promise.resolve([]));
    });

    it("restores a draft reopened before the closed wizard's empty queue has settled", async () => {
      const noDraft = {};
      let releaseIdle: ((ids: string[]) => void) | undefined;
      mockListLocalPhotoIds.mockImplementation((key: string) =>
        key === "" ? new Promise<string[]>((resolve) => { releaseIdle = resolve; }) : Promise.resolve([]),
      );
      const { result, rerender } = renderHook(
        ({ stagingKey }) => useUploadQueue(stagingKey, stagingKey ? payload : noDraft),
        { wrapper, initialProps: { stagingKey: "draft-9" } },
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.photos.map((p) => p.photoId)).toEqual(["server-1"]);

      // ✕, then Continue on the same draft while the device is still answering.
      rerender({ stagingKey: "" });
      rerender({ stagingKey: "draft-9" });
      expect(result.current.isReady).toBe(false);

      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.photos.map((p) => p.photoId)).toEqual(["server-1"]);
      act(() => releaseIdle?.([]));
      await act(async () => undefined);
      expect(result.current.photos.map((p) => p.photoId)).toEqual(["server-1"]);
      mockListLocalPhotoIds.mockImplementation(() => Promise.resolve([]));
    });

    it("says when the photos of the open draft are restored", async () => {
      const { result, rerender } = renderHook(
        ({ stagingKey }) => useUploadQueue(stagingKey, payload),
        { wrapper, initialProps: { stagingKey: "draft-9" } },
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));

      let releaseInit: ((ids: string[]) => void) | undefined;
      mockListLocalPhotoIds.mockImplementationOnce(
        () => new Promise<string[]>((resolve) => { releaseInit = resolve; }),
      );
      rerender({ stagingKey: "draft-10" });
      expect(result.current.isReady).toBe(false);

      await waitFor(() => expect(releaseInit).toBeDefined());
      act(() => releaseInit?.([]));
      await waitFor(() => expect(result.current.isReady).toBe(true));
    });

    it("deletes them instead when told not to restore", async () => {
      const { result } = renderHook(
        () => useUploadQueue("edit-l1", payload, { restoreLocalPhotos: false }),
        { wrapper },
      );
      await waitFor(() => expect(mockDeleteDraftDir).toHaveBeenCalledWith("edit-l1"));
      await waitFor(() => expect(result.current.photos.map((p) => p.photoId)).toEqual(["server-1"]));
      expect(mockListLocalPhotoIds).not.toHaveBeenCalled();
    });

    it("still seeds from the payload when the cleanup fails", async () => {
      mockDeleteDraftDir.mockRejectedValueOnce(new Error("disk unavailable"));
      const { result } = renderHook(
        () => useUploadQueue("edit-l1", payload, { restoreLocalPhotos: false }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.photos.map((p) => p.photoId)).toEqual(["server-1"]));
    });

    it("never deletes staging before the session has a key", async () => {
      renderHook(() => useUploadQueue("", {}, { restoreLocalPhotos: false }), { wrapper });
      await act(async () => undefined);
      expect(mockDeleteDraftDir).not.toHaveBeenCalled();
    });
  });
});
