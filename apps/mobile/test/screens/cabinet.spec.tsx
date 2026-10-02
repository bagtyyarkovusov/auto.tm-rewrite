import { useFocusEffect } from "expo-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CabinetScreen from "../../app/(tabs)/services";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { maskEmail } from "../../src/auth/email";
import { maskTmPhone } from "../../src/auth/phone";
import { localeStore } from "../../src/locale/localeStore";
import { themeStore } from "../../src/theme/themeStore";
import { queryKeys } from "../../src/api/queryKeys";
import { act, fireEvent, renderMobile, routerMock } from "../render";

type Me = { displayName: string | null; phone: string | null; email: string | null; avatarUrl: string | null };
const state = vi.hoisted(() => ({
  isAuthenticated: false as boolean | null,
  me: { isPending: false, isError: false, data: undefined as Me | undefined },
  refetch: vi.fn(),
  userId: null as string | null,
  get: vi.fn(),
}));

vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) },
}));
vi.mock("../../src/auth/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: state.isAuthenticated, phone: "", userId: state.userId }),
}));
vi.mock("../../src/api/client", () => ({ apiClient: { get: state.get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("../../src/api/identity/useMe", () => ({
  useMe: () => ({ ...state.me, error: new Error("Network request failed"), refetch: state.refetch }),
}));

const PHONE = "+99365123456";
const EMAIL = "aman@example.com";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const counts = (total: number) => ({ active: 0, sold: 0, archived: 0, banned: 0, drafts: 0, total });

function signedIn(me: Partial<Me> | "pending" | "error" = {}) {
  state.isAuthenticated = true;
  state.userId = USER_ID;
  if (me === "pending") state.me = { isPending: true, isError: false, data: undefined };
  else if (me === "error") state.me = { isPending: false, isError: true, data: undefined };
  else state.me = { isPending: false, isError: false, data: { displayName: null, phone: PHONE, email: null, avatarUrl: null, ...me } };
}

beforeEach(() => {
  state.isAuthenticated = false;
  state.userId = null;
  state.get.mockReset().mockReturnValue(new Promise(() => {}));
  state.me = { isPending: false, isError: false, data: undefined };
  state.refetch.mockClear();
  localeStore.setState({ locale: "en" });
  themeStore.setState({ theme: "system" });
  useAuthIntentStore.setState({ intent: null, replayAction: null, replayReturnTo: null });
});

/** The menu rows every visitor sees, signed in or not. */
function expectMenuRows(view: ReturnType<typeof renderMobile>) {
  expect(view.getByRole("button", { name: "Language, English" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Theme, System" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Terms of Service" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Privacy Policy" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Posting rules" })).toBeTruthy();
}

describe("Cabinet signed out", () => {
  it("shows the Sign in row and the menu rows, and nothing that needs an account", () => {
    const view = renderMobile(<CabinetScreen />);
    expect(view.getByRole("button", { name: "Sign in, By phone or email" })).toBeTruthy();
    expectMenuRows(view);
    // No profile row in any of its states.
    expect(view.queryByLabelText(view.i18n.t("common:loading"))).toBeNull();
    expect(view.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(view.queryByRole("button", { name: maskTmPhone(PHONE) })).toBeNull();
    expect(view.queryByRole("button", { name: /My listings/ })).toBeNull();
    expect(view.queryByRole("button", { name: /Log out/ })).toBeNull();
    expect(view.queryByRole("button", { name: /Delete account/ })).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
  });

  it("has no gear and no List a car action", () => {
    const view = renderMobile(<CabinetScreen />);
    expect(view.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(view.queryByText("List a car")).toBeNull();
    expect(view.queryByRole("button", { name: /List a car/ })).toBeNull();
  });

  it("returns to Cabinet after the code is confirmed", () => {
    const view = renderMobile(<CabinetScreen />);
    fireEvent.press(view.getByRole("button", { name: "Sign in, By phone or email" }));
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: "/(auth)/phone", params: { authRoot: "1" } });
    useAuthIntentStore.getState().completeSignIn(routerMock);
    expect(routerMock.dismissTo).toHaveBeenCalledWith("/(tabs)/services");
  });

  it.each(["en", "ru", "tk"])("reads the rows in %s", (locale) => {
    const view = renderMobile(<CabinetScreen />, { locale });
    const t = view.i18n.t.bind(view.i18n);
    expect(view.getByRole("button", { name: `${t("common:signIn")}, ${t("account:signInSub")}` })).toBeTruthy();
    for (const key of ["account:termsOfService", "account:privacyPolicy", "account:postingRules"]) {
      expect(view.getByRole("button", { name: t(key) })).toBeTruthy();
    }
    expect(view.getByText(t("common:cabinet"))).toBeTruthy();
  });
});

describe("Cabinet signed in", () => {
  it("shows the display name over the masked method, then My listings above the menu rows", () => {
    signedIn({ displayName: "Aman" });
    const view = renderMobile(<CabinetScreen />);
    expect(view.getByRole("button", { name: `Aman, ${maskTmPhone(PHONE)}` })).toBeTruthy();
    expect(view.getByRole("button", { name: "My listings" })).toBeTruthy();
    expectMenuRows(view);
    // Rendered order: the profile row, My listings, then the menu rows.
    const text = JSON.stringify(view.toJSON());
    expect(text.indexOf("Aman")).toBeLessThan(text.indexOf("My listings"));
    expect(text.indexOf("My listings")).toBeLessThan(text.indexOf("Language"));
    expect(text.indexOf("Language")).toBeLessThan(text.indexOf("Posting rules"));
    expect(view.queryByRole("button", { name: /Sign in/ })).toBeNull();
    expect(view.queryByRole("button", { name: /Log out/ })).toBeNull();
    expect(view.queryByRole("button", { name: /Delete account/ })).toBeNull();
  });

  it("shows the masked method alone when there is no display name", () => {
    signedIn({ phone: null, email: EMAIL });
    const view = renderMobile(<CabinetScreen />);
    expect(view.getByRole("button", { name: maskEmail(EMAIL) })).toBeTruthy();
  });

  it("opens Profile and My listings", () => {
    signedIn({ displayName: "Aman" });
    const view = renderMobile(<CabinetScreen />);
    fireEvent.press(view.getByRole("button", { name: `Aman, ${maskTmPhone(PHONE)}` }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/profile");
    fireEvent.press(view.getByRole("button", { name: "My listings" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/listings/manage");
  });

  it("shows a skeleton profile row while /me loads and keeps every menu row working", () => {
    signedIn("pending");
    const view = renderMobile(<CabinetScreen />);
    expect(view.getByLabelText(view.i18n.t("common:loading"))).toBeTruthy();
    expectMenuRows(view);
    expect(view.getByRole("button", { name: "My listings" })).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Language, English" }));
    fireEvent.press(view.getByRole("radio", { name: "Русский" }));
    expect(localeStore.getState().locale).toBe("ru");
  });

  it("offers Retry when /me fails and keeps every menu row working", () => {
    signedIn("error");
    const view = renderMobile(<CabinetScreen />);
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    expect(state.refetch).toHaveBeenCalledOnce();
    expectMenuRows(view);
    fireEvent.press(view.getByRole("button", { name: "Theme, System" }));
    fireEvent.press(view.getByRole("radio", { name: "Dark" }));
    expect(themeStore.getState().theme).toBe("dark");
  });
});

describe("Cabinet My listings total", () => {
  /** Settles the counts request the row made on mount. */
  async function settle() {
    await act(async () => { await Promise.resolve(); });
  }

  it("shows the total on the row and reads it with the row label", async () => {
    signedIn({ displayName: "Aman" });
    state.get.mockResolvedValue(counts(5));
    const view = renderMobile(<CabinetScreen />);
    expect(await view.findByRole("button", { name: "My listings, 5" })).toBeTruthy();
    expect(view.getByText("5")).toBeTruthy();
    expect(state.get).toHaveBeenCalledWith("/me/listings/counts", expect.anything());
    fireEvent.press(view.getByRole("button", { name: "My listings, 5" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/listings/manage");
  });

  it.each([
    ["the total is zero", () => state.get.mockResolvedValue(counts(0))],
    ["the request is pending", () => state.get.mockReturnValue(new Promise(() => {}))],
    ["the request fails", () => state.get.mockRejectedValue(new Error("Network request failed"))],
  ])("shows the row without a number when %s, and it still opens My listings", async (_name, arrange) => {
    signedIn({ displayName: "Aman" });
    arrange();
    const view = renderMobile(<CabinetScreen />);
    await settle();
    await settle();
    expect(state.get).toHaveBeenCalledOnce();
    const row = view.getByRole("button", { name: "My listings" });
    expect(view.queryByText("0")).toBeNull();
    fireEvent.press(row);
    expect(routerMock.push).toHaveBeenLastCalledWith("/listings/manage");
  });

  it("updates the number when a mutation invalidates the counts", async () => {
    signedIn({ displayName: "Aman" });
    state.get.mockResolvedValueOnce(counts(5)).mockResolvedValueOnce(counts(4));
    const view = renderMobile(<CabinetScreen />);
    await view.findByRole("button", { name: "My listings, 5" });
    await act(async () => { await view.queryClient.invalidateQueries({ queryKey: queryKeys.listings.all() }); });
    expect(await view.findByRole("button", { name: "My listings, 4" })).toBeTruthy();
  });

  it("refreshes the number when Cabinet comes back into view", async () => {
    signedIn({ displayName: "Aman" });
    state.get.mockResolvedValueOnce(counts(5)).mockResolvedValueOnce(counts(7));
    const view = renderMobile(<CabinetScreen />);
    await view.findByRole("button", { name: "My listings, 5" });
    const onFocus = vi.mocked(useFocusEffect).mock.lastCall?.[0];
    expect(onFocus).toBeTypeOf("function");
    await act(async () => { onFocus?.(); });
    expect(await view.findByRole("button", { name: "My listings, 7" })).toBeTruthy();
  });
});
