const { tailwindTheme } = require("@auto-tm/ui/theme/tailwind");

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: tailwindTheme,
  },
};
