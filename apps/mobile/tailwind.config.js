/**
 * AutoTM mobile Tailwind config — v3 + NativeWind v4 preset.
 * Extends @auto-tm/ui/theme/tailwind with shadcn-style semantic colors
 * resolving via CSS vars from global.css. Locked to v3 due to NativeWind +
 * Metro constraints. Web/admin use v4 in a different config shape.
 * Rules: docs/agents/nativewind-v4.md §0.5, §2.5.
 */
const { tailwindTheme } = require("@auto-tm/ui/theme/tailwind");

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: tailwindTheme,
  },
};
