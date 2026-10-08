import { act } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../../test/msw";
import { PHOTO_ME, photoApiStorage, setupPhotoHook, signInPhotoUser } from "../../test/profile-photo-api";
import { choosePhoto, photoDevice, resetPhotoDevice } from "../../test/profile-photo-device";
import { clearAuthSession, loadAuthSession, storeAuthSession } from "../auth/session";
import { capturePhotoSession } from "../identity/profilePhotoSession";
import { useProfilePhotoUpload } from "../identity/useProfilePhotoUpload";

import { useRemoveProfilePhoto } from "./identity/useRemoveProfilePhoto";
import { useSetProfilePhoto } from "./identity/useSetProfilePhoto";

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

const expired = `header.${btoa(JSON.stringify({ iat: 1000, exp: 1900 }))}.signature`;
beforeEach(async () => { resetPhotoDevice(); await clearAuthSession(); await signInPhotoUser(); });

async function expireToken() {
  const session = await loadAuthSession();
  photoApiStorage.set("auto_tm_auth_session", JSON.stringify({ ...session, accessToken: expired, storedAt: new Date(Date.now() - 16 * 60_000).toISOString() }));
}

const cases = (["presign", "set", "remove"] as const).flatMap((operation) => (["expired", "401"] as const).map((trigger) => ({ operation, trigger })));
describe("Profile photo uses the shared authentication lifecycle", () => {
  it.each(cases)("refreshes $trigger credentials for $operation", async ({ operation, trigger }) => {
    if (trigger === "expired") await expireToken();
    const events: string[] = [];
    server.use(
      http.post("*/auth/refresh", async ({ request }) => {
        events.push("refresh");
        expect(await request.json()).toEqual({ refreshToken: "refresh-aman" });
        return HttpResponse.json({ accessToken: "fresh", refreshToken: "fresh-refresh" });
      }),
      http.post("*/uploads/presign", ({ request }) => {
        const auth = request.headers.get("authorization");
        events.push(`presign:${auth}`);
        if (operation === "presign" && auth !== "Bearer fresh") return HttpResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
        return HttpResponse.json({ uploadUrl: "https://storage.example/photo", key: "pending/new/original.jpg", expiresIn: 600, maxSizeBytes: 5242880, headers: { "if-match": '\"etag\"' } });
      }),
      http.put("*/me/photo", ({ request }) => {
        const auth = request.headers.get("authorization"); events.push(`set:${auth}`);
        if (operation === "set" && auth !== "Bearer fresh") return HttpResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
        return HttpResponse.json({ ...PHOTO_ME, avatarKey: "pending/new/original.jpg" });
      }),
      http.delete("*/me/photo", ({ request }) => {
        const auth = request.headers.get("authorization"); events.push(`remove:${auth}`);
        if (auth !== "Bearer fresh") return HttpResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
        return HttpResponse.json(PHOTO_ME);
      }),
    );
    if (operation === "presign") {
      choosePhoto();
      const { result } = setupPhotoHook(useProfilePhotoUpload);
      act(() => { void result.current.pick("library"); });
      await vi.waitFor(() => expect(events).toContain("refresh"));
      await vi.waitFor(() => expect(photoDevice.sent).toHaveLength(1));
      await act(async () => { photoDevice.finish(); });
      await vi.waitFor(() => expect(result.current.state.status).toBe("idle"));
    } else {
      const session = await capturePhotoSession();
      const { result } = setupPhotoHook(() => ({ set: useSetProfilePhoto(), remove: useRemoveProfilePhoto() }));
      let error: unknown;
      await act(async () => { await (operation === "set" ? result.current.set.mutateAsync({ request: { key: "pending/new/original.jpg" }, session }) : result.current.remove.mutateAsync(session)).catch((e: unknown) => { error = e; }); });
      expect(error).toBeUndefined();
      session.dispose();
    }
    expect(events.filter((event) => event === "refresh")).toHaveLength(1);
    expect(events).toContain(`${operation}:Bearer fresh`);
    if (trigger === "expired") expect(events[0]).toBe("refresh");
  });

  it("does not send a presign or replace the next User while an old refresh completes", async () => {
    await expireToken();
    let complete!: (response: Response) => void;
    let started = false;
    let presigns = 0;
    server.use(
      http.post("*/auth/refresh", () => { started = true; return new Promise<Response>((resolve) => { complete = resolve; }); }),
      http.post("*/uploads/presign", () => { presigns += 1; return HttpResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); }),
    );
    choosePhoto();
    const { result } = setupPhotoHook(useProfilePhotoUpload);
    act(() => { void result.current.pick("library"); });
    await vi.waitFor(() => expect(started).toBe(true));
    await clearAuthSession();
    const next = { accessToken: "merdan", refreshToken: "merdan-refresh", user: { id: "00000000-0000-4000-8000-00000000000b", phone: PHOTO_ME.phone, email: null, displayName: "Merdan", role: "buyer" as const } };
    await storeAuthSession(next);
    await act(async () => { complete(HttpResponse.json({ accessToken: "old-fresh", refreshToken: "old-refresh" })); });
    await vi.waitFor(() => expect(result.current.state.status).toBe("idle"));
    expect((await loadAuthSession())?.user.id).toBe(next.user.id);
    expect(presigns).toBe(0);
  });
});
