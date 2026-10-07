import { AccessibilityInfo } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { http, HttpResponse } from "msw";
import { profilePhotoUploadStore } from "../../src/identity/useProfilePhotoUpload";
import { profileNoticeStore } from "../../src/identity/profileNotice";
import { AuthSchemas } from "@auto-tm/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfileScreen from "../../app/profile";
import { clearAuthSession, storeAuthSession } from "../../src/auth/session";
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
} satisfies AuthSchemas.MeResponse;
let currentMe: AuthSchemas.MeResponse = me;
const requests = { presigns: [] as unknown[], sets: [] as unknown[] };

beforeEach(async () => {
  storage.clear();
  resetPhotoDevice();
  currentMe = me;
  requests.presigns = [];
  requests.sets = [];
  onlineManager.setOnline(true);
  profilePhotoUploadStore.setState({ state: { status: "idle" } });
  profileNoticeStore.getState().clear();
  server.use(
    http.get("*/me", () => HttpResponse.json(currentMe)),
    http.post("*/uploads/presign", async ({ request }) => {
      requests.presigns.push(await request.json());
      return HttpResponse.json({ uploadUrl: "https://storage.example/photo", key: `pending/new${requests.presigns.length}/original.jpg`, expiresIn: 600, maxSizeBytes: 5242880, headers: { "if-match": '\"etag\"', "content-type": "image/jpeg" } });
    }),
    http.put("*/me/photo", async ({ request }) => {
      const body = await request.json() as { key: string };
      requests.sets.push(body);
      currentMe = { ...currentMe, avatarKey: body.key };
      return HttpResponse.json(currentMe);
    }),
  );
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
        currentMe = { ...me, avatarKey: "pending/new/original.jpg" };
        return HttpResponse.json(currentMe);
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

  it.each(["storage", "attachment"])("keeps the earlier avatar on %s failure, retries the same photo and can cancel", async (phase) => {
    currentMe = { ...me, avatarKey: "pending/old/original.jpg" };
    choosePhoto();
    if (phase === "attachment") server.use(http.put("*/me/photo", () => HttpResponse.json({ code: "INTERNAL" }, { status: 500 })));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    await act(async () => { picker.finish(phase === "storage" ? 500 : 200); });
    const error = await view.findByText("Couldn't upload the photo.");
    expect(error.props.accessibilityLiveRegion).toBe("assertive");
    expect(view.UNSAFE_queryAllByType("Image" as never)[0]?.props.source).toEqual({ uri: "https://media.autotm.tm/listing-photos/pending/old/thumbnail.jpg" });
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(2));
    expect(picker.library).toHaveBeenCalledOnce();
    expect(picker.sent[1]?.uri).toBe(picker.sent[0]?.uri);
    await act(async () => { picker.finish(500); });
    await view.findByText("Couldn't upload the photo.");
    fireEvent.press(view.getByRole("button", { name: "Cancel" }));
    expect(view.queryByText("Couldn't upload the photo.")).toBeNull();
    expect(view.getByRole("button", { name: "Change profile photo" }).props.accessibilityState.disabled).toBe(false);
  });

  it("shows the offline sentence without a request and retries when online", async () => {
    choosePhoto();
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    onlineManager.setOnline(false);
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    expect(await view.findByText("No internet connection. Try again when you are online.")).toBeTruthy();
    expect(requests.presigns).toEqual([]);
    expect(picker.sent).toEqual([]);
    onlineManager.setOnline(true);
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    await act(async () => { picker.finish(); });
    expect(await view.findByText("Photo updated")).toBeTruthy();
    expect(picker.library).toHaveBeenCalledOnce();
  });

  it.each([
    ["oversize", "This photo is too large. Choose one up to 5 MB."],
    ["unreadable", "This file can't be used. Choose a JPEG, PNG or WebP photo."],
    ["wrong type", "This file can't be used. Choose a JPEG, PNG or WebP photo."],
  ])("refuses %s before requests and offers another photo or cancel", async (problem, message) => {
    choosePhoto(problem === "wrong type" ? { mimeType: "image/gif" } : {});
    if (problem === "oversize") picker.size = 5242881;
    if (problem === "unreadable") picker.readable = false;
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    expect(await view.findByText(message)).toBeTruthy();
    expect(requests.presigns).toEqual([]);
    expect(requests.sets).toEqual([]);
    expect(view.queryByRole("button", { name: "Retry" })).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Choose another photo" }));
    expect(view.getByText("Profile photo")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryByText(message)).toBeNull();
  });

  it("removes a photo immediately without confirmation and restores the same assigned car mark", async () => {
    currentMe = { ...me, avatarKey: "pending/old/original.jpg" };
    let deleted = false;
    server.use(http.delete("*/me/photo", () => {
      deleted = true;
      currentMe = { ...me };
      return HttpResponse.json(currentMe);
    }));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Remove photo" }));
    expect(await view.findByText("Photo removed")).toBeTruthy();
    expect(deleted).toBe(true);
    expect(view.UNSAFE_queryAllByType("Image" as never)).toHaveLength(0);
    expect(view.UNSAFE_queryAllByType("Path" as never)[0]?.props.d).toBe("M11.5 12H21M17 12v3M20 12v2.4M6.5 12h.01");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    expect(view.queryByRole("button", { name: "Remove photo" })).toBeNull();
  });

  it("keeps the photo if removal fails and Retry removes it without a picker", async () => {
    currentMe = { ...me, avatarKey: "pending/old/original.jpg" };
    let removes = 0;
    server.use(http.delete("*/me/photo", () => {
      removes += 1;
      if (removes === 1) return HttpResponse.json({ code: "INTERNAL" }, { status: 500 });
      currentMe = { ...me };
      return HttpResponse.json(currentMe);
    }));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Remove photo" }));
    expect(await view.findByText("Couldn't remove the photo.")).toBeTruthy();
    expect(view.UNSAFE_queryAllByType("Image" as never)[0]?.props.source).toEqual({ uri: "https://media.autotm.tm/listing-photos/pending/old/thumbnail.jpg" });
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    expect(await view.findByText("Photo removed")).toBeTruthy();
    expect(removes).toBe(2);
    expect(picker.library).not.toHaveBeenCalled();
  });

  it("waits for a preparing upload and retries the same key without failing or uploading again", async () => {
    choosePhoto();
    server.use(http.put("*/me/photo", async ({ request }) => {
      const body = await request.json();
      requests.sets.push(body);
      if (requests.sets.length === 1) return HttpResponse.json({ code: "UPLOAD_ALREADY_ATTACHED", details: { reason: "UPLOAD_PREPARING" } }, { status: 409 });
      currentMe = { ...me, avatarKey: "pending/new1/original.jpg" };
      return HttpResponse.json(currentMe);
    }));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    await act(async () => { picker.finish(); });
    expect(await view.findByText("Preparing photo...")).toBeTruthy();
    expect(view.queryByText("Couldn't upload the photo.")).toBeNull();
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(100);
    expect(await view.findByText("Photo updated", {}, { timeout: 3000 })).toBeTruthy();
    expect(requests.sets).toEqual([{ key: "pending/new1/original.jpg" }, { key: "pending/new1/original.jpg" }]);
    expect(picker.sent).toHaveLength(1);
    expect(picker.library).toHaveBeenCalledOnce();
  });

  it.each([
    [400, "UPLOAD_NOT_AVAILABLE", undefined, "Couldn't upload the photo."],
    [400, "UPLOAD_OBJECT_INVALID", undefined, "Couldn't upload the photo."],
    [409, "UPLOAD_ALREADY_ATTACHED", "UPLOAD_ATTACHED_TO_LISTING", "This upload belongs to a listing. Retry to upload a new copy."],
  ])("freshly presigns after %s %s %s, keeping the chosen photo", async (status, code, reason, message) => {
    choosePhoto();
    server.use(http.put("*/me/photo", async ({ request }) => {
      const body = await request.json() as { key: string };
      requests.sets.push(body);
      if (requests.sets.length === 1) return HttpResponse.json({ code, details: reason ? { reason } : undefined }, { status });
      currentMe = { ...me, avatarKey: body.key };
      return HttpResponse.json(currentMe);
    }));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    await act(async () => { picker.finish(); });
    expect(await view.findByText(message)).toBeTruthy();
    expect(view.queryByText("Photo updated")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(2));
    await act(async () => { picker.finish(); });
    expect(await view.findByText("Photo updated")).toBeTruthy();
    expect(requests.presigns).toHaveLength(2);
    expect(requests.sets).toEqual([{ key: "pending/new1/original.jpg" }, { key: "pending/new2/original.jpg" }]);
    expect(picker.library).toHaveBeenCalledOnce();
  });

  it.each(["USER_SUSPENDED", "FORBIDDEN"])("keeps the earlier photo for 403 %s and offers no futile retry", async (code) => {
    choosePhoto();
    currentMe = { ...me, avatarKey: "pending/old/original.jpg" };
    server.use(http.put("*/me/photo", () => HttpResponse.json({ code, details: { reason: "USER_SUSPENDED" } }, { status: 403 })));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    await act(async () => { picker.finish(); });
    expect(await view.findByText("Your account is restricted. Contact support if you think this is a mistake.")).toBeTruthy();
    expect(view.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(view.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(view.UNSAFE_queryAllByType("Image" as never)[0]?.props.source).toEqual({ uri: "https://media.autotm.tm/listing-photos/pending/old/thumbnail.jpg" });
  });

  it("finishes after leaving Profile and shows the result on return", async () => {
    choosePhoto();
    server.use(http.get("*/me/listings/counts", () => HttpResponse.json({ active: 0, sold: 0, archived: 0, banned: 0, drafts: 0, total: 0 })));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    view.rerender(<ToastProvider><CabinetScreen /></ToastProvider>);
    await view.findByText("Cabinet");
    await act(async () => { picker.finish(); });
    await vi.waitFor(() => expect(requests.sets).toHaveLength(1));
    view.rerender(<ToastProvider><ProfileScreen /></ToastProvider>);
    expect(await view.findByText("Photo updated")).toBeTruthy();
    expect(view.UNSAFE_queryAllByType("Image" as never)[0]?.props.source).toEqual({ uri: "https://media.autotm.tm/listing-photos/pending/new1/thumbnail.jpg" });
  });

  it.each(["storage", "attachment"])("never attaches or caches the previous User's photo when signing out during %s", async (phase) => {
    choosePhoto();
    let complete: ((response: Response) => void) | undefined;
    const sentTo: string[] = [];
    server.use(http.put("*/me/photo", ({ request }) => {
      sentTo.push(request.headers.get("authorization") ?? "");
      if (phase === "attachment") return new Promise<Response>((resolve) => { complete = resolve; });
      return HttpResponse.json({ ...me, avatarKey: "pending/new1/original.jpg" });
    }));
    const content = <ToastProvider><ProfileScreen /></ToastProvider>;
    const view = renderMobile(content);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    if (phase === "attachment") {
      await act(async () => { picker.finish(); });
      await vi.waitFor(() => expect(complete).toBeDefined());
    }
    // Log out clears the QueryClient in the root session flow.
    await act(async () => { await clearAuthSession(); view.queryClient.clear(); });
    currentMe = { ...me, id: "00000000-0000-4000-8000-00000000000b", displayName: "Merdan", avatarIndex: 2 };
    await act(async () => { await storeAuthSession({ accessToken: "merdan", refreshToken: "refresh-merdan", user: { id: currentMe.id, phone: me.phone, email: null, displayName: "Merdan", role: "buyer" } }); });
    await view.findByText("Merdan");
    expect(view.queryByText("Uploading photo... 0%")).toBeNull();
    expect(view.UNSAFE_queryAllByType("Image" as never)).toHaveLength(0);
    await act(async () => {
      if (phase === "attachment") complete?.(HttpResponse.json({ ...me, avatarKey: "pending/new1/original.jpg" }));
      else picker.finish();
    });
    await vi.waitFor(() => expect(view.queryByText("Uploading photo... 0%")).toBeNull());
    expect(sentTo).toEqual(phase === "attachment" ? ["Bearer aman"] : []);
    expect(view.getByText("Merdan")).toBeTruthy();
    expect(view.queryByText("Photo updated")).toBeNull();
    expect(view.UNSAFE_queryAllByType("Image" as never)).toHaveLength(0);
  });

  it("announces upload progress and failures on iOS, where live regions do not speak", async () => {
    const announce = vi.spyOn(AccessibilityInfo, "announceForAccessibility");
    choosePhoto();
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Choose from library" }));
    await vi.waitFor(() => expect(picker.sent).toHaveLength(1));
    act(() => { picker.progress({ totalBytesSent: 512, totalBytesExpectedToSend: 2048 }); });
    expect(announce).toHaveBeenCalledWith("Uploading photo... 25%");
    await act(async () => { picker.finish(500); });
    await view.findByText("Couldn't upload the photo.");
    expect(announce).toHaveBeenCalledWith("Couldn't upload the photo.");
  });

  it("ignores a late removal failure after another User signs in", async () => {
    currentMe = { ...me, avatarKey: "pending/old/original.jpg" };
    let complete: ((response: Response) => void) | undefined;
    server.use(http.delete("*/me/photo", () => new Promise<Response>((resolve) => { complete = resolve; })));
    const view = renderMobile(<ToastProvider><ProfileScreen /></ToastProvider>);
    await view.findByText("Aman");
    fireEvent.press(view.getByRole("button", { name: "Change profile photo" }));
    fireEvent.press(view.getByRole("button", { name: "Remove photo" }));
    await vi.waitFor(() => expect(complete).toBeDefined());
    await act(async () => { await clearAuthSession(); view.queryClient.clear(); });
    currentMe = { ...me, id: "00000000-0000-4000-8000-00000000000b", displayName: "Merdan" };
    await act(async () => { await storeAuthSession({ accessToken: "merdan", refreshToken: "refresh-merdan", user: { id: currentMe.id, phone: me.phone, email: null, displayName: "Merdan", role: "buyer" } }); });
    await view.findByText("Merdan");
    expect(view.getByRole("button", { name: "Change profile photo" }).props.accessibilityState.disabled).toBe(false);
    await act(async () => { complete?.(HttpResponse.json({ code: "INTERNAL" }, { status: 500 })); });
    expect(view.queryByText("Couldn't remove the photo.")).toBeNull();
    expect(view.queryByText("Photo removed")).toBeNull();
  });

});
