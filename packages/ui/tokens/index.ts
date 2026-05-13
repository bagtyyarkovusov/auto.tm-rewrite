/**
 * Design tokens — single source of truth for visual values.
 *
 * Consumed by:
 *   - apps/web (Tailwind preset + CSS variables)
 *   - apps/admin (Tailwind preset + CSS variables)
 *   - apps/mobile (NativeWind config + runtime theme)
 *
 * DO NOT inline raw hex / pixel values in component code.
 * If a value isn't here yet, add it to the appropriate token file first.
 */

export * from "./colors";
export * from "./type";
export * from "./spacing";
export * from "./radius";
export * from "./shadow";
export * from "./motion";
