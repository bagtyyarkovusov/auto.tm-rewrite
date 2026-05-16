import { palette, radius, spacing } from "../tokens";

export const tailwindTheme = {
  colors: {
    brand: Object.fromEntries(
      Object.entries(palette.red).map(([k, v]) => [k, v]),
    ),
    neutral: Object.fromEntries(
      Object.entries(palette.neutral).map(([k, v]) => [k, v]),
    ),
    success: { 500: palette.green[500] },
    warning: { 500: palette.amber[500] },
    error: { 500: palette.rose[500] },
    info: { 500: palette.blue[500] },
    primary: palette.red[500],
  },
  spacing: Object.fromEntries(
    Object.entries(spacing).map(([k, v]) => [k, `${v / 16}rem`]),
  ),
  borderRadius: Object.fromEntries(
    Object.entries(radius).map(([k, v]) => [
      k,
      typeof v === "number" ? `${v}px` : v,
    ]),
  ),
} as const;
