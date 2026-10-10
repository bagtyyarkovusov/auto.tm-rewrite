import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { THEME } from "@/lib/theme";

/** WCAG 2.x relative luminance of an "H S% L%" token. */
function luminance(token: string): number {
  const [h = 0, s = 0, l = 0] = token.replace(/%/g, "").split(/\s+/).map(Number);
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const sector = Math.floor(h / 60) % 6;
  const rgb = [
    [chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x],
  ][sector] ?? [0, 0, 0];
  const [r = 0, g = 0, b = 0] = rgb.map((channel) => {
    const value = channel + m;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** The custom properties of one block of global.css, by name. */
function cssTokens(selector: ":root" | ".dark:root"): Record<string, string> {
  const css = readFileSync(resolve(__dirname, "../global.css"), "utf8");
  const block = new RegExp(`\\n  ${selector.replace(".", "\\.")} \\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((match) => [match[1], (match[2] ?? "").trim()]),
  );
}

const AA = 4.5;
const light = cssTokens(":root");
const dark = cssTokens(".dark:root");
const token = (tokens: Record<string, string>, name: string) => tokens[name] ?? "";

describe("destructive colour contrast (77 Accessibility: 4.5:1 for normal text)", () => {
  it("reads both theme blocks of global.css", () => {
    expect(token(light, "background")).toBe("60 7% 95%");
    expect(token(dark, "background")).toBe("240 3% 6%");
  });

  it.each(["background", "card", "popover"])("light error and destructive text reads on the %s surface", (surface) => {
    expect(contrast(token(light, "destructive"), token(light, surface))).toBeGreaterThanOrEqual(AA);
  });

  it("light text on a destructive fill reads", () => {
    expect(contrast(token(light, "destructive-foreground"), token(light, "destructive"))).toBeGreaterThanOrEqual(AA);
  });

  it("leaves the dark pairs as they were", () => {
    expect(token(dark, "destructive")).toBe("15 80% 58%");
    expect(token(dark, "destructive-foreground")).toBe("0 0% 9%");
    for (const surface of ["background", "card", "popover"]) {
      expect(contrast(token(dark, "destructive"), token(dark, surface))).toBeGreaterThanOrEqual(AA);
    }
    expect(contrast(token(dark, "destructive-foreground"), token(dark, "destructive"))).toBeGreaterThanOrEqual(AA);
  });

  it("keeps lib/theme.ts in step with global.css for the destructive fill and its text", () => {
    expect(THEME.light.destructive).toBe(token(light, "destructive"));
    expect(THEME.light.destructiveForeground).toBe(token(light, "destructive-foreground"));
    expect(THEME.dark.destructive).toBe(token(dark, "destructive"));
    expect(THEME.dark.destructiveForeground).toBe(token(dark, "destructive-foreground"));
  });
});
