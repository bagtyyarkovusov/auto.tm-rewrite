// @vitest-environment happy-dom

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useCatalogLocale } from "./useCatalogLocale";

const i18n = { language: "tk" };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n }),
}));

describe("useCatalogLocale", () => {
  it("uses the active app language when no locale is passed", () => {
    i18n.language = "tk";
    const { result } = renderHook(() => useCatalogLocale());
    expect(result.current).toBe("tk");
  });

  it("prefers an explicit locale over the app language", () => {
    i18n.language = "tk";
    const { result } = renderHook(() => useCatalogLocale("en"));
    expect(result.current).toBe("en");
  });

  it("falls back to ru for an unsupported app language", () => {
    i18n.language = "de";
    const { result } = renderHook(() => useCatalogLocale());
    expect(result.current).toBe("ru");
  });
});
