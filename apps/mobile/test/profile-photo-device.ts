import type { ImagePickerAsset, ImagePickerResult } from "expo-image-picker";
import type { UploadProgressData, FileSystemUploadOptions } from "expo-file-system/legacy";
import { vi } from "vitest";

/** Native boundaries shared by Profile's rendered flow and its upload hook tests. */
export const photoDevice = {
  result: { canceled: true, assets: null } as ImagePickerResult,
  cameraGranted: false,
  size: 2048,
  readable: true,
  dimensions: { width: 1024, height: 1024 },
  renderWait: null as Promise<void> | null,
  renderStarted: vi.fn(),
  sent: [] as { url: string; uri: string; options?: FileSystemUploadOptions }[],
  progress: (_data: UploadProgressData) => {},
  finish: (_status = 200) => {},
  fail: (_error: Error) => {},
  library: vi.fn(async (_options?: unknown) => photoDevice.result),
  camera: vi.fn(async (_options?: unknown) => photoDevice.result),
  permission: vi.fn(async () => ({ granted: photoDevice.cameraGranted, canAskAgain: false, status: photoDevice.cameraGranted ? "granted" : "denied" })),
  libraryPermission: vi.fn(),
  cancelUpload: vi.fn(async () => {}),
  saves: [] as unknown[],
  deletes: [] as string[],
};

export function resetPhotoDevice() {
  photoDevice.result = { canceled: true, assets: null };
  photoDevice.cameraGranted = false;
  photoDevice.size = 2048;
  photoDevice.readable = true;
  photoDevice.dimensions = { width: 1024, height: 1024 };
  photoDevice.renderWait = null;
  photoDevice.sent = [];
  photoDevice.saves = [];
  photoDevice.deletes = [];
  photoDevice.progress = () => {};
  photoDevice.finish = () => {};
  photoDevice.fail = () => {};
  vi.clearAllMocks();
}

export function choosePhoto(overrides: Partial<ImagePickerAsset> = {}) {
  photoDevice.result = {
    canceled: false,
    assets: [{ uri: "file:///selected.png", width: 1024, height: 1024, mimeType: "image/png", type: "image", ...overrides }],
  };
}

export const fileSystemFake = {
  cacheDirectory: "file:///cache/",
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 },
  getInfoAsync: async () => ({ exists: true, isDirectory: false, size: photoDevice.size }),
  copyAsync: async () => {},
  deleteAsync: async (uri: string) => { photoDevice.deletes.push(uri); },
  createUploadTask: (url: string, uri: string, options?: FileSystemUploadOptions, progress?: (data: UploadProgressData) => void) => {
    photoDevice.sent.push({ url, uri, options });
    photoDevice.progress = progress ?? (() => {});
    return { cancelAsync: photoDevice.cancelUpload, uploadAsync: () => new Promise((resolve, reject) => {
      photoDevice.finish = (status = 200) => resolve({ status, body: "", headers: {} });
      photoDevice.fail = reject;
    }) };
  },
};

export const imageManipulatorFake = {
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: { manipulate: () => {
    let dimensions = { ...photoDevice.dimensions };
    return {
      resize: (size: { width?: number; height?: number }) => {
        const factor = size.width ? size.width / dimensions.width : (size.height ?? dimensions.height) / dimensions.height;
        dimensions = { width: Math.round(dimensions.width * factor), height: Math.round(dimensions.height * factor) };
      },
      renderAsync: async () => {
        photoDevice.renderStarted();
        await photoDevice.renderWait;
        if (!photoDevice.readable) throw new Error("Not a picture");
        return { ...dimensions, saveAsync: async (options: unknown) => {
          photoDevice.saves.push(options);
          return { uri: "file:///compressed.jpg", ...dimensions };
        } };
      },
    };
  } },
};
