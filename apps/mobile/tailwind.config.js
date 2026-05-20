/**
 * AutoTM mobile Tailwind config — v3 + NativeWind v4 preset.
 * Extends @auto-tm/ui/theme/tailwind with shadcn-style semantic colors
 * resolving via CSS vars from global.css. Locked to v3 due to NativeWind +
 * Metro constraints. Web/admin use v4 in a different config shape.
 * Rules: docs/agents/nativewind-v4.md §0.5, §2.5.
 */
const { hairlineWidth } = require("nativewind/theme");
const { tailwindTheme } = require("@auto-tm/ui/theme/tailwind");

module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      ...tailwindTheme,
      fontFamily: {
        display: ["UberMoveBold", "UberMoveMedium", "system-ui", "sans-serif"],
        sans: [
          "UberMoveTextRegular",
          "UberMoveTextMedium",
          "UberMoveTextBold",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "UberMoveMonoRegular",
          "UberMoveMonoMedium",
          "ui-monospace",
          "monospace",
        ],
      },
      colors: {
        ...tailwindTheme.colors,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require("tailwindcss-animate")],
};
