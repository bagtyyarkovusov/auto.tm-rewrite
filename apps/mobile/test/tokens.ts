import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Colour maths over the tokens of global.css, for tests that prove a contrast ratio. */

export type Rgb = [number, number, number];
export type ThemeName = "light" | "dark";

/** The custom properties of one theme block of global.css, by name. */
export function cssTokens(theme: ThemeName): Record<string, string> {
  const selector = theme === "light" ? ":root" : "\\.dark:root";
  const css = readFileSync(resolve(__dirname, "../global.css"), "utf8");
  const block = new RegExp(`\\n  ${selector} \\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((match) => [match[1], (match[2] ?? "").trim()]),
  );
}

/** An "H S% L%" token as sRGB channels from 0 to 1. */
export function rgb(token: string): Rgb {
  const [h = 0, s = 0, l = 0] = token.replace(/%/g, "").split(/\s+/).map(Number);
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r = 0, g = 0, b = 0] = [
    [chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x],
  ][sector] ?? [0, 0, 0];
  return [r + m, g + m, b + m];
}

/** A colour drawn at `alpha` over an opaque one. */
export function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return top.map((channel, index) => alpha * channel + (1 - alpha) * (bottom[index] ?? 0)) as Rgb;
}

/** WCAG 2.x relative luminance. */
function luminance(colour: Rgb): number {
  const [r = 0, g = 0, b = 0] = colour.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio of two opaque colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** "#RRGGBB" as sRGB channels from 0 to 1. */
export function hex(value: string): Rgb {
  return [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16) / 255) as Rgb;
}
