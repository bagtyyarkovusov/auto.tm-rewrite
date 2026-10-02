import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfileScreen from "../../app/profile";
import { fireEvent, renderMobile, routerMock } from "../render";

const state = vi.hoisted(() => ({
  isAuthenticated: true as boolean | null,
  me: { isPending: false, isError: false, data: undefined as unknown },
  logout: vi.fn(),
}));

vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: state.isAuthenticated, phone: "" }) }));
vi.mock("../../src/auth/useLogout", () => ({ useLogout: () => ({ mutate: state.logout, isPending: false }) }));
vi.mock("../../src/api/identity/useMe", () => ({
  useMe: () => ({ ...state.me, error: new Error("Network request failed"), refetch: vi.fn() }),
}));

const me = {
  id: "user-1", displayName: "Aman", phone: "+99365123456", email: null, avatarUrl: null,
  role: "seller", createdAt: "2026-01-15T00:00:00.000Z",
};

beforeEach(() => {
  state.isAuthenticated = true;
  state.me = { isPending: false, isError: false, data: me };
  state.logout.mockClear();
});

describe("Profile account actions", () => {
  it("shows Log out and Delete account below the Sign-in Methods", () => {
    const view = renderMobile(<ProfileScreen />);
    expect(view.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Delete account" })).toBeTruthy();
    // Rendered order: the Sign-in Methods, then Log out, then Delete account.
    const text = JSON.stringify(view.toJSON());
    expect(text.indexOf("Sign-in methods")).toBeGreaterThan(-1);
    expect(text.indexOf("Sign-in methods")).toBeLessThan(text.indexOf("Log out"));
    expect(text.indexOf("Log out")).toBeLessThan(text.indexOf("Delete account"));
  });

  it("asks before logging out; Cancel keeps the session", () => {
    const view = renderMobile(<ProfileScreen />);
    fireEvent.press(view.getByRole("button", { name: "Log out" }));
    expect(view.getByText("Log out?")).toBeTruthy();
    fireEvent.press(view.getByText("Cancel"));
    expect(state.logout).not.toHaveBeenCalled();
    expect(view.queryByText("Log out?")).toBeNull();
  });

  it("logs out after the User confirms", () => {
    const view = renderMobile(<ProfileScreen />);
    fireEvent.press(view.getByRole("button", { name: "Log out" }));
    // The dialog's own Log out button follows its title.
    fireEvent.press(view.getAllByText("Log out").at(-1)!);
    expect(state.logout).toHaveBeenCalledOnce();
  });

  it("opens the existing Delete account screen", () => {
    const view = renderMobile(<ProfileScreen />);
    fireEvent.press(view.getByRole("button", { name: "Delete account" }));
    expect(routerMock.push).toHaveBeenCalledWith("/account/delete");
  });

  it("keeps Log out reachable when /me fails", () => {
    state.me = { isPending: false, isError: true, data: undefined };
    const view = renderMobile(<ProfileScreen />);
    expect(view.getByRole("button", { name: "Log out" })).toBeTruthy();
  });

  it("shows no account actions to a signed-out visitor", () => {
    state.isAuthenticated = false;
    const view = renderMobile(<ProfileScreen />);
    expect(view.queryByRole("button", { name: "Log out" })).toBeNull();
    expect(view.queryByRole("button", { name: "Delete account" })).toBeNull();
  });

  it.each(["ru", "tk"])("reads the account rows in %s", (locale) => {
    const view = renderMobile(<ProfileScreen />, { locale });
    expect(view.getByRole("button", { name: view.i18n.t("account:logout") })).toBeTruthy();
    expect(view.getByRole("button", { name: view.i18n.t("account:deleteAccount") })).toBeTruthy();
  });
});
