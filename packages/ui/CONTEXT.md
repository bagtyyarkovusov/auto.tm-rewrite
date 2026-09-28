# Shared design tokens and web components

This package owns shared tokens and browser components for web/admin. Mobile consumes tokens but implements components with React Native primitives in its own `components/ui` directory. Do not import browser components into mobile.

The shared CSS theme serves Tailwind v4 web apps; mobile uses the NativeWind/Tailwind configuration entry. Inspect each app's overrides before changing a shared token, since an override can hide or alter its effect. Preserve the distinction between brand actions and error/status colors.

Package exports define supported import paths. Changes to tokens or browser components need checks in their consuming apps; a package typecheck alone does not verify appearance, contrast, dark mode, or native rendering.

## Start here

- [Tokens](tokens)
- [Web theme](theme/theme.css)
- [Mobile token adapter](theme/tailwind.ts)
- [Browser components](components)
- [Export contract](package.json)
- [Native component boundary](../../docs/adr/0014-mobile-component-library.md)
