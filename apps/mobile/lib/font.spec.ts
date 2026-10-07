import { describe, expect, it } from "vitest";

import { fontFaceClass, withFontFace } from "./font";
import { cn } from "./utils";

describe("fontFaceClass", () => {
  it.each([
    ["font-sans text-base", "font-sans"],
    ["font-sans font-light", "font-sans-light"],
    ["font-sans font-medium", "font-sans-medium"],
    ["font-sans font-semibold", "font-sans-semibold"],
    ["font-sans font-bold", "font-sans-bold"],
    ["font-heading text-2xl", "font-heading"],
    ["font-heading font-medium", "font-heading"],
    ["font-heading font-semibold", "font-heading-semibold"],
    ["font-heading font-bold", "font-heading-bold"],
    ["font-mono", "font-mono"],
    ["font-mono font-semibold", "font-mono-medium"],
  ])("maps %s to the bundled face %s", (className, face) => {
    expect(fontFaceClass(className)).toBe(face);
  });

  it("uses the sans family when only a weight is named", () => {
    expect(fontFaceClass("text-sm font-semibold")).toBe("font-sans-semibold");
  });

  it("lets the last family and the last weight win, as tailwind-merge orders them", () => {
    expect(fontFaceClass("font-sans font-medium font-heading font-bold")).toBe("font-heading-bold");
  });

  it("ignores a weight behind a variant, which cannot change the face", () => {
    expect(fontFaceClass("font-sans disabled:font-bold")).toBe("font-sans");
  });

  it("leaves an explicit face alone", () => {
    expect(fontFaceClass("font-sans font-sans-bold")).toBeUndefined();
  });

  it("returns nothing when no family or weight is named", () => {
    expect(fontFaceClass("text-sm text-foreground")).toBeUndefined();
    expect(fontFaceClass(undefined)).toBeUndefined();
  });
});

describe("withFontFace", () => {
  it("appends the face and keeps the weight class", () => {
    expect(withFontFace("font-sans font-semibold")).toBe("font-sans font-semibold font-sans-semibold");
  });
});

describe("cn with the mobile token utilities", () => {
  it("replaces the family with the face and keeps the weight", () => {
    expect(cn("font-sans font-semibold", "font-sans-bold")).toBe("font-semibold font-sans-bold");
  });

  it("treats a type role as a font size, not a colour", () => {
    expect(cn("text-foreground text-base", "text-headline")).toBe("text-foreground text-headline");
  });

  it("lets a control height replace a stock height", () => {
    expect(cn("h-12", "h-control-lg")).toBe("h-control-lg");
  });
});
