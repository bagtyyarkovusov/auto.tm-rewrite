import { act } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../../test/msw";
import { setupPhotoHook, signInPhotoUser } from "../../test/profile-photo-api";
import { choosePhoto, photoDevice, resetPhotoDevice } from "../../test/profile-photo-device";

import { profilePhotoUploadStore, resetProfilePhotoUpload, useProfilePhotoUpload } from "./useProfilePhotoUpload";

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
  await resetProfilePhotoUpload();
  resetPhotoDevice();
  profilePhotoUploadStore.setState({ state: { status: "idle" } });
  await signInPhotoUser();
});

afterEach(resetProfilePhotoUpload);

describe("useProfilePhotoUpload", () => {
  it.each(["picker", "upload", "removal"])("forgets the retained %s operation when the fixture resets", async (operation) => {
    let presigns = 0;
    let removals = 0;
    server.use(
      http.post("*/uploads/presign", () => {
        presigns += 1;
        return HttpResponse.json({ uploadUrl: "https://storage.example/photo", key: "pending/new/original.jpg", expiresIn: 600, maxSizeBytes: 5242880, headers: { "if-match": '"etag"' } });
      }),
      http.delete("*/me/photo", () => { removals += 1; return HttpResponse.json({ code: "INTERNAL" }, { status: 500 }); }),
    );
    const { result } = setupPhotoHook(useProfilePhotoUpload);
    if (operation === "picker") {
      photoDevice.permission.mockRejectedValueOnce(new Error("Camera unavailable"));
      await act(() => result.current.pick("camera"));
    } else if (operation === "upload") {
      choosePhoto();
      act(() => { void result.current.pick("library"); });
      await vi.waitFor(() => expect(photoDevice.sent).toHaveLength(1));
      await act(async () => { photoDevice.finish(500); });
    } else await act(() => result.current.remove());
    expect(result.current.state.status).toBe("failed");
    const previousCalls = { presigns, removals, picks: photoDevice.library.mock.calls.length, permissions: photoDevice.permission.mock.calls.length };
    await act(resetProfilePhotoUpload);
    const next = setupPhotoHook(useProfilePhotoUpload);
    await act(() => next.result.current.retry());
    expect(next.result.current.state.status).toBe("idle");
    expect({ presigns, removals, picks: photoDevice.library.mock.calls.length, permissions: photoDevice.permission.mock.calls.length }).toEqual(previousCalls);
    if (operation === "upload") expect(photoDevice.deletes).toContainEqual(expect.stringMatching(/^file:\/\/\/cache\/profile-photo-\d+\.jpg$/));
  });

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
