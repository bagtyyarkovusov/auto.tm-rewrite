import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NotificationsScreen from "../../app/notifications";
import { act, fireEvent, renderMobile, routerMock } from "../render";

const appState = vi.hoisted(() => ({
  listeners: new Set<(status: string) => void>(),
}));

vi.mock("react-native", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AppState: {
    addEventListener: (_: string, listener: (status: string) => void) => {
      appState.listeners.add(listener);
      return { remove: () => appState.listeners.delete(listener) };
    },
  },
}));
vi.mock("expo-linking", () => ({ openSettings: vi.fn(async () => {}) }));
vi.mock("expo-notifications", () => ({
  PermissionStatus: { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" },
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
}));

type Permission = "granted" | "denied" | "undetermined" | "unavailable";

function devicePermission(permission: Permission) {
  vi.mocked(Notifications.getPermissionsAsync).mockImplementation(async () => {
    if (permission === "unavailable") throw new Error("Native module unavailable");
    return { granted: permission === "granted", status: permission } as never;
  });
}

async function renderScreen(locale = "en") {
  const view = renderMobile(<NotificationsScreen />, { locale });
  await act(async () => {});
  return view;
}

beforeEach(() => {
  appState.listeners.clear();
  vi.mocked(Notifications.requestPermissionsAsync).mockClear();
  vi.mocked(Linking.openSettings).mockClear();
  // Run the focus callback as a mount effect, as the screen gaining focus.
  vi.mocked(useFocusEffect).mockImplementation((callback) => {
    useEffect(() => callback(), [callback]);
  });
});

describe("Notifications screen", () => {
  it("shows On when the device permission is granted", async () => {
    devicePermission("granted");
    const view = await renderScreen();
    expect(view.getByLabelText("Message notifications, On")).toBeTruthy();
  });

  it.each(["denied", "undetermined", "unavailable"] as const)(
    "shows Off when the device permission is %s",
    async (permission) => {
      devicePermission(permission);
      const view = await renderScreen();
      expect(view.getByLabelText("Message notifications, Off")).toBeTruthy();
    },
  );

  it("shows the new state when the User returns from system settings", async () => {
    devicePermission("denied");
    const view = await renderScreen();
    expect(view.getByLabelText("Message notifications, Off")).toBeTruthy();

    devicePermission("granted");
    await act(async () => {
      appState.listeners.forEach((listener) => listener("active"));
    });
    expect(view.getByLabelText("Message notifications, On")).toBeTruthy();
  });

  it("opens the app's page in system settings", async () => {
    devicePermission("denied");
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Open system settings" }));
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it("never asks for the permission", async () => {
    devicePermission("undetermined");
    await renderScreen();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("has no switch or checkbox, and shows the mute hint", async () => {
    devicePermission("granted");
    const view = await renderScreen();
    expect(view.queryByRole("switch")).toBeNull();
    expect(view.queryByRole("checkbox")).toBeNull();
    expect(view.getByText("To mute one conversation, use its menu.")).toBeTruthy();
  });

  it("goes back to Cabinet", async () => {
    devicePermission("granted");
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Back" }));
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ru", "Уведомления о сообщениях, Включены", "Открыть настройки системы"],
    ["tk", "Habar habarnamalary, Açyk", "Ulgam sazlamalaryny aç"],
  ])("reads in %s", async (locale, state, settings) => {
    devicePermission("granted");
    const view = await renderScreen(locale);
    expect(view.getByLabelText(state)).toBeTruthy();
    expect(view.getByRole("button", { name: settings })).toBeTruthy();
    expect(view.getByText(view.i18n.t("account:notifications"))).toBeTruthy();
    expect(view.getByText(view.i18n.t("account:notificationsMuteHint"))).toBeTruthy();
  });
});
