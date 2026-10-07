import * as Linking from "expo-linking";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfileScreen from "../../app/profile";
import { storeAuthSession } from "../../src/auth/session";
import { server } from "../msw";
import { choosePhoto, photoDevice as picker, resetPhotoDevice } from "../profile-photo-device";
import CabinetScreen from "../../app/(tabs)/services";
import { act, fireEvent, renderMobile } from "../render";

import { ToastProvider } from "@/components/ui/toast";

vi.mock("expo-linking", () => ({ openSettings: vi.fn(async () => {}) }));

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => storage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { storage.set(key, value); },
  deleteItemAsync: async (key: string) => { storage.delete(key); },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock("expo-image-picker", async () => {
  const { photoDevice } = await import("../profile-photo-device");
  return { launchImageLibraryAsync: photoDevice.library, launchCameraAsync: photoDevice.camera,
    requestCameraPermissionsAsync: photoDevice.permission, requestMediaLibraryPermissionsAsync: photoDevice.libraryPermission };
});
vi.mock("expo-file-system/legacy", async () => (await import("../profile-photo-device")).fileSystemFake);
vi.mock("expo-image-manipulator", async () => (await import("../profile-photo-device")).imageManipulatorFake);

const me = {
  id: "00000000-0000-4000-8000-00000000000a", phone: "+99365123456", email: null,
  phoneVerified: true, displayName: "Aman", nameNumber: 4821, avatarIndex: 7,
  avatarKey: null, avatarUrl: null, role: "buyer", locale: "ru",
  createdAt: "2026-01-15T00:00:00.000Z", deletionScheduledAt: null,
};

beforeEach(async () => {
  storage.clear();
  resetPhotoDevice();
  server.use(http.get("*/me", () => HttpResponse.json(me)));
  await storeAuthSession({
    accessToken: "aman", refreshToken: "refresh-aman",
    user: { id: me.id, phone: me.phone, email: null, displayName: me.displayName, role: "buyer" },
  });
});

describe("Profile photo", () => {
  it("opens the photo sheet from the labelled avatar and can close without a change", async () => {
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    expect(view.getByText("Profile photo")).toBeTruthy();
    expect(view.getByRole("button", { name: "Take photo" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Choose from library" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Remove photo" })).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryByText("Profile photo")).toBeNull();
    expect(view.getByText("Aman")).toBeTruthy();
  });
  it("opens the library with square crop, no permission prompt, and cancellation changes nothing", async () => {
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Choose from library" })); });
    expect(picker.library).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"] }));
    expect(picker.libraryPermission).not.toHaveBeenCalled();
    expect(view.queryByText("Profile photo")).toBeNull();
    expect(view.getByRole("button", { name: "Change profile photo" }).props.disabled).not.toBe(true);
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("explains denied camera permission and opens system settings", async () => {
    const settings = vi.spyOn(Linking, "openSettings");
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Take photo" })); });
    expect(view.getByText("Camera access is off")).toBeTruthy();
    expect(view.getByText("To take a photo, allow camera access for AutoTM in system settings.")).toBeTruthy();
    expect(picker.camera).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Open settings" })); });
    expect(settings).toHaveBeenCalledOnce();
    expect(view.queryByText("Camera access is off")).toBeNull();
  });

  it("uploads a small JPEG with real byte progress, disables the avatar, and updates Profile and Cabinet", async () => {
    choosePhoto();
    let presign: unknown;
    let attached: unknown;
    server.use(
      http.post("*/uploads/presign", async ({ request }) => {
        presign = await request.json();
        return HttpResponse.json({ uploadUrl: "https://storage.example/photo", key: "pending/new/original.jpg", expiresIn: 600, maxSizeBytes: 5242880, headers: { "if-match": '"etag"', "content-type": "image/jpeg" } });
      }),
      http.put("*/me/photo", async ({ request }) => {
        attached = await request.json();
        return HttpResponse.json({ ...me, avatarKey: "pending/new/original.jpg" });
      }),
      http.get("*/me/listings/counts", () => HttpResponse.json({ active: 0, sold: 0, archived: 0, banned: 0, drafts: 0, total: 0 })),
    );
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    expect(await view.findByText("Uploading photo... 0%")).toBeTruthy();
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    expect(presign).toEqual({ kind: "image", writeProtocol: "conditional-v1", contentType: "image/jpeg", sizeBytes: 2048 });
    expect(picker.sent[0]).toMatchObject({ url: "https://storage.example/photo", options: { httpMethod: "PUT", uploadType: 0, headers: { "if-match": '"etag"', "content-type": "image/jpeg" } } });
    expect(picker.saves).toContainEqual({ format: "jpeg", compress: 0.8 });
    act(() => { picker.progress({ totalBytesSent: 512, totalBytesExpectedToSend: 2048 }); });
    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({ min: 0, max: 100, now: 25 });
    expect(view.getByText("Uploading photo... 25%").props.accessibilityLiveRegion).toBe("polite");
    const button = view.getByRole("button", { name: "Change profile photo" });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(view.queryByText("Profile photo")).toBeNull();
    act(() => { picker.progress({ totalBytesSent: 1536, totalBytesExpectedToSend: 2048 }); });
    expect(view.getByText("Uploading photo... 75%")).toBeTruthy();
    await act(async () => { picker.finish(); });
    expect(await view.findByText("Photo updated")).toBeTruthy();
    expect(attached).toEqual({ key: "pending/new/original.jpg" });
    const photos = view.UNSAFE_queryAllByType("Image" as never);
    expect(photos[0]?.props.source).toEqual({ uri: "https://media.autotm.tm/listing-photos/pending/new/thumbnail.jpg" });
    view.rerender(<ToastProvider><CabinetScreen /></ToastProvider>);
    await view.findByRole("button", { name: "Aman, +993 65 XX-XX-56" });
    expect(view.UNSAFE_queryAllByType("Image" as never)[0]?.props.source).toEqual({ uri: "https://media.autotm.tm/listing-photos/pending/new/thumbnail.jpg" });
  });

});
