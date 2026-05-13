/**
 * Design tokens — elevation shadows
 *
 * Used sparingly. Most surfaces should be flat with subtle borders.
 * Use shadow only when emphasizing depth (modals, floating buttons, dropdowns).
 */

export const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 8px rgba(0,0,0,0.08)",
  lg: "0 8px 24px rgba(0,0,0,0.12)",
} as const;

export type ShadowKey = keyof typeof shadow;
