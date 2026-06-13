/**
 * Design tokens — colors
 *
 * Two layers:
 *   palette   raw color values (the building blocks)
 *   colors    semantic mappings (what the app actually references)
 *
 * Brand red kept from the previous Flutter app (`#E60000`).
 * Error uses a different hue (rose) so it's distinct from brand.
 */

export const palette = {
  // Brand — AutoTM red
  red: {
    50:  "#FFEBEB",
    100: "#FFD1D1",
    200: "#FFA8A8",
    300: "#FF7878",
    400: "#FF4848",
    500: "#E60000", // brand
    600: "#C20000",
    700: "#9E0000",
    800: "#7A0000",
    900: "#560000",
  },

  // Neutrals — warm gray (slightly warmer than pure gray; reads premium)
  neutral: {
    0:   "#FFFFFF",
    50:  "#FAFAF9",
    100: "#F4F4F2",
    200: "#E7E6E3",
    300: "#D2D0CB",
    400: "#A8A6A0",
    500: "#737170",
    600: "#525251",
    700: "#3A3A39",
    800: "#27272A",
    900: "#171717",
    950: "#0A0A0A",
  },

  // Semantic statuses (distinct hues — NOT red-on-red)
  green: { 500: "#10B981" }, // success
  amber: { 500: "#F59E0B" }, // warning
  rose:  { 500: "#F43F5E" }, // error (distinct from brand red)
  blue:  {
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
  }, // info / link
} as const;

/**
 * Semantic tokens — what application code references.
 * Light + dark pairs resolved by theme provider.
 */
export const colors = {
  // Brand & primary actions
  primary:        palette.red[500],
  primaryHover:   palette.red[600],
  primaryActive:  palette.red[700],
  onPrimary:      palette.neutral[0],

  // Surfaces (light/dark)
  background:     { light: palette.neutral[0],   dark: palette.neutral[950] },
  surface:        { light: palette.neutral[50],  dark: palette.neutral[900] },
  surfaceElevated:{ light: palette.neutral[0],   dark: palette.neutral[800] },
  border:         { light: palette.neutral[200], dark: palette.neutral[700] },

  // Text
  textPrimary:    { light: palette.neutral[900], dark: palette.neutral[50] },
  textSecondary:  { light: palette.neutral[600], dark: palette.neutral[300] },
  textTertiary:   { light: palette.neutral[500], dark: palette.neutral[400] },
  textOnPrimary:  palette.neutral[0],

  // Status (theme-independent — recognizable in both modes)
  success:        palette.green[500],
  warning:        palette.amber[500],
  error:          palette.rose[500],
  info:           palette.blue[500],

  // Misc
  overlayScrim:   "rgba(0,0,0,0.5)",
} as const;

export type Palette = typeof palette;
export type Colors = typeof colors;
