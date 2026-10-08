import { describe, expect, it } from "vitest";

import { maxFontScaleFor, ROLE_MAX_FONT_SCALE } from "./font-scale";

describe("maxFontScaleFor", () => {
  it("leaves reading text uncapped", () => {
    for (const role of ["body", "callout", "footnote", "caption"]) {
      expect(maxFontScaleFor(`font-sans text-${role} text-foreground`)).toBeUndefined();
    }
  });

  it("caps the large roles, the larger the tighter", () => {
    expect(maxFontScaleFor("font-heading text-display font-bold")).toBe(1.3);
    expect(maxFontScaleFor("text-title")).toBe(1.4);
    expect(maxFontScaleFor("text-headline text-foreground")).toBe(1.5);
    expect(maxFontScaleFor("text-subhead")).toBe(1.6);
    expect(ROLE_MAX_FONT_SCALE.display).toBeLessThan(ROLE_MAX_FONT_SCALE.subhead);
  });

  it("caps tab labels and count badges", () => {
    expect(maxFontScaleFor("text-micro font-semibold")).toBe(1.3);
  });

  it("reads the role, not a colour or a longer class that starts the same", () => {
    expect(maxFontScaleFor("text-foreground text-muted-foreground")).toBeUndefined();
    expect(maxFontScaleFor("text-title-foreground")).toBeUndefined();
  });

  it("takes the last role when two are present", () => {
    expect(maxFontScaleFor("text-display text-subhead")).toBe(1.6);
  });

  it("returns nothing without classes", () => {
    expect(maxFontScaleFor(undefined)).toBeUndefined();
  });
});
