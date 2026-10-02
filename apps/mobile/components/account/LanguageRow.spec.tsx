import { beforeEach, describe, expect, it, vi } from "vitest";

import { localeStore } from "../../src/locale/localeStore";
import { fireEvent, renderMobile } from "../../test/render";

import { LanguageRow } from "./LanguageRow";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) },
}));

beforeEach(() => localeStore.setState({ locale: "ru" }));

describe("LanguageRow", () => {
  it.each([["en", "English"], ["ru", "Русский"], ["tk", "Türkmençe"]] as const)("shows %s by its own name", (locale, name) => {
    localeStore.setState({ locale });
    const view = renderMobile(<LanguageRow />);
    expect(view.getByText(name)).toBeTruthy();
  });

  it("makes the row at least 44 pt tall and reads as a button", () => {
    const view = renderMobile(<LanguageRow />);
    expect(String(view.getByRole("button", { name: "Language, Русский" }).props.className)).toContain("min-h-14");
  });

  it("opens a sheet with the three languages and marks the current one", () => {
    const view = renderMobile(<LanguageRow />);
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    fireEvent.press(view.getByRole("button", { name: "Language, Русский" }));
    expect(view.getAllByRole("radio").map((r) => r.props.accessibilityLabel)).toEqual(["English", "Русский", "Türkmençe"]);
    expect(view.getAllByRole("radio", { checked: true }).map((r) => r.props.accessibilityLabel)).toEqual(["Русский"]);
  });

  it("applies the picked language at once, closes the sheet and shows the new name", () => {
    const view = renderMobile(<LanguageRow />);
    fireEvent.press(view.getByRole("button", { name: "Language, Русский" }));
    fireEvent.press(view.getByRole("radio", { name: "Türkmençe" }));
    expect(localeStore.getState().locale).toBe("tk");
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    expect(view.getByRole("button", { name: "Language, Türkmençe" })).toBeTruthy();
  });

  it("closes from the close button and leaves the language alone", () => {
    const view = renderMobile(<LanguageRow />);
    fireEvent.press(view.getByRole("button", { name: "Language, Русский" }));
    fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    expect(localeStore.getState().locale).toBe("ru");
  });

  it.each([["ru", "Язык"], ["tk", "Dil"]])("reads in %s", (locale, label) => {
    const view = renderMobile(<LanguageRow />, { locale });
    fireEvent.press(view.getByRole("button", { name: `${label}, Русский` }));
    expect(view.getAllByText(label).length).toBeGreaterThan(1);
    expect(view.getAllByRole("radio")).toHaveLength(3);
  });
});
