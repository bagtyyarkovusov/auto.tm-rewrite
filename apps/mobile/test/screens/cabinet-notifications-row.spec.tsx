import { beforeEach, describe, expect, it, vi } from "vitest";

import CabinetScreen from "../../app/(tabs)/services";
import { fireEvent, renderMobile, routerMock } from "../render";

const state = vi.hoisted(() => ({ isAuthenticated: false as boolean | null }));

vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
// The installed avatar distribution imports an extensionless path Node cannot
// resolve.
vi.mock("@rn-primitives/avatar", async () => {
  const native = await import("react-native");
  return { Root: native.View, Image: native.Image, Fallback: native.View };
});
vi.mock("../../src/auth/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: state.isAuthenticated, phone: "" }),
}));
vi.mock("../../src/api/identity/useMe", () => ({
  useMe: () => ({ isPending: true, isError: false, data: undefined }),
}));

beforeEach(() => {
  state.isAuthenticated = false;
});

describe("Cabinet Notifications row", () => {
  it("is shown to a signed-in User and opens Notifications", () => {
    state.isAuthenticated = true;
    const view = renderMobile(<CabinetScreen />);
    fireEvent.press(view.getByRole("button", { name: "Notifications" }));
    expect(routerMock.push).toHaveBeenCalledWith("/notifications");
  });

  it("is not shown to a signed-out visitor", () => {
    const view = renderMobile(<CabinetScreen />);
    expect(view.queryByRole("button", { name: "Notifications" })).toBeNull();
  });

  it("reads in Russian and Turkmen", () => {
    state.isAuthenticated = true;
    expect(renderMobile(<CabinetScreen />, { locale: "ru" }).getByRole("button", { name: "Уведомления" })).toBeTruthy();
    expect(renderMobile(<CabinetScreen />, { locale: "tk" }).getByRole("button", { name: "Habarnamalar" })).toBeTruthy();
  });
});
