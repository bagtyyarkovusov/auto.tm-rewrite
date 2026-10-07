import * as Linking from "expo-linking";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfileScreen from "../../app/profile";
import { storeAuthSession } from "../../src/auth/session";
import { server } from "../msw";
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

const picker = vi.hoisted(() => ({
  library: vi.fn(async () => ({ canceled: true, assets: null })),
  camera: vi.fn(async () => ({ canceled: true, assets: null })),
  permission: vi.fn(async () => ({ granted: false, canAskAgain: false, status: "denied" })),
  libraryPermission: vi.fn(),
}));
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: picker.library, launchCameraAsync: picker.camera,
  requestCameraPermissionsAsync: picker.permission,
  requestMediaLibraryPermissionsAsync: picker.libraryPermission,
}));

const me = {
  id: "00000000-0000-4000-8000-00000000000a", phone: "+99365123456", email: null,
  phoneVerified: true, displayName: "Aman", nameNumber: 4821, avatarIndex: 7,
  avatarKey: null, avatarUrl: null, role: "buyer", locale: "ru",
  createdAt: "2026-01-15T00:00:00.000Z", deletionScheduledAt: null,
};

beforeEach(async () => {
  storage.clear();
  vi.clearAllMocks();
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

});
