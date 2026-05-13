/**
 * Design tokens — motion (durations + easings)
 *
 * Animations should feel snappy. Default to `fast` for most UI feedback.
 * `slow` only for big transitions (modal open, route change).
 */

export const duration = {
  instant: 0,
  fast:    150,
  base:    250,
  slow:    400,
} as const;

export const easing = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  decel:    "cubic-bezier(0.0, 0, 0.2, 1)",
  accel:    "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export type DurationKey = keyof typeof duration;
export type EasingKey = keyof typeof easing;
