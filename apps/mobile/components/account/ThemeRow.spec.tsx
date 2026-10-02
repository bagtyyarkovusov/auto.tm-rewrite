import { beforeEach, describe, expect, it, vi } from "vitest";

import { themeStore } from "../../src/theme/themeStore";
import { fireEvent, renderMobile } from "../../test/render";

import { ThemeRow } from "./ThemeRow";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) },
}));

beforeEach(() => themeStore.setState({ theme: "system" }));

describe("ThemeRow", () => {
  it.each([["light", "Light"], ["dark", "Dark"], ["system", "System"]] as const)("shows %s as %s", (theme, name) => {
    themeStore.setState({ theme });
    const view = renderMobile(<ThemeRow />);
    expect(view.getByRole("button", { name: `Theme, ${name}` })).toBeTruthy();
  });

  it("opens a sheet with Light, Dark and System and marks the current one", () => {
    const view = renderMobile(<ThemeRow />);
    fireEvent.press(view.getByRole("button", { name: "Theme, System" }));
    expect(view.getAllByRole("radio").map((r) => r.props.accessibilityLabel)).toEqual(["Light", "Dark", "System"]);
    expect(view.getAllByRole("radio", { checked: true }).map((r) => r.props.accessibilityLabel)).toEqual(["System"]);
  });

  it("applies the picked theme at once, closes the sheet and shows the new value", () => {
    const view = renderMobile(<ThemeRow />);
    fireEvent.press(view.getByRole("button", { name: "Theme, System" }));
    fireEvent.press(view.getByRole("radio", { name: "Dark" }));
    expect(themeStore.getState().theme).toBe("dark");
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    expect(view.getByRole("button", { name: "Theme, Dark" })).toBeTruthy();
  });

  it("closes from the close button and leaves the theme alone", () => {
    const view = renderMobile(<ThemeRow />);
    fireEvent.press(view.getByRole("button", { name: "Theme, System" }));
    fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    expect(themeStore.getState().theme).toBe("system");
  });

  it.each([
    ["ru", "Тема", ["Светлая", "Тёмная", "Системная"]],
    ["tk", "Tema", ["Ýagty", "Garaňky", "Ulgam"]],
  ] as const)("reads in %s", (locale, label, names) => {
    const view = renderMobile(<ThemeRow />, { locale });
    fireEvent.press(view.getByRole("button", { name: `${label}, ${names[2]}` }));
    expect(view.getAllByRole("radio").map((r) => r.props.accessibilityLabel)).toEqual([...names]);
  });
});
