import { act } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupPhotoHook, signInPhotoUser } from "../../test/profile-photo-api";
import { photoDevice, resetPhotoDevice } from "../../test/profile-photo-device";

import { profilePhotoUploadStore, useProfilePhotoUpload } from "./useProfilePhotoUpload";

vi.mock("expo-secure-store", async () => {
  const { photoApiStorage } = await import("../../test/profile-photo-storage");
  return { getItemAsync: async (key: string) => photoApiStorage.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { photoApiStorage.set(key, value); },
    deleteItemAsync: async (key: string) => { photoApiStorage.delete(key); } };
});
vi.mock("expo-image-picker", async () => {
  const { photoDevice } = await import("../../test/profile-photo-device");
  return { launchImageLibraryAsync: photoDevice.library, launchCameraAsync: photoDevice.camera, requestCameraPermissionsAsync: photoDevice.permission };
});
vi.mock("expo-file-system/legacy", async () => (await import("../../test/profile-photo-device")).fileSystemFake);
vi.mock("expo-image-manipulator", async () => (await import("../../test/profile-photo-device")).imageManipulatorFake);

beforeEach(async () => {
  resetPhotoDevice();
  profilePhotoUploadStore.setState({ state: { status: "idle" } });
  await signInPhotoUser();
});

describe("useProfilePhotoUpload", () => {
  it("requests camera access and opens a square crop when permission is granted", async () => {
    photoDevice.cameraGranted = true;
    const { result } = setupPhotoHook(useProfilePhotoUpload);
    await act(() => result.current.pick("camera"));
    expect(photoDevice.permission).toHaveBeenCalledOnce();
    expect(photoDevice.camera).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1] }));
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("contains a native permission request failure instead of rejecting a press handler", async () => {
    photoDevice.permission.mockRejectedValueOnce(new Error("Camera unavailable"));
    const { result } = setupPhotoHook(useProfilePhotoUpload);
    await act(async () => { await result.current.pick("camera"); });
    expect(result.current.state.status).toBe("failed");
  });
});
