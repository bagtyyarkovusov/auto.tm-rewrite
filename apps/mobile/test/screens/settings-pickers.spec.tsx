import { describe, expect, it, vi } from "vitest";

import SettingsScreen from "../../app/settings";
import { localeStore } from "../../src/locale/localeStore";
import { themeStore } from "../../src/theme/themeStore";
import { fireEvent, renderMobile } from "../render";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) },
}));
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("../../src/auth/useLogout", () => ({ useLogout: () => ({ mutate: vi.fn() }) }));

describe("Settings language and theme rows", () => {
  it("replaces the inline switches with rows that show the current value", () => {
    localeStore.setState({ locale: "en" });
    themeStore.setState({ theme: "dark" });
    const view = renderMobile(<SettingsScreen />);
    expect(view.getByRole("button", { name: "Language, English" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Theme, Dark" })).toBeTruthy();
    expect(view.queryAllByRole("radio")).toHaveLength(0);
  });

  it("changes the language and theme from their sheets", () => {
    localeStore.setState({ locale: "en" });
    themeStore.setState({ theme: "dark" });
    const view = renderMobile(<SettingsScreen />);
    fireEvent.press(view.getByRole("button", { name: "Language, English" }));
    fireEvent.press(view.getByRole("radio", { name: "Русский" }));
    expect(localeStore.getState().locale).toBe("ru");
    fireEvent.press(view.getByRole("button", { name: "Theme, Dark" }));
    fireEvent.press(view.getByRole("radio", { name: "Light" }));
    expect(themeStore.getState().theme).toBe("light");
  });
});
